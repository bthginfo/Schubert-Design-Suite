import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {getPool,withTenant,one,insert,update} from '@schubert/db';
import {requireRule} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
import {baseData,hash,auditEvent,type Runtime} from './core.js';
export async function publicIntakeContext(correlationId:string):Promise<ActorContext>{
 const result=(await getPool().query('SELECT public_intake_context() context')).rows[0]?.context;
 requireRule(result?.tenant_id&&result?.legal_entity_id,'INTAKE_UNAVAILABLE','Der Eingang ist noch nicht eingerichtet.',503);
 return {tenantId:result.tenant_id,legalEntityId:result.legal_entity_id,actorId:'public-intake',actorType:'service',role:'PublicIntake',permissions:[],permissionVersion:0,employeeId:null,correlationId,identityAssurance:'service_identity'};
}
export function withdrawalReceiptToken(ctx:ActorContext,id:string){const secret=process.env.BETTER_AUTH_SECRET;requireRule(secret,'SECRET_CONFIGURATION','Sicherer Eingang ist noch nicht eingerichtet.',503);return createHmac('sha256',secret).update('withdrawal-receipt:'+ctx.tenantId+':'+id).digest('base64url');}
export function verifyWithdrawalReceipt(ctx:ActorContext,id:string,token:string){const actual=Buffer.from(token),expected=Buffer.from(withdrawalReceiptToken(ctx,id));requireRule(actual.length===expected.length&&timingSafeEqual(actual,expected),'RECEIPT_TOKEN','Dieser Eingangsnachweis ist nicht verfügbar.',404);}
export async function receiveWithdrawal(ctx:ActorContext,input:unknown){
 const p=z.object({reference:z.string().min(2).max(200),person_name:z.string().min(2).max(200),email:z.email(),statement:z.string().min(5).max(20000),idempotencyKey:z.string().min(8).max(200)}).parse(input);
 return withTenant(ctx,async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[ctx.tenantId+':withdrawal:'+p.idempotencyKey]);
  const payloadHash=hash(p),old=await one<any>(db,'SELECT * FROM portal_declarations WHERE portal_access_id IS NULL AND idempotency_key=$1',[p.idempotencyKey]);
  if(old){requireRule(old.payload_hash===payloadHash,'IDEMPOTENCY_CONFLICT','Dieser Wiederholungsschlüssel gehört zu anderen Angaben.',409);return {id:old.id,received_at:old.received_at,receiptToken:withdrawalReceiptToken(ctx,old.id)};}
  const command={name:'public.withdrawal.receive',payload:p,idempotencyKey:p.idempotencyKey},r:Runtime={db,ctx,command,payload:p,insert:(table,data)=>insert(db,table,{...baseData(ctx),...data}),update:(table,id,data,version)=>update(db,table,id,data,version)};
  const declaration=await r.insert('portal_declarations',{reference:p.reference,contact_email:p.email,kind:'withdrawal',statement:p.statement,person_name:p.person_name,identity_assurance:'self_declared',idempotency_key:p.idempotencyKey,payload_hash:payloadHash,content_hash:payloadHash,status:'received'});
  await r.insert('tasks',{title:'Widerruf eingegangen – zuordnen und prüfen',description:'Bezug: '+p.reference+'\n'+p.person_name+' · '+p.email+'\n'+p.statement,priority:'high',status:'open'});
  await r.insert('job_runs',{job_type:'portal.receipt',name:'Eingangsnachweis Widerruf',payload:{declarationId:declaration.id},status:'pending'});
  await auditEvent(r,'portal_declaration',declaration.id,1,{received:true});
  return {id:declaration.id,received_at:declaration.received_at,receiptToken:withdrawalReceiptToken(ctx,declaration.id)};
 });
}
