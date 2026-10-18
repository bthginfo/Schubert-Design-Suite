import {appearanceIntegration} from './appearance-integration.js';
import {feedbackIntegration} from './feedback-integration.js';
import 'dotenv/config';
import {config} from 'dotenv';
config({path:'.env.testing.local',quiet:true});
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {executeCommand,loadPage,register,auditEvent} from '@schubert/application';
import {getPool,withTenant,one,rows,closePools} from '@schubert/db';
import {rolePermissions,DomainError} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
import {aiUsage} from '../packages/application/src/ai-usage.js';
import {allocateNumber} from '../packages/application/src/numbering-engine.js';
const tenantId=process.env.TEST_TENANT_ID,legalId=process.env.TEST_LEGAL_ENTITY_ID;
assert(tenantId&&legalId,'Run scripts/testing-fixture.ts first.');
function actor(role:string):ActorContext{return {tenantId:tenantId!,legalEntityId:legalId!,actorId:process.env['TEST_'+role.toUpperCase()+'_ID']!,employeeId:process.env['TEST_'+role.toUpperCase()+'_EMPLOYEE_ID']!,role,permissions:rolePermissions[role]??[],permissionVersion:1,correlationId:randomUUID(),actorType:'employee',identityAssurance:'individual_session',reauthenticatedAt:new Date()};}
const owner=actor('Owner');let employee=actor('Employee');let checks=0;
async function test(label:string,run:()=>Promise<void>){await run();checks++;console.log('PASS '+label);}
const command=(ctx:ActorContext,name:string,payload:Record<string,unknown>={},record?:any,key=randomUUID())=>executeCommand(ctx,{name,id:record?.id,expectedVersion:record?.version,idempotencyKey:key,payload});
try{
await test('Application database role cannot bypass RLS or own schema',async()=>{const row=(await getPool().query('SELECT rolname,rolbypassrls,rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0];assert.equal(row.rolname,'schubert_app');assert.equal(row.rolbypassrls,false);assert.equal(row.rolsuper,false);const outside=await getPool().query('SELECT id FROM parties LIMIT 1');assert.equal(outside.rowCount,0);});
await test('Catalog with only document references loads through real PostgreSQL',async()=>{const page=await loadPage(owner,'edge-treatments',new URL('http://localhost/edge-treatments'));assert.equal(page.module.slug,'edge-treatments');assert.equal(page.view,'list');assert.ok(Array.isArray(page.lookups['document-versions']));});
const customer=await command(owner,'crm.customer.create',{name:'Synthetischer Integrationstest '+randomUUID().slice(0,6),party_type:'person',street:'Teststraße 1',postal_code:'85051',city:'Ingolstadt',country:'DE'});
await test('Cross-tenant and cross-entity records remain inaccessible',async()=>{const foreign={...owner,tenantId:randomUUID()};assert.equal((await withTenant(foreign,db=>rows(db,'SELECT id FROM parties WHERE id=$1',[customer.id]))).length,0);const entity={...owner,legalEntityId:randomUUID()};assert.equal((await withTenant(entity,db=>rows(db,'SELECT id FROM parties WHERE id=$1',[customer.id]))).length,0);});
await test('Optimistic concurrency rejects stale changes without mutation',async()=>{const updated=await command(owner,'crm.customer.update',{phone:'01234 56789'},customer);await assert.rejects(()=>command(owner,'crm.customer.update',{phone:'wrong'},customer),(e:any)=>e.code==='VERSION_CONFLICT');const current=await withTenant(owner,db=>one<any>(db,'SELECT phone,version FROM parties WHERE id=$1',[customer.id]));assert.equal(current.phone,'01234 56789');assert.equal(current.version,updated.version);});
const lines=[{description:'Verbindliche Testleistung',quantity:'2',unit:'piece',unit_price:'100',tax_rate:'19',discount_percent:'0',line_type:'item',optional:false,selected:true},{description:'Ausdrücklich abwählbare Option',quantity:'1',unit:'piece',unit_price:'50',tax_rate:'19',discount_percent:'0',line_type:'item',optional:true,selected:false}];
let quote=await command(owner,'sales.quote.create',{title:'Synthetischer Angebotsablauf',customer_id:customer.id,valid_until:new Date(Date.now()+7*86400000).toISOString().slice(0,10),lines});
await test('Exact decimal prices and unselected options produce correct totals',async()=>{assert.equal(quote.net_total,'200.00');assert.equal(quote.gross_total,'238.00');});
quote=await command(owner,'sales.quote.review',{},quote);quote=await command(owner,'sales.quote.approve',{},quote);quote=await command(owner,'sales.quote.publish',{},quote);
const acceptanceKey=randomUUID();let order:any;
await test('Published quote acceptance and order creation commit atomically once',async()=>{const payload={person_name:'Synthetischer Kunde',statement:'Ich nehme die bezeichnete Testleistung ausdrücklich an.',channel:'written',selected_options:[]};order=await command(owner,'sales.quote.accept',payload,quote,acceptanceKey);const duplicate=await command(owner,'sales.quote.accept',payload,quote,acceptanceKey);assert.equal(duplicate.id,order.id);assert.equal(order.budget_net,'200.00');const count=await withTenant(owner,db=>one<any>(db,'SELECT count(*)::int n FROM orders WHERE quote_version_id=$1',[quote.published_version_id]));assert.equal(count.n,1);await assert.rejects(()=>command(owner,'sales.quote.accept',{...payload,statement:'different'},quote,acceptanceKey),(e:any)=>e.code==='IDEMPOTENCY_CONFLICT');});
await test('Published versions and audit ledger are immutable',async()=>{await assert.rejects(()=>withTenant(owner,db=>db.query("UPDATE quote_versions SET content_hash='changed' WHERE id=$1",[quote.published_version_id])));const audit=await withTenant(owner,db=>one<any>(db,'SELECT id FROM audit_events ORDER BY created_at DESC LIMIT 1'));await assert.rejects(()=>withTenant(owner,db=>db.query("DELETE FROM audit_events WHERE id=$1",[audit.id])));});
await test('Employees cannot alter commercial orders or read unassigned order details',async()=>{await assert.rejects(()=>command(employee,'sales.order.update',{budget_net:'1'},order),(e:any)=>e.status===403||e.status===404);await assert.rejects(()=>loadPage(employee,'orders/'+order.id,new URL('http://localhost/orders/'+order.id)),(e:any)=>e.status===404);});
await test('Invoice issue stays blocked before real approval and archive evidence',async()=>{const invoice=await command(owner,'billing.invoice.create',{title:'Nicht auszustellender Prüffall',customer_id:customer.id,order_id:order.id,kind:'normal',service_date:new Date().toISOString().slice(0,10),due_date:new Date().toISOString().slice(0,10),lines});await assert.rejects(()=>command(owner,'billing.invoice.issue',{},invoice));const state=await withTenant(owner,db=>one<any>(db,'SELECT number,issued_at FROM invoices WHERE id=$1',[invoice.id]));assert.equal(state.number,null);assert.equal(state.issued_at,null);});
const newUser=await command(owner,'administration.user.create',{name:'Isolierte Zeitprüfung',email:'integration.'+randomUUID()+'@schubert.test',password:randomUUID()+randomUUID(),role:'Employee'});const newEmployee=await command(owner,'workforce.employee.create',{name:'Isolierte Zeitprüfung',user_id:newUser.user_id,employment_start:'2026-01-01',weekly_hours:'40',work_pattern:'[8,8,8,8,8,0,0]',holiday_region:'DE-BY'});employee={...employee,actorId:newUser.user_id,employeeId:newEmployee.id};
const sessionId=randomUUID(),base=Date.now()-14*3600000;let previous:string|undefined,session:any;
await test('Sequential time commands retain actual 12.5 hours and one active timer',async()=>{for(const [index,kind,hours]of [[0,'start',0],[1,'pause',6],[2,'resume',6.5],[3,'finish',13]]as const){const id=randomUUID();session=await executeCommand(employee,{name:'workforce.time.'+kind,id:sessionId,idempotencyKey:id,payload:{command_id:id,device_id:'integration-device',client_sequence:index,time_session_id:sessionId,depends_on_command_id:previous??null,occurred_at:new Date(base+hours*3600000).toISOString(),timezone:'Europe/Berlin',activity:'general'}});previous=id;}assert.equal(session.active,false);const totals=await withTenant(employee,db=>one<any>(db,"SELECT sum(EXTRACT(EPOCH FROM ended_at-started_at)) FILTER(WHERE kind='work')::int work,sum(EXTRACT(EPOCH FROM ended_at-started_at)) FILTER(WHERE kind='break')::int pause FROM time_segments WHERE time_session_id=$1",[sessionId]));assert.equal(totals.work,45000);assert.equal(totals.pause,1800);});
let submission:any;
await test('Long actual work submits with review warnings and cannot self-approve',async()=>{const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date(base));submission=await command(employee,'workforce.time.submit',{date});assert(submission.warnings.length);await assert.rejects(()=>command(employee,'workforce.time.approve',{reason:'Synthetische Prüfung'},submission),(e:any)=>e.status===403);});
await test('Approval creates cost/time ledger once and missing rates remain unknown',async()=>{const key=randomUUID();const approved=await command(owner,'workforce.time.approve',{reason:'Tatsächlich erfasste Zeit bestätigt; Regelverstoß bleibt zur betrieblichen Klärung.'},submission,key);await command(owner,'workforce.time.approve',{reason:'Tatsächlich erfasste Zeit bestätigt; Regelverstoß bleibt zur betrieblichen Klärung.'},submission,key);assert.equal(approved.status,'approved');const state=await withTenant(owner,db=>one<any>(db,'SELECT count(*)::int n,sum(seconds)::int seconds FROM time_account_ledger WHERE submission_id=$1',[submission.id]));assert.equal(state.n,1);assert.equal(state.seconds,45000);const labor=await withTenant(owner,db=>rows<any>(db,'SELECT amount FROM labor_cost_ledger WHERE submission_id=$1',[submission.id]));assert(labor.length>0&&labor.every(x=>x.amount===null));});
await test('Manual entries require an actual pause time instead of guessing a pause',async()=>{await assert.rejects(()=>command(employee,'workforce.time.manual',{started_at:new Date(base-2*86400000).toISOString(),ended_at:new Date(base-2*86400000+8*3600000).toISOString(),break_minutes:'30',reason:'Tatsächliche Nacherfassung'}),(e:any)=>e.code==='BREAK_POINT_REQUIRED');});
await test('Account view and reviewer queue obey assigned permissions',async()=>{const account=await loadPage(employee,'account',new URL('http://localhost/account'));assert.equal(account.view,'settings');assert.equal(account.related.memberships,undefined);const page=await loadPage(employee,'time',new URL('http://localhost/time'));assert.equal(page.related.review_submissions.length,0);assert(page.related.time_submissions.some((s:any)=>s.id===submission.id));});
await test('A01 business change, receipt and outbox roll back atomically before retry',async()=>{
 const unique=randomUUID(),key=randomUUID();register('test.atomic_abort','admin',async r=>{const record=await r.insert('parties',{name:unique,is_customer:true,status:'active'});if(r.payload.abort)throw new DomainError('SYNTHETIC_CRASH','Synthetic transaction abort');return record;});
 await assert.rejects(()=>command(owner,'test.atomic_abort',{abort:true},undefined,key),(e:any)=>e.code==='SYNTHETIC_CRASH');const state=await withTenant(owner,db=>one<any>(db,"SELECT (SELECT count(*) FROM parties WHERE name=$1)::int parties,(SELECT count(*) FROM command_receipts WHERE idempotency_key=$2)::int receipts,(SELECT count(*) FROM outbox_events WHERE event_type='test.atomic_abort.v1' AND correlation_id=$3)::int events",[unique,key,owner.correlationId]));assert.deepEqual(state,{parties:0,receipts:0,events:0});const retry=await command(owner,'test.atomic_abort',{abort:false},undefined,key);assert(retry.id);
});
await test('H08 multiple events in one aggregate version receive deterministic distinct sequences',async()=>{
 register('test.multi_event','admin',async r=>{const record=await r.insert('parties',{name:'Synthetic multi-event '+randomUUID(),is_customer:true,status:'active'});await auditEvent(r,'test.multi_event',record.id,record.version,{step:1});await auditEvent(r,'test.multi_event',record.id,record.version,{step:2});return record;});const record=await command(owner,'test.multi_event');const events=await withTenant(owner,db=>rows<any>(db,"SELECT event_sequence FROM outbox_events WHERE aggregate_type='test.multi_event' AND aggregate_id=$1 AND aggregate_version=1 ORDER BY event_sequence",[record.id]));assert.deepEqual(events.map(e=>e.event_sequence),[0,1,2]);
});
await test('AI monthly usage aggregates tokens, task kinds and costs without crossing month or entity boundaries',async()=>{
 const rollback=new Error('rollback usage fixtures');
 await assert.rejects(()=>withTenant(owner,async db=>{
  const add=async(task:string,input:number|null,output:number|null,cost:string|null,created:string,basis='configured_estimate')=>db.query("INSERT INTO ai_runs(tenant_id,legal_entity_id,actor_id,capability,task_type,model_id,request_hash,status,input_tokens,output_tokens,cost_actual,cost_basis,usage_details,created_at) VALUES($1,$2,$3,'assistant_reasoning',$4,'synthetic-model',$5,'completed',$6,$7,$8,$9,$10,$11)",[tenantId,legalId,owner.actorId,task,randomUUID(),input,output,cost,basis,JSON.stringify({cached_tokens:input===1000?600:null}),created]);
  await add('room_design',1000,200,'0.001','2002-02-01T00:00:00Z');
  await add('memorial_design',300,null,null,'2002-02-28T23:59:59Z');
  await add('room_design',10,15,'0.4','2002-02-15T10:00:00Z','provider_confirmed');
  await add('office_assistant',9000,9000,'3','2002-03-01T00:00:00Z');
  const usage=await aiUsage(db,owner,'2002-02');
  assert.equal(usage.totals.requests,3);assert.equal(usage.totals.total_tokens,'1525');assert.equal(usage.totals.cached_tokens,'600');
  assert.equal(usage.totals.missing_usage,1);assert.equal(usage.totals.missing_cost,1);assert.equal(Number(usage.totals.cost),.401);assert.equal(Number(usage.totals.confirmed_cost),.4);assert.equal(usage.tasks.length,2);
  assert.equal((await aiUsage(db,{...owner,legalEntityId:randomUUID()},'2002-02')).totals.requests,0);
  assert.equal((await aiUsage(db,{...owner,tenantId:randomUUID()},'2002-02')).totals.requests,0);
  assert.equal((await aiUsage(db,owner,'2002-02',false)).tasks,undefined);
  throw rollback;
 }),error=>error===rollback);
});
await test('AI dashboard usage is restricted to integration administrators',async()=>{
 const plain=await loadPage(owner,'',new URL('http://localhost/?usage-check='+randomUUID()));assert.equal(plain.summary.aiUsage,undefined);
 const admin={...owner,permissions:[...owner.permissions,'admin.integrations']};
 const page=await loadPage(admin,'',new URL('http://localhost/?usage-check='+randomUUID()));assert.ok(page.summary.aiUsage.totals);
});
await test('Concurrent number allocation is unique, rollback-safe and blocks an existing number',async()=>{
 const scope='acceptance-'+randomUUID();
 const allocated=await Promise.all(Array.from({length:6},()=>withTenant(owner,db=>allocateNumber(db,owner,scope,'TEST'))));
 assert.equal(new Set(allocated).size,6);assert.ok(allocated.some(n=>n.endsWith('00006')));
 const rollback=new Error('Rollback allocation');let rolledBack='';
 await assert.rejects(()=>withTenant(owner,async db=>{rolledBack=await allocateNumber(db,owner,scope,'TEST');throw rollback;}),e=>e===rollback);
 assert.equal(await withTenant(owner,db=>allocateNumber(db,owner,scope,'TEST')),rolledBack);
 await assert.rejects(()=>withTenant(owner,async db=>{await db.query('UPDATE number_counters SET last_value=0 WHERE scope=$1',[scope]);await allocateNumber(db,owner,scope,'TEST');}),(e:any)=>e.code==='NUMBER_ALREADY_USED');
});
await test('Numbering settings reject a backwards start and retain issued strings',async()=>{
 const scope='invoices',year=new Date().getFullYear();
 const prior=await withTenant(owner,db=>one<any>(db,'SELECT * FROM numbering_profiles WHERE scope=$1',[scope]));
 const counter=await withTenant(owner,db=>one<any>(db,'SELECT last_value FROM number_counters WHERE scope=$1 AND year=$2',[scope,year]));
 const next=Number(counter?.last_value??0)+10;
 const configured=await command(owner,'settings.numbering.update',{scope,template:'TEST-{JJJJ}-{NR}',padding:5,annual:true,next,reason:'Synthetischer Umstiegstest mit dokumentiertem vorherigem Stand'},prior);
 const number=await withTenant(owner,db=>allocateNumber(db,owner,scope,'RE'));assert.ok(number.endsWith(String(next).padStart(5,'0')));
 await assert.rejects(()=>command(owner,'settings.numbering.update',{scope,template:'NEU-{JJJJ}-{NR}',padding:5,annual:true,next,reason:'Unzulässiger Versuch einer Rücksetzung'},configured),(e:any)=>e.code==='NUMBER_BACKWARDS');
 const saved=await withTenant(owner,db=>one<any>(db,'SELECT number FROM numbering_allocations WHERE scope=$1 AND number=$2',[scope,number]));assert.equal(saved.number,number);
});
await test('Personal onboarding is persisted, optimistic and cannot target another user',async()=>{
 const prior=await withTenant(owner,db=>one<any>(db,'SELECT * FROM user_onboarding WHERE actor_id=$1',[owner.actorId]));
 const result=await command(owner,'account.onboarding.update',{status:'deferred',step:2},prior);
 assert.equal(result.actor_id,owner.actorId);assert.equal(result.step,2);
 await assert.rejects(()=>command(owner,'account.onboarding.update',{status:'completed',step:2},prior),(e:any)=>e.code==='VERSION_CONFLICT');
 await assert.rejects(()=>command(owner,'account.onboarding.update',{status:'completed',step:2,actor_id:employee.actorId},result));
 assert.equal(await withTenant(employee,db=>one(db,'SELECT id FROM user_onboarding WHERE id=$1',[result.id])),null);
 const studio=await loadPage(owner,'studio',new URL('https://test.invalid/studio?onboarding-check='+result.version));
 const entity=await withTenant(owner,db=>one<any>(db,'SELECT training_mode FROM legal_entities WHERE id=$1',[owner.legalEntityId]));
 assert.equal(studio.summary.onboarding?.id,result.id);assert.equal(studio.summary.trainingMode,entity.training_mode);
});
await feedbackIntegration(actor,test);
await appearanceIntegration(actor,test);
console.log(`${checks} PostgreSQL integration checks passed.`);
}finally{await closePools();}
