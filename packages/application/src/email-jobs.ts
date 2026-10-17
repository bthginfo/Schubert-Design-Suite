import {insert,one,update,withTenant,type DbClient} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {DomainError,requireRule} from '@schubert/domain';
import {contentHash,privateBytes,sendMail} from '@schubert/adapters';
import {auditEvent,baseData,getRecord,hash} from './core.js';
import {mailAttachmentsIn} from './communication.js';
import {acceptedMailReceiptIn,mailAudienceIn,recordMailEvidenceIn} from './mail-evidence.js';
import {mailAttemptDecision,mailFailureState} from './mail-state.js';

type Helpers={assertLeaseIn:(db:DbClient,job:any)=>Promise<any>;transport?:typeof sendMail};
export async function runEmailSend(ctx:ActorContext,job:any,helpers:Helpers){
 const p=job.payload,transport=helpers.transport??sendMail;
 const initial=await withTenant(ctx,async db=>{
  await helpers.assertLeaseIn(db,job);const email=await getRecord(db,'outgoing_messages',p.messageId,true);requireRule(email.content_hash===p.contentHash,'MAIL_STATE','Der freigegebene Versandstand wurde verändert.');const decision=mailAttemptDecision(email.status);
  if(decision==='receipt')return{receipt:await acceptedMailReceiptIn(db,email)};
  if(decision==='uncertain'){
   if(email.status==='sending'&&email.dispatch_job_id!==job.id&&email.dispatch_job_id){const active=await one<any>(db,"SELECT id FROM job_runs WHERE id=$1 AND status='running' AND fencing_token=$2 AND lease_until>now()",[email.dispatch_job_id,email.dispatch_fencing_token]);requireRule(!active,'MAIL_IN_FLIGHT','Dieser Versand wird bereits von einem anderen gültigen Auftrag bearbeitet.',409);}
   if(email.status==='sending')await update(db,'outgoing_messages',email.id,{status:'outcome_unknown',last_error:'Ein früherer Versandversuch wurde unterbrochen. Vor einem neuen Entwurf muss die tatsächliche Übergabe anhand eines konkreten Nachweises geklärt werden.'},email.version);
   return{unknown:true};
  }
  requireRule(decision==='send','MAIL_STATE','Dieser Versand darf nicht erneut ausgeführt werden. Den Versandstand und einen gegebenenfalls erforderlichen Nachweis zuerst prüfen.',409);return{email};
 });
 if('receipt'in initial)return initial.receipt;
 if('unknown'in initial)throw new DomainError('OUTCOME_UNKNOWN','Eine frühere Übermittlung ist ungeklärt. Es erfolgt keine erneute Sendung. Einen konkreten Anbieter- oder Empfängernachweis zur Klärung hinterlegen.',409);
 const email=initial.email;
 const attachments=[];
 try{
  requireRule(p.test===true||process.env.APP_ENV==='production'||email.recipient===process.env.SMTP_TEST_RECIPIENT,'PREVIEW_MAIL_BLOCKED','Echte Empfänger sind in dieser Umgebung gesperrt.');
  const files=await withTenant(ctx,async db=>{const issuer=await getRecord(db,'legal_entities',ctx.legalEntityId);requireRule(!issuer.recovery_locked,'RECOVERY_LOCKED','Externer Versand ist bis zum bestätigten Wiederherstellungsabgleich gesperrt.');const selected=await mailAttachmentsIn(db,ctx,email.attachment_version_ids??[]);await mailAudienceIn(db,email,selected);return selected;});
  requireRule(hash(files.map(f=>({documentVersionId:f.document_version_id,sha256:f.content_hash,name:f.name,mime:f.mime_type})))===hash(email.attachment_snapshot??[]),'MAIL_ATTACHMENT_CHANGED','Die freigegebenen Anlagen stimmen nicht mehr mit ihren genauen Originalversionen überein.');
  for(const file of files){const bytes=await privateBytes(file.storage_key,10*1024*1024,ctx);requireRule(contentHash(bytes)===file.content_hash,'MAIL_ATTACHMENT_HASH','Der tatsächliche Originalanhang stimmt nicht mit dem freigegebenen Nachweis überein.');attachments.push({filename:file.name,content:Buffer.from(bytes),contentType:file.mime_type});}
 }catch(error:any){await withTenant(ctx,async db=>{await helpers.assertLeaseIn(db,job);const current=await getRecord(db,'outgoing_messages',email.id,true);if(current.status==='queued')await update(db,'outgoing_messages',email.id,{status:error instanceof DomainError&&error.status<500?'failed':'queued',last_error:error instanceof DomainError?error.message:'Die Vorprüfung ist vor einer Übermittlung gescheitert. Es wurde noch kein SMTP-Versuch begonnen.'},current.version);});throw error;}
 const attempt=await withTenant(ctx,async db=>{await helpers.assertLeaseIn(db,job);const current=await getRecord(db,'outgoing_messages',email.id,true);requireRule(current.status==='queued'&&current.content_hash===p.contentHash,'MAIL_STATE','Ein anderer Versuch hat diesen Versand bereits übernommen.',409);await update(db,'outgoing_messages',email.id,{status:'sending',dispatch_started_at:new Date(),dispatch_job_id:job.id,dispatch_fencing_token:job.fencing_token,last_error:null},current.version);return insert(db,'delivery_attempts',{...baseData(ctx),outgoing_message_id:email.id,attempt:job.attempts,started_at:new Date(),result:'sending',status:'running'});});
 try{
  const sent=await transport({to:email.recipient,subject:email.subject,text:email.body,messageId:email.message_id,replyTo:email.reply_to??undefined,connectionVersionId:email.connection_version_id,attachments},ctx);
  requireRule(sent.status==='provider_accepted'&&sent.accepted>0,'OUTCOME_UNKNOWN','Der Anbieter hat keinen eindeutigen Annahmenachweis zurückgegeben.',409);
  return await withTenant(ctx,async db=>{
   await helpers.assertLeaseIn(db,job);const current=await getRecord(db,'outgoing_messages',email.id,true);requireRule(current.status==='sending'&&current.dispatch_job_id===job.id&&String(current.dispatch_fencing_token)===String(job.fencing_token),'STALE_JOB_FENCE','Ein späterer Versandstand hat diesen Versuch abgelöst.',409);
   const acceptedAt=new Date(),evidence=await recordMailEvidenceIn(db,ctx,current,{outcome:'accepted',source:'smtp',acceptedAt,providerReference:sent.messageId,reason:'Der konfigurierte SMTP-Anbieter hat die Nachricht mit mindestens einem angenommenen Empfänger ausdrücklich bestätigt.',jobId:job.id});
   const saved=await update(db,'outgoing_messages',email.id,{status:'provider_accepted',sent_at:acceptedAt,provider_response:JSON.stringify(sent),last_error:null},current.version);await update(db,'delivery_attempts',attempt.id,{finished_at:acceptedAt,result:'provider_accepted',status:'completed'});
   const payload={outgoingMessageId:email.id,evidenceId:evidence.id,mailContentHash:email.content_hash};await auditEvent({db,ctx,command:{name:'communication.email.provider_accepted',id:email.id,idempotencyKey:job.id+':'+job.fencing_token,payload},payload,insert:(table,data)=>insert(db,table,{...baseData(ctx),...data}),update:(table,id,data,version)=>update(db,table,id,data,version)},'outgoing_messages',email.id,saved.version,payload);
   return{...sent,outgoingMessageId:email.id,evidenceId:evidence.id,acceptedAt};
  });
 }catch(error:any){
  const state=mailFailureState(error.code),message=state==='outcome_unknown'?'Eine Übergabe ist möglich, aber nicht eindeutig bestätigt. Keine automatische erneute Sendung.':error instanceof DomainError?error.message:'Die Übermittlung ist fehlgeschlagen.';
  await withTenant(ctx,async db=>{await helpers.assertLeaseIn(db,job);const current=await getRecord(db,'outgoing_messages',email.id,true);requireRule(current.status==='sending'&&current.dispatch_job_id===job.id&&String(current.dispatch_fencing_token)===String(job.fencing_token),'STALE_JOB_FENCE','Dieser Versandversuch wurde bereits abgelöst.',409);await update(db,'outgoing_messages',email.id,{status:state,last_error:message},current.version);await update(db,'delivery_attempts',attempt.id,{finished_at:new Date(),result:state,safe_error:message,status:state});});
  if(state==='outcome_unknown'&&error.code!=='OUTCOME_UNKNOWN')throw new DomainError('OUTCOME_UNKNOWN',message,409);throw error;
 }
}

