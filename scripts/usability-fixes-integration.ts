import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {executeCommand,loadPage,baseData,invalidateReads} from '@schubert/application';
import {one,withTenant,insertMany} from '@schubert/db';import type {ActorContext} from '@schubert/contracts';

export async function usabilityFixesIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
 const owner=actor('Owner'),admin=actor('SuperAdmin'),finance=actor('Finance'),employee=actor('Employee');
 const call=(ctx:ActorContext,name:string,payload:any={},record?:any)=>executeCommand(ctx,{name,id:record?.id,expectedVersion:record?.version,idempotencyKey:randomUUID(),payload});
 await test('Manual explanations survive submission and correction without rewriting the original submitted snapshot',async()=>{
  const marker=randomUUID(),user=await call(admin,'administration.user.create',{name:'Synthetic time evidence '+marker,email:'ux-time-'+marker+'@example.invalid',password:'Synthetic!'+randomUUID(),role:'Employee'});
  const profile=await call(admin,'workforce.employee.create',{name:user.name,user_id:user.user_id});
  const own={...employee,actorId:user.user_id,employeeId:profile.id},reason='Synthetischer Nachtrag wegen fehlender Netzverbindung',changed='Synthetisch ergänzter Hinweis zum Nachtrag';
  const actual={started_at:'2026-10-22T12:00:00Z',ended_at:'2026-10-22T12:30:00Z',activity:'Montage',reason};
  const session=await call(own,'workforce.time.manual',actual),original=await call(own,'workforce.time.submit',{date:'2026-10-22'});
  assert.equal(original.revision_snapshot[0].session.notes,reason);assert.equal(original.revision_snapshot[0].allocations[0].activity,'Montage');
  await call(admin,'workforce.time.return',{reason:'Synthetische Rückfrage für Korrekturprüfung'},original);
  const correction=await call(own,'workforce.time.propose_correction',{reason:'Synthetische Korrektur des Endes',new_snapshot:{...actual,ended_at:'2026-10-22T12:35:00Z',reason:changed}},session);
  assert.equal(correction.old_snapshot.session.notes,reason);assert.equal(correction.new_snapshot.session.notes,changed);
  await call(admin,'workforce.time.correction.approve',{reason:'Synthetischer fremder Versionsvergleich'},correction);
  const revised=await call(own,'workforce.time.submit',{date:'2026-10-22'});assert.equal(revised.revision_snapshot[0].session.notes,changed);assert.equal(revised.revision_snapshot[0].session.ended_at,'2026-10-22T12:35:00.000Z');
  const prior=await withTenant(admin,db=>one<any>(db,'SELECT revision_snapshot FROM time_submissions WHERE id=$1',[original.id]));assert.deepEqual(prior.revision_snapshot,original.revision_snapshot);
  invalidateReads(admin);const review=await loadPage(admin,'time',new URL('https://test.invalid/time?tab=review'));const visible=review.related.review_submissions.find((record:any)=>record.id===revised.id);if(visible)assert.equal(visible.revision_snapshot[0].session.notes,changed);else{assert.equal(review.related.review_submissions.length,25,'The bounded queue shows the oldest 25 submissions; retained synthetic data must not be deleted to put a new submission first.');const first=review.related.review_submissions[0],stored=await withTenant(admin,db=>one<any>(db,'SELECT revision_snapshot FROM time_submissions WHERE id=$1',[first.id]));assert.deepEqual(first.revision_snapshot,stored.revision_snapshot);}
 });
 await test('A preliminary employee profile links a real individual membership without inventing a work schedule',async()=>{
  const marker=randomUUID(),user=await call(admin,'administration.user.create',{name:'Synthetic UX profile '+marker,email:'ux-profile-'+marker+'@example.invalid',password:'Synthetic!'+randomUUID(),role:'Office'});
  const profile=await call(admin,'workforce.employee.create',{name:user.name,user_id:user.user_id,email:user.email,employment_start:'',weekly_hours:'',work_pattern:'',holiday_region:'',annual_leave:''});
  const state=await withTenant(admin,async db=>({member:await one<any>(db,'SELECT employee_id FROM memberships WHERE user_id=$1 AND legal_entity_id=$2',[user.user_id,admin.legalEntityId]),schedule:await one(db,'SELECT id FROM work_schedules WHERE employee_id=$1',[profile.id])}));
  assert.equal(state.member.employee_id,profile.id);assert.equal(state.schedule,null);
  await assert.rejects(()=>call(admin,'workforce.employee.create',{name:user.name,user_id:user.user_id}),(e:any)=>e.code==='EMPLOYEE_USER_SCOPE');
  await assert.rejects(()=>call(admin,'workforce.employee.create',{name:'Synthetic incomplete schedule '+marker,weekly_hours:'40'}),(e:any)=>e.code==='EMPLOYEE_SCHEDULE');
 });
 await test('Customers expose authorized linked records and object-scoped history while lists resolve references beyond the first choices',async()=>{
  const marker='ZZZ Synthetic UX '+randomUUID(),customer=await call(owner,'crm.customer.create',{name:marker}),inquiry=await call(owner,'crm.inquiry.create',{title:marker,customer_id:customer.id}),order=await call(owner,'sales.order.create',{title:marker,customer_id:customer.id,currency:'EUR'});
  await withTenant(owner,db=>insertMany(db,'parties',Array.from({length:45},(_,i)=>({...baseData(owner),id:randomUUID(),name:'AAA '+marker+' '+i,is_customer:true,active:true,status:'active'}))));
  invalidateReads(owner);const page=await loadPage(owner,'orders',new URL('https://test.invalid/orders?q='+encodeURIComponent(marker))),detail=await loadPage(owner,'customers/'+customer.id,new URL('https://test.invalid/customers/'+customer.id));
  assert(page.records.some((record:any)=>record.id===order.id));assert(page.lookups.customers.some((choice:any)=>choice.id===customer.id&&choice.name.includes(marker)));
  assert(detail.related.inquiries.some((record:any)=>record.id===inquiry.id));assert(detail.related.orders.some((record:any)=>record.id===order.id));assert(detail.related.audit_events.some((event:any)=>event.label.includes('angelegt')));
  const wrong={...owner,legalEntityId:randomUUID()};await assert.rejects(()=>loadPage(wrong,'customers/'+customer.id,new URL('https://test.invalid/customers/'+customer.id)),(e:any)=>e.code==='NOT_FOUND');
 });
 await test('Financial report evidence stays read-only, scoped and separate from source workspace permission',async()=>{
  const own=await call(owner,'crm.customer.create',{name:'Synthetic report source '+randomUUID()}),order=await call(owner,'sales.order.create',{title:'Synthetic financial evidence',customer_id:own.id,currency:'EUR'});
  const url=new URL('https://test.invalid/reports?tab=sources&source=orders&source_id='+order.id),page=await loadPage(finance,'reports',url);
  assert.equal(page.summary.reportSource.records[0].id,order.id);assert(!Object.hasOwn(page.summary.reportSource.records[0],'snapshot'));assert(!Object.hasOwn(page.summary.reportSource.records[0],'customer_id'));
  await assert.rejects(()=>loadPage({...finance,legalEntityId:randomUUID()},'reports',url),(e:any)=>e.code==='NOT_FOUND');
  await assert.rejects(()=>loadPage(employee,'reports',url),(e:any)=>e.code==='FORBIDDEN');
 });
 await test('Task source links only target existing authorized records, including stale notification references',async()=>{
  const valid=await call(owner,'crm.inquiry.create',{title:'Synthetic existing task source '+randomUUID()}),base=await call(owner,'communication.task.create',{title:'Synthetic task source '+randomUUID(),assigned_to:owner.employeeId});
  await withTenant(owner,db=>db.query('UPDATE tasks SET action_link=$1 WHERE id=$2',['/inquiries/'+valid.id,base.id]));invalidateReads(owner);
  const linked=await loadPage(owner,'tasks/'+base.id,new URL('https://test.invalid/tasks/'+base.id));assert.equal(linked.detail.source_href,'/inquiries/'+valid.id);
  await withTenant(owner,db=>db.query('UPDATE tasks SET action_link=$1 WHERE id=$2',['/quotes/'+randomUUID(),base.id]));invalidateReads(owner);
  const stale=await loadPage(owner,'tasks/'+base.id,new URL('https://test.invalid/tasks/'+base.id));assert.equal(stale.detail.source_href,null);assert(stale.detail.source_label.includes('fehlt'));
 });
 await test('Repeated onboarding pause is idempotent and omitted guide versions preserve the saved version',async()=>{
  let prior=await withTenant(owner,db=>one<any>(db,'SELECT * FROM user_onboarding WHERE actor_id=$1',[owner.actorId]));
  const first=await call(owner,'account.onboarding.update',{status:'deferred',step:2,guideVersion:3},prior);
  const same=await call(owner,'account.onboarding.update',{status:'deferred',step:2,guideVersion:3},prior);assert.equal(same.version,first.version);
  const next=await call(owner,'account.onboarding.update',{status:'in_progress',step:3},first);assert.equal(next.guide_version,3);
  await assert.rejects(()=>call(owner,'account.onboarding.update',{status:'deferred',step:4,guideVersion:3},first),(e:any)=>e.code==='VERSION_CONFLICT');
 });
}
