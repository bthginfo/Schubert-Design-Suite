import {z} from 'zod';
import {withTenant,one} from '@schubert/db';
import {requireRule,assertPermission} from '@schubert/domain';
import {callWorker,contentHash,privateBytes} from '@schubert/adapters';
import type {ActorContext} from '@schubert/contracts';
import {register,getRecord,hash} from './core.js';
import {assertDocumentAccess} from './document-access.js';
import {buildDocumentSource} from './render-request.js';

async function preparePreview(r:any){
  assertPermission(r.ctx.permissions,'documents');
  const documentPreview=r.command.name==='documents.preview'||r.payload.ai_preview===true;
  const p=z.object({document_version_id:z.uuid().optional(),document_id:z.uuid().optional(),page_index:z.number().int().min(0).max(999).default(0),ai_preview:z.boolean().default(false)}).refine(p=>p.document_version_id||p.document_id).parse(r.payload);const currentDocument=p.document_id?await getRecord(r.db,'documents',p.document_id):null;
  const version=await getRecord(r.db,'document_versions',p.document_version_id??currentDocument.current_version_id),doc=await getRecord(r.db,'documents',version.document_id);
  await assertDocumentAccess(r.db,r.ctx,doc);
  requireRule(doc.status==='available'&&version.status==='available','DOCUMENT_QUARANTINE','Die Originaldatei muss zuerst die Dateiprüfung abschließen.',409);
  requireRule(['application/pdf','image/png','image/jpeg','image/webp','image/tiff'].includes(doc.mime_type),'PLAN_SOURCE_TYPE','Eine PDF-Unterlage oder ein geprüftes Foto auswählen.');
  await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[r.ctx.tenantId+':source-preview:'+version.id+':'+p.page_index]);
  const existing=await one<any>(r.db,"SELECT * FROM job_runs WHERE job_type=$3 AND payload->>'documentVersionId'=$1 AND (payload->>'pageIndex')::int=$2 AND COALESCE((payload->>'aiPreview')::boolean,false)=$4 AND status IN('pending','running','retry','completed') ORDER BY created_at DESC LIMIT 1",[version.id,p.page_index,documentPreview?'document.preview':'planning.source.preview',p.ai_preview]);
  if(existing)return previewJobResult(existing);
  const job=await r.insert('job_runs',{job_type:documentPreview?'document.preview':'planning.source.preview',name:p.ai_preview?'Kleine Bildreferenz für KI vorbereiten':documentPreview?'Bildvorlage für Fotobearbeitung':'Grundrissseite und Textpositionen',payload:{documentId:doc.id,documentVersionId:version.id,pageIndex:p.page_index,sourceHash:version.content_hash,aiPreview:p.ai_preview},status:'pending'});
  return previewJobResult(job);
}
register('planning.source.preview','planning',preparePreview);
register('documents.preview','documents',preparePreview);

function previewJobResult(job:any){return{job_id:job.id,status:job.status,...(job.status==='completed'?job.result??{}:{}),...(job.last_error?{message:job.last_error}:{})};}
export async function sourcePreviewStatus(ctx:ActorContext,id:string){
  return withTenant(ctx,async db=>{
    const job=await getRecord(db,'job_runs',id);assertPermission(ctx.permissions,job.job_type==='document.preview'?'documents':'planning');requireRule(['planning.source.preview','document.preview'].includes(job.job_type),'NOT_FOUND','Seitenvorschau ist nicht verfügbar.',404);
    const doc=await getRecord(db,'documents',job.payload.documentId);await assertDocumentAccess(db,ctx,doc);
    return previewJobResult(job);
  });
}

export async function runSourcePreview(ctx:ActorContext,job:any,tools:{guardLease:(ctx:ActorContext,job:any)=>Promise<unknown>;generatedDocument:(...args:any[])=>Promise<any>}){
  const source=await withTenant(ctx,async db=>{
    const version=await getRecord(db,'document_versions',job.payload.documentVersionId),doc=await getRecord(db,'documents',version.document_id),blob=await getRecord(db,'blob_objects',version.blob_object_id);
    requireRule(doc.id===job.payload.documentId&&version.content_hash===job.payload.sourceHash&&doc.status==='available'&&version.status==='available'&&['clean','trusted_generator'].includes(blob.scan_status),'PLAN_SOURCE_CHANGED','Die gebundene Originaldatei ist nicht mehr verfügbar.',409);
    return{version,doc,blob};
  });
  const sourcePayload=Number(source.blob.size_bytes)<=2800000?{bytes:Buffer.from(await privateBytes(source.blob.storage_key,2800000,ctx)).toString('base64')}:{source:buildDocumentSource(ctx,source.version,source.blob,job)};const output=await callWorker('/planning/source-preview',{...sourcePayload,mime:source.doc.mime_type,pageIndex:job.payload.pageIndex,maxDimension:job.payload.aiPreview?512:1440});
  const result=z.object({pngBase64:z.string().max(3_600_000),width:z.number().int().positive().max(2880),height:z.number().int().positive().max(2880),previewHash:z.string().regex(/^[a-f0-9]{64}$/),sourceHash:z.string(),pageIndex:z.number().int(),generatorVersion:z.string().max(100),textPositions:z.array(z.object({text:z.string().max(2000),x:z.number().nonnegative(),y:z.number().nonnegative(),width:z.number().nonnegative(),height:z.number().nonnegative(),confidence:z.number().min(0).max(1).nullable(),sourceKind:z.enum(['pdf_text','ocr_candidate'])})).max(2000)}).parse(output);
  const bytes=Buffer.from(result.pngBase64,'base64');
  requireRule(bytes.length>24&&bytes.length<=2_600_000&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.readUInt32BE(16)===result.width&&bytes.readUInt32BE(20)===result.height&&contentHash(bytes)===result.previewHash&&result.sourceHash===source.version.content_hash&&result.pageIndex===job.payload.pageIndex,'PLAN_PREVIEW_HASH','Die Vorschau stimmt nicht mit der gebundenen Originalseite überein.',502);
  await tools.guardLease(ctx,job);
  const doc=await tools.generatedDocument(ctx,bytes,(job.payload.aiPreview?'Bildreferenz_'+source.doc.name.slice(0,160)+'_Seite_'+(result.pageIndex+1):'Grundriss_Seite_'+(result.pageIndex+1)+'_'+source.doc.id)+'.png','image/png',source.doc.entity_type??'source_document',source.doc.entity_id??source.doc.id,'internal',job);
  return{document_id:doc.id,document_version_id:doc.current_version_id,previewDocumentVersionId:doc.current_version_id,previewHash:result.previewHash,preview_url:'/api/v1/documents/'+doc.id+'/download?inline=1',width:result.width,height:result.height,textPositions:result.textPositions,sourceDocumentVersionId:source.version.id,sourceHash:source.version.content_hash,pageIndex:result.pageIndex,generatorVersion:result.generatorVersion,requiresReview:true,bindingHash:hash({version:source.version.id,page:result.pageIndex,preview:result.previewHash})};
}