/** A terminal worker failure must also leave an honest, non-sendable mail state. */
export async function finishFailedEmailIn(db:DbClient,job:any,safeError:string){
 if(!['email.send','notifications.email'].includes(job.job_type))return;
 const email=job.job_type==='email.send'
  ?await one<any>(db,'SELECT * FROM outgoing_messages WHERE id=$1 FOR UPDATE',[job.payload.messageId])
  :await one<any>(db,'SELECT * FROM outgoing_messages WHERE message_id=$1 FOR UPDATE',['<notifications-'+job.id+'@schubert.local>']);
 if(!email||job.job_type==='email.send'&&email.content_hash!==job.payload.contentHash)return;
 let state:string|null=null;
 if(email.status==='queued')state='failed';
 if(email.status==='sending'&&email.dispatch_job_id===job.id&&String(email.dispatch_fencing_token)===String(job.fencing_token))state='outcome_unknown';
 if(!state)return;
 await update(db,'outgoing_messages',email.id,{status:state,last_error:state==='outcome_unknown'?'Der Versandauftrag endete ohne eindeutigen Übergabenachweis. Vor einem neuen Entwurf ist die tatsächliche Annahme zu klären.':safeError},email.version);
 if(job.job_type==='notifications.email')await db.query('UPDATE notification_deliveries SET status=$1,updated_at=now() WHERE outgoing_message_id=$2',[state,email.id]);
}
