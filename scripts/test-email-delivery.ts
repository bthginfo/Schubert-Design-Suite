import 'dotenv/config';
import {config} from 'dotenv';config({path:'.env.testing.local',quiet:true});
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {getPool,withTenant,one,insert,update,closePools} from '@schubert/db';
import {executeCommand,baseData,getRecord,hash} from '@schubert/application';
import {DomainError,requireRule,rolePermissions} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
import {processPending} from '../packages/application/src/jobs.js';
import {runEmailSend,finishFailedEmailIn} from '../packages/application/src/email-jobs.js';

if(process.env.APP_ENV==='production'||!process.env.TEST_TENANT_ID)throw new Error('Only the explicitly isolated synthetic QA tenant is allowed.');
const member=(await getPool().query('SELECT lookup_request_context($1,NULL) context',[process.env.TEST_OWNER_ID])).rows[0].context;
assert.equal(member.tenant_id,process.env.TEST_TENANT_ID);
const ctx:ActorContext={tenantId:member.tenant_id,legalEntityId:member.legal_entity_id,actorId:member.user_id,employeeId:member.employee_id,role:member.role,permissions:[...rolePermissions[member.role],...(member.permissions??[])],permissionVersion:member.permission_version,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID(),reauthenticatedAt:new Date()};
let transportCalls=0,passed=0;
const transport=async()=>{transportCalls++;throw new Error('The QA state suite must never call any SMTP transport.');};
async function lease(db:any,job:any){const current=await getRecord(db,'job_runs',job.id,true);requireRule(current.status==='running'&&String(current.fencing_token)===String(job.fencing_token)&&new Date(current.lease_until)>new Date(),'STALE_JOB_FENCE','Synthetic stale fence.',409);return current;}
async function rejectsCode(action:()=>Promise<unknown>,code:string){await assert.rejects(action,(error:any)=>error.code===code);passed++;}
async function command(name:string,id:string|undefined,payload:any={},version?:number,actor=ctx){return executeCommand(actor,{name,id,expectedVersion:version,idempotencyKey:randomUUID(),payload});}
async function seed(status:string,title:string){return withTenant(ctx,async db=>{
 const order=await one<any>(db,"SELECT id,customer_id FROM orders WHERE status NOT IN('deleted','erased') ORDER BY created_at DESC LIMIT 1");assert(order,'An isolated QA order is required.');
 const job=await insert(db,'job_runs',{...baseData(ctx),actor_id:ctx.actorId,name:'Synthetische Versandzustandsprüfung · kein SMTP',job_type:'email.send',status:'running',attempts:2,fencing_token:2,lease_until:new Date(Date.now()+600000),payload:{}});
 const data={recipient:'synthetic-no-smtp@example.invalid',sender:'synthetic-state-only@example.invalid',subject:'Synthetische Versandzustandsprüfung · '+title,body:'Ausschließlich isolierte Zustandsprüfung. Keine E-Mail wurde an einen externen Anbieter übermittelt.',order_id:order.id,customer_id:order.customer_id,attachment_version_ids:[],attachment_snapshot:[]};
 const email=await insert(db,'outgoing_messages',{...baseData(ctx),...data,message_id:'<synthetic-no-smtp-'+randomUUID()+'@schubert.local>',content_hash:hash(data),approved_by:ctx.actorId,approved_at:new Date(),status,...(status==='sending'?{dispatch_job_id:job.id,dispatch_fencing_token:1,dispatch_started_at:new Date()}:{}),...(status==='provider_accepted'?{sent_at:new Date(),provider_response:JSON.stringify({syntheticStateFixture:true,notAnActualProviderReceipt:true})}:{})});
 const payload={messageId:email.id,contentHash:email.content_hash,test:true};await db.query('UPDATE job_runs SET payload=$1::jsonb WHERE id=$2',[JSON.stringify(payload),job.id]);return{email,job:{...job,payload},order};
 });}
