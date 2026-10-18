import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withTenant,one,rows} from '@schubert/db';
import {executeCommand,feedbackReport,feedbackPacket,feedbackMarkdown,feedbackQueue,loadPage,invalidateReads} from '@schubert/application';
import type {ActorContext} from '@schubert/contracts';
import {insertRestoredRows} from './lib/restore-rows.js';

export async function feedbackIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
 const admin=actor('SuperAdmin'),owner=actor('Owner'),employee=actor('Employee'),other=actor('Office');
 const call=(ctx:ActorContext,name:string,payload:Record<string,unknown>,record?:any,key=randomUUID())=>executeCommand(ctx,{name,payload,id:record?.id,expectedVersion:record?.version,idempotencyKey:key});
 let setting=await withTenant(admin,db=>one<any>(db,'SELECT id,feedback_version version FROM legal_entities WHERE id=$1',[admin.legalEntityId]));
 let report:any;
 await test('Feedback is explicitly enabled only by a current SuperAdmin',async()=>{
  await assert.rejects(()=>call(owner,'feedback.settings.update',{enabled:true},setting),(e:any)=>e.code==='FORBIDDEN');
  setting=await call(admin,'feedback.settings.update',{enabled:true},setting);
  await assert.rejects(()=>call(admin,'feedback.settings.update',{enabled:false},{...setting,version:setting.version-1}),(e:any)=>e.code==='VERSION_CONFLICT');
  invalidateReads(admin);const page=await loadPage(employee,'help',new URL('https://test.invalid/help'));assert.equal(page.summary.feedback.enabled,true);assert.equal(page.summary.feedback.version,undefined);
 });
 await test('Feedback submission is idempotent, attributed and strips unsafe diagnostic actions',async()=>{
  const key=randomUUID(),payload={category:'usability',message:'Synthetische Rückmeldung: Schaltfläche schwer zu finden.',expected:'Eine verständliche Beschriftung.',page:'/customers?token=DO_NOT_STORE',context:{browser:'Edge',os:'Windows',viewport:{width:1440,height:1000},client_release:'development',steps:[{kind:'control',action:'PRIVATE CUSTOMER',page:'/customers?token=DO_NOT_STORE',age_seconds:2,outcome:'opened'},{kind:'command',action:'account.password.update',page:'/account',age_seconds:1,outcome:'succeeded'},{kind:'command',action:'crm.customer.create',page:'/customers',age_seconds:0,outcome:'failed',error_code:'VALIDATION_ERROR',correlation_id:randomUUID()}]}};
  report=await call(employee,'feedback.submit',payload,undefined,key);assert.match(report.number,/^FB-\d+$/);assert.deepEqual(Object.keys(report).sort(),['id','number','version']);assert.deepEqual(await call(employee,'feedback.submit',payload,undefined,key),report);
  const saved=await feedbackReport(admin,report.id);assert.equal(saved.actor_id,employee.actorId);assert.equal(saved.submitter_role,'Employee');assert.equal(saved.context.steps.length,1);assert.equal(saved.page_path,'/customers');assert(!JSON.stringify(saved).includes('DO_NOT_STORE'));assert(!JSON.stringify(saved).includes('PRIVATE CUSTOMER'));
  const total=await withTenant(admin,db=>one<any>(db,'SELECT count(*)::int n FROM feedback_reports WHERE id=$1',[report.id]));assert.equal(total.n,1);
 });
 await test('Feedback review, export and SQL reads enforce actor, entity and SuperAdmin boundaries',async()=>{
  for(const ctx of [owner,employee,other,{...admin,actorId:owner.actorId}])await assert.rejects(()=>feedbackReport(ctx,report.id),(e:any)=>e.code==='FORBIDDEN');
  for(const ctx of [owner,other,{...admin,tenantId:randomUUID()},{...admin,legalEntityId:randomUUID()}])assert.equal((await withTenant(ctx,db=>rows(db,'SELECT id FROM feedback_reports WHERE id=$1',[report.id]))).length,0);
  const original=await feedbackReport(admin,report.id);
  assert.equal((await withTenant(owner,db=>db.query("UPDATE feedback_reports SET status='resolved' WHERE id=$1 RETURNING id",[report.id]))).rowCount,0);
  await assert.rejects(()=>withTenant(admin,db=>db.query("UPDATE feedback_reports SET message='Changed original' WHERE id=$1",[report.id])),(e:any)=>e.code==='23514');
  report=await call(admin,'feedback.update',{status:'planned',priority:'high',admin_notes:'Beschriftung prüfen; Mobilansicht testen.',resolution_ref:''},report);
  await assert.rejects(()=>call(admin,'feedback.update',{status:'resolved',priority:'normal',admin_notes:'Stale',resolution_ref:''},{...report,version:report.version-1}),(e:any)=>e.code==='VERSION_CONFLICT');
  const updated=await feedbackReport(admin,report.id),packet=feedbackPacket(updated);assert.equal(packet.original.comment,original.message);assert.equal(packet.triage.status,'planned');assert(packet.handling.includes('gesondertem Auftrag'));assert(feedbackMarkdown(updated).includes(original.message));
  const queue=await withTenant(admin,db=>feedbackQueue(db,admin,new URL('https://test.invalid/settings?tab=feedback&status=planned&report='+report.id)));assert(queue.items.some((r:any)=>r.id===report.id));assert.equal(queue.detail.id,report.id);
 });
 await test('Feedback backup rows restore with their original identity and recomputed reference',async()=>{
  const original=await feedbackReport(admin,report.id);
  await withTenant(admin,async db=>{
   await db.query('CREATE TEMP TABLE feedback_reports (LIKE public.feedback_reports INCLUDING ALL) ON COMMIT DROP');
   await insertRestoredRows(db,'pg_temp','feedback_reports',[original]);
   const restored=await one<any>(db,'SELECT id,number,reference,message FROM pg_temp.feedback_reports');assert.equal(restored.id,original.id);assert.equal(restored.number,original.number);assert.equal(restored.reference,original.reference);assert.equal(restored.message,original.message);
  });
 });
 await test('Feedback pagination retains microsecond precision without skipping adjacent reports',async()=>{
  const ids=Array.from({length:26},()=>randomUUID());
  await withTenant(admin,async db=>{for(const [i,id]of ids.entries())await db.query("INSERT INTO feedback_reports(id,tenant_id,legal_entity_id,actor_id,submitter_name,submitter_role,category,message,page_path,page_label,server_release,status,created_at) VALUES($1,$2,$3,$4,'Synthetische Seitenprüfung','SuperAdmin','other','Synthetische Pagination – keine echte Rückmeldung.','/help','Hilfe','development','triaged','2002-01-01T00:00:00Z'::timestamptz+$5::int*interval '1 microsecond')",[id,admin.tenantId,admin.legalEntityId,admin.actorId,i]);});
  const first=await withTenant(admin,db=>feedbackQueue(db,admin,new URL('https://test.invalid/settings?tab=feedback&status=triaged')));assert.equal(first.items.length,25);assert(first.next);
  const second=await withTenant(admin,db=>feedbackQueue(db,admin,new URL('https://test.invalid/settings?tab=feedback&status=triaged&cursor='+first.next)));
  assert.deepEqual(new Set([...first.items,...second.items].map(r=>r.id)),new Set(ids));assert.equal(second.next,null);
  await withTenant(admin,db=>db.query("UPDATE feedback_reports SET status='closed',version=version+1 WHERE id=ANY($1::uuid[])",[ids]));
 });
 await test('Disabling feedback blocks stale browser submissions while retaining review access',async()=>{
  setting=await call(admin,'feedback.settings.update',{enabled:false},setting);
  await assert.rejects(()=>call(employee,'feedback.submit',{category:'bug',message:'Must not be stored',page:'/help',context:null}),(e:any)=>e.code==='FEEDBACK_DISABLED');
  assert.equal((await feedbackReport(admin,report.id)).id,report.id);
  // Leave the isolated development tenant ready for the browser tests.
  setting=await call(admin,'feedback.settings.update',{enabled:true},setting);invalidateReads(admin);
 });
}
