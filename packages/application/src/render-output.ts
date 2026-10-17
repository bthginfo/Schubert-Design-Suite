import{randomUUID}from'node:crypto';
import{generateClientTokenFromReadWriteToken}from'@vercel/blob/client';
import{z}from'zod';
import type{ActorContext}from'@schubert/contracts';
import{withTenant,update}from'@schubert/db';
import{requireRule}from'@schubert/domain';
import{privateBytes,contentHash,deletePrivate,IntegrationUnavailable,reserveBlobIn,storedBlob}from'@schubert/adapters';
import{getRecord}from'./core.js';

const LIMIT=40*1024*1024;
export type RenderUploadTicket={id:string;jobId:string;fencingToken:string;expiresAt:number;image:string;mask:string};
export async function renderUploadTargets(ticket:RenderUploadTicket){
  requireRule(ticket.expiresAt>Date.now()&&ticket.expiresAt<=Date.now()+900000,'RENDER_UPLOAD_EXPIRY','Uploadfreigabe ist abgelaufen.');
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw new IntegrationUnavailable('Privater Renderdateispeicher');
  const targets:Record<string,any>={};for(const kind of['image','mask']as const){const pathname=ticket[kind],token=await generateClientTokenFromReadWriteToken({token:process.env.BLOB_READ_WRITE_TOKEN,pathname,maximumSizeInBytes:LIMIT,allowedContentTypes:['image/png'],validUntil:ticket.expiresAt,addRandomSuffix:false,allowOverwrite:false,cacheControlMaxAge:60});targets[kind]={pathname,token,expiresAt:ticket.expiresAt,maximumSizeInBytes:LIMIT,contentType:'image/png'};}
  return targets;
}
/** Only opaque, exact-path PUT capabilities leave the app; never the bucket credential. */
export async function issueRenderUpload(ctx:ActorContext,job:any){
  const ticket=await withTenant(ctx,async db=>{const live=await getRecord(db,'job_runs',job.id,true);requireRule(live.status==='running'&&String(live.fencing_token)===String(job.fencing_token)&&new Date(live.lease_until).getTime()>Date.now()+30000,'RENDER_UPLOAD_FENCE','Renderauftrag besitzt keine ausreichende aktive Uploadlease.',409);
    const id=randomUUID(),prefix=`${ctx.tenantId}/render-output/${job.id}/${job.fencing_token}/${id}`,expiresAt=Math.min(Date.now()+840000,new Date(live.lease_until).getTime()-5000),ticket:RenderUploadTicket={id,jobId:job.id,fencingToken:String(job.fencing_token),expiresAt,image:prefix+'/image.png',mask:prefix+'/mask.png'};
    for(const key of[ticket.image,ticket.mask])await reserveBlobIn(db,ctx,{key,size:LIMIT,advanced:1});const previous=Array.isArray(live.payload.renderUploadTickets)?live.payload.renderUploadTickets:[];await update(db,'job_runs',live.id,{payload:{...live.payload,renderUploadTickets:[...previous,ticket].slice(-12)}});return ticket;});
  return{ticket,targets:await renderUploadTargets(ticket)};
}
export async function readUploadedRender(ctx:ActorContext,job:any,result:any,ticket:RenderUploadTicket,kind:'image'|'mask'){
  const ref=z.object({pathname:z.string().max(1000),byteLength:z.number().int().positive().max(LIMIT),contentHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(result[kind+'Blob']);
  requireRule(ref.pathname===ticket[kind]&&ref.contentHash===result[kind+'Hash']&&ticket.jobId===job.id&&ticket.fencingToken===String(job.fencing_token)&&ref.pathname.startsWith(`${ctx.tenantId}/render-output/${job.id}/${job.fencing_token}/`),'RENDER_UPLOAD_BINDING','Die abgelegte Renderdatei gehört nicht zum freigegebenen Ziel dieses Jobversuchs.',409);
  await withTenant(ctx,async db=>{const live=await getRecord(db,'job_runs',job.id,true);requireRule(live.status==='running'&&String(live.fencing_token)===String(job.fencing_token)&&new Date(live.lease_until).getTime()>Date.now()&&live.payload.renderUploadTickets?.some((t:any)=>t.id===ticket.id&&t[kind]===ref.pathname),'RENDER_UPLOAD_FENCE','Ein neuerer Jobversuch hat diese Ausgabe abgelöst.',409);});
  await storedBlob(ctx,ref.pathname,ref.byteLength,ref.contentHash);const bytes=await privateBytes(ref.pathname,LIMIT,ctx);requireRule(bytes.length===ref.byteLength&&contentHash(bytes)===ref.contentHash,'RENDER_UPLOAD_HASH','Die tatsächliche private Renderdatei stimmt nicht mit ihrem Inhaltsnachweis überein.');return bytes;
}
/** Temporary transport objects are separate from the registered immutable document keys. */
export async function clearRenderUpload(ctx:ActorContext,job:any,ticket:RenderUploadTicket){for(const pathname of[ticket.image,ticket.mask]){requireRule(pathname.startsWith(`${ctx.tenantId}/render-output/${job.id}/${ticket.fencingToken}/${ticket.id}/`),'RENDER_UPLOAD_SCOPE','Fremder temporärer Renderpfad.');await deletePrivate(pathname,ctx).catch(()=>undefined);}}