try{
 const interrupted=await seed('sending','unterbrochener Versuch');
 await rejectsCode(()=>runEmailSend(ctx,interrupted.job,{assertLeaseIn:lease,transport:transport as any}),'OUTCOME_UNKNOWN');
 assert.equal((await withTenant(ctx,db=>getRecord(db,'outgoing_messages',interrupted.email.id))).status,'outcome_unknown');passed++;
 await rejectsCode(()=>runEmailSend(ctx,interrupted.job,{assertLeaseIn:lease,transport:transport as any}),'OUTCOME_UNKNOWN');
 await rejectsCode(()=>command('communication.email.redraft',interrupted.email.id,{confirmed:true},interrupted.email.version+1),'MAIL_REDRAFT_STATE');
 const accepted=await seed('provider_accepted','vorhandener historischer Annahmestand');
 const receipt=await runEmailSend(ctx,accepted.job,{assertLeaseIn:lease,transport:transport as any});assert.equal(receipt?.status,'provider_accepted');assert(receipt&&'receiptRecovered'in receipt&&receipt.receiptRecovered===true);passed++;
 const failed=await seed('failed','eindeutiger abgeschlossener Fehlversuch');
 await rejectsCode(()=>runEmailSend(ctx,failed.job,{assertLeaseIn:lease,transport:transport as any}),'MAIL_STATE');
 const stale=await seed('queued','veralteter Jobtoken');
 await rejectsCode(()=>runEmailSend(ctx,{...stale.job,fencing_token:1},{assertLeaseIn:lease,transport:transport as any}),'STALE_JOB_FENCE');
 assert.equal((await withTenant(ctx,db=>getRecord(db,'outgoing_messages',stale.email.id))).status,'queued');passed++;
 const inFlight=await seed('sending','anderer gültiger Versandversuch');
 await withTenant(ctx,db=>db.query('UPDATE outgoing_messages SET dispatch_job_id=$2,dispatch_fencing_token=$3 WHERE id=$1',[inFlight.email.id,interrupted.job.id,interrupted.job.fencing_token]));
 await rejectsCode(()=>runEmailSend(ctx,inFlight.job,{assertLeaseIn:lease,transport:transport as any}),'MAIL_IN_FLIGHT');
 assert.equal((await withTenant(ctx,db=>getRecord(db,'outgoing_messages',inFlight.email.id))).status,'sending');passed++;
 await assert.rejects(()=>withTenant(ctx,db=>db.query('UPDATE outgoing_messages SET body=$2 WHERE id=$1',[accepted.email.id,'Unzulässige spätere Änderung'])),/approved_mail_content_immutable/);passed++;
 const proof=await withTenant(ctx,db=>one<any>(db,"SELECT v.id FROM documents d JOIN document_versions v ON v.id=d.current_version_id WHERE d.name='qa-retention-original.txt' AND d.status='available' LIMIT 1"));assert(proof,'The existing explicitly synthetic original is required.');
 const reviewPayload={outcome:'not_accepted',reason:'Synthetische Zustandsprüfung: kein SMTP-Aufruf wurde ausgeführt; der beigefügte Testbeleg dokumentiert ausschließlich diese isolierte QA.',provider_reference:'SYNTHETIC-NO-SMTP-CALL',evidence_document_version_id:proof.id,confirmed:true};
 const current=await withTenant(ctx,db=>getRecord(db,'outgoing_messages',interrupted.email.id));
 await rejectsCode(()=>command('communication.email.resolve',current.id,reviewPayload,current.version,{...ctx,reauthenticatedAt:null}),'REAUTH_REQUIRED');
 await rejectsCode(()=>command('communication.email.resolve',current.id,{...reviewPayload,evidence_document_version_id:randomUUID()},current.version),'MAIL_EVIDENCE');
 const draft=await command('communication.email.create',undefined,{order_id:interrupted.order.id,recipient:'synthetic-no-smtp@example.invalid',subject:'Synthetische Vorschau ohne Versand',body:'Dieser Test darf keinen externen Versand auslösen.',attachment_version_ids:[]});
 await rejectsCode(()=>command('communication.email.send',draft.id,{confirm_hash:'stale-hash'},draft.version),'MAIL_PREVIEW_STALE');
 await rejectsCode(()=>command('communication.email.create',undefined,{order_id:interrupted.order.id,recipient:'synthetic-no-smtp@example.invalid',subject:'Synthetischer Schutz interner Anlagen',body:'Keine internen Anlagen versenden.',attachment_version_ids:[proof.id]}),'MAIL_ATTACHMENT_AUDIENCE');
 const terminal=await seed('queued','endgültiger Fehler vor SMTP');
 await withTenant(ctx,db=>finishFailedEmailIn(db,terminal.job,'Synthetischer endgültiger Fehler ohne SMTP.'));
 assert.equal((await withTenant(ctx,db=>getRecord(db,'outgoing_messages',terminal.email.id))).status,'failed');passed++;
 const terminalSending=await seed('sending','endgültiger eigener Versuch');
 await withTenant(ctx,db=>db.query('UPDATE outgoing_messages SET dispatch_fencing_token=$2 WHERE id=$1',[terminalSending.email.id,terminalSending.job.fencing_token]));
 await withTenant(ctx,db=>finishFailedEmailIn(db,terminalSending.job,'Synthetischer Abbruch.'));
 assert.equal((await withTenant(ctx,db=>getRecord(db,'outgoing_messages',terminalSending.email.id))).status,'outcome_unknown');passed++;
 await withTenant(ctx,db=>finishFailedEmailIn(db,accepted.job,'Darf Annahme nicht ändern.'));
 assert.equal((await withTenant(ctx,db=>getRecord(db,'outgoing_messages',accepted.email.id))).status,'provider_accepted');passed++;
 await withTenant(ctx,db=>finishFailedEmailIn(db,inFlight.job,'Fremder aktiver Versuch bleibt bestehen.'));
 assert.equal((await withTenant(ctx,db=>getRecord(db,'outgoing_messages',inFlight.email.id))).status,'sending');passed++;
 const unauthorized=await seed('queued','vollständiger Worker-Autorisierungsfehler');
 await withTenant(ctx,db=>db.query("UPDATE job_runs SET actor_id=$2,status='pending',lease_until=NULL,attempts=0 WHERE id=$1",[unauthorized.job.id,randomUUID()]));
 await processPending(ctx,1,unauthorized.job.id);
 const unauthorizedSaved=await withTenant(ctx,async db=>({job:await getRecord(db,'job_runs',unauthorized.job.id),mail:await getRecord(db,'outgoing_messages',unauthorized.email.id)}));
 assert.equal(unauthorizedSaved.job.status,'failed');assert.equal(unauthorizedSaved.mail.status,'failed');passed++;
 const wrongBinding=await seed('queued','falscher Versionshash');
 await withTenant(ctx,db=>finishFailedEmailIn(db,{...wrongBinding.job,payload:{...wrongBinding.job.payload,contentHash:'wrong'}},'Darf fremden Stand nicht ändern.'));
 assert.equal((await withTenant(ctx,db=>getRecord(db,'outgoing_messages',wrongBinding.email.id))).status,'queued');passed++;
 assert.equal(transportCalls,0);passed++;
 await withTenant(ctx,db=>db.query("UPDATE job_runs SET status='cancelled',lease_until=NULL,last_error='Synthetischer Zustandsfall beendet; kein SMTP-Aufruf.' WHERE id=ANY($1::uuid[])",[[interrupted.job.id,accepted.job.id,failed.job.id,stale.job.id,inFlight.job.id]]));
 await mkdir('work',{recursive:true});await writeFile('work/qa-email-state.json',JSON.stringify({tenantId:ctx.tenantId,actorId:ctx.actorId,orderId:interrupted.order.id,unknownMessageId:current.id,unknownVersion:current.version,evidenceVersionId:proof.id,draftId:draft.id,passed,transportCalls},null,2));
 console.log(JSON.stringify({passed,transportCalls,unknownMessageId:current.id,orderId:interrupted.order.id}));
}finally{await withTenant(ctx,db=>db.query("UPDATE job_runs SET status='cancelled',lease_until=NULL,last_error='Synthetischer Zustandsfall beendet; kein SMTP-Aufruf.' WHERE name='Synthetische Versandzustandsprüfung · kein SMTP' AND created_by=$1 AND status IN('running','pending','retry')",[ctx.actorId]));await closePools();}
