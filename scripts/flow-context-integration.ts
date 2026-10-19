import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withTenant,insertMany,type DbClient} from '@schubert/db';
import {baseData,loadPage,invalidateReads} from '@schubert/application';
import {studioDetails} from '../packages/application/src/studio-queries.js';
import type {ActorContext} from '@schubert/contracts';

export async function flowContextIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
 const owner=actor('Owner'),employee=actor('Employee');
 await test('Studio order scope is applied before keyset pagination, includes older orders and stays within two read queries',async()=>{
  const marker='Synthetic scoped '+randomUUID(),target=randomUUID(),other=randomUUID(),customer=randomUUID();
  const orders=[{...baseData(owner),id:target,customer_id:customer,title:marker+' target',status:'draft',updated_at:'2001-01-01T00:00:00Z'},...Array.from({length:45},(_,i)=>({...baseData(owner),id:i===0?other:randomUUID(),customer_id:customer,title:marker+' recent '+i,status:'draft',updated_at:'2003-01-01T00:00:00Z'}))];
  const plans=[...Array.from({length:31},(_,i)=>({...baseData(owner),id:randomUUID(),name:marker+' '+i,kind:'room_plan',order_id:target,status:'draft',updated_at:'2002-01-01T12:00:00.123456Z'})),...Array.from({length:60},(_,i)=>({...baseData(owner),id:randomUUID(),name:marker+' unrelated '+i,kind:'room_plan',order_id:other,status:'draft',updated_at:'2003-01-01T00:00:00Z'}))];
  const assignment={...baseData(owner),id:randomUUID(),title:marker,order_id:target,employee_id:employee.employeeId,starts_at:'2001-01-01T08:00:00Z',ends_at:'2001-01-01T09:00:00Z',status:'draft'};
  await withTenant(owner,async db=>{await insertMany(db,'parties',[{...baseData(owner),id:customer,name:marker,is_customer:true,status:'active'}]);await insertMany(db,'orders',orders);await insertMany(db,'planning_projects',plans);});
  try{
   const first=await withTenant(owner,async db=>{let calls=0;const observed={query:(sql:string,values:unknown[])=>{calls++;return db.query(sql,values);}} as unknown as DbClient;const page=await studioDetails(observed,owner,undefined,new URL('https://test.invalid/studio?order='+target.toUpperCase()+'&q='+encodeURIComponent(marker)));assert.equal(calls,2,'Library and page remain two existing reads');return page;});
   assert.equal(first.summary.projectOrderId,target);assert(first.summary.projectOrderName.includes('target'));assert(first.lookups.orders.some((row:any)=>row.id===target));assert(first.lookups.orders.length<=41);assert.equal(first.records.length,25);assert(first.records.every((row:any)=>row.order_id===target));
   const nextUrl=new URL(first.summary.projectNext,'https://test.invalid');assert.equal(nextUrl.searchParams.get('order'),target);assert.equal(nextUrl.searchParams.get('q'),marker);assert(nextUrl.searchParams.has('after'));
   const second=await withTenant(owner,db=>studioDetails(db,owner,undefined,nextUrl));assert.equal(second.records.length,6);assert.equal(second.summary.projectHasMore,false);assert.equal(new Set([...first.records,...second.records].map((row:any)=>row.id)).size,31);
   await assert.rejects(()=>withTenant(owner,db=>studioDetails(db,owner,undefined,new URL('https://test.invalid/studio?order=invalid'))),(error:any)=>error.code==='STUDIO_ORDER');
   for(const ctx of [employee,{...owner,legalEntityId:randomUUID()},{...owner,tenantId:randomUUID()}])await assert.rejects(()=>withTenant(ctx,db=>studioDetails(db,ctx,undefined,new URL('https://test.invalid/studio?order='+target))),(error:any)=>error.code==='NOT_FOUND');
   await withTenant(owner,db=>insertMany(db,'dispatch_assignments',[assignment]));
   const scoped=await withTenant(employee,db=>studioDetails(db,employee,undefined,new URL('https://test.invalid/studio?order='+target+'&q='+encodeURIComponent(marker))));assert(scoped.records.every((row:any)=>row.order_id===target));
   const all=await withTenant(employee,db=>studioDetails(db,employee,undefined,new URL('https://test.invalid/studio?q='+encodeURIComponent(marker))));assert(all.records.every((row:any)=>row.order_id===target));assert(!all.lookups.orders.some((row:any)=>row.id===other));
  }finally{await withTenant(owner,async db=>{await db.query('DELETE FROM dispatch_assignments WHERE id=$1',[assignment.id]);await db.query('DELETE FROM planning_projects WHERE id=ANY($1::uuid[])',[plans.map(row=>row.id)]);await db.query('DELETE FROM orders WHERE id=ANY($1::uuid[])',[orders.map(row=>row.id)]);await db.query('DELETE FROM parties WHERE id=$1',[customer]);});invalidateReads(owner);}
 });
 await test('Context lookup includes selected older references without admitting unavailable IDs or replacing a saved relationship',async()=>{
  const marker=randomUUID(),customer=randomUUID(),inactive=randomUUID(),inquiry=randomUUID();
  const parties=[{...baseData(owner),id:customer,name:'ZZZ Synthetic context '+marker,is_customer:true,status:'active',active:true},...Array.from({length:45},(_,i)=>({...baseData(owner),id:randomUUID(),name:'AAA Synthetic context '+marker+' '+i,is_customer:true,status:'active',active:true})),{...baseData(owner),id:inactive,name:'ZZZ Synthetic unavailable '+marker,is_customer:true,status:'inactive',active:false}];
  await withTenant(owner,async db=>{await insertMany(db,'parties',parties);await insertMany(db,'inquiries',[{...baseData(owner),id:inquiry,title:'Synthetic context inquiry '+marker,customer_id:customer,status:'new'}]);});
  try{
   const page=await loadPage(owner,'inquiries',new URL('https://test.invalid/inquiries?create=1&customer_id='+customer));assert.equal(page.lookups.customers[0].id,customer);assert(page.lookups.customers.length<=41);
   const unknown=randomUUID(),missing=await loadPage(owner,'inquiries',new URL('https://test.invalid/inquiries?create=1&customer_id='+unknown));assert(!missing.lookups.customers.some((row:any)=>row.id===unknown));
   const unavailable=await loadPage(owner,'inquiries',new URL('https://test.invalid/inquiries?create=1&customer_id='+inactive));assert(!unavailable.lookups.customers.some((row:any)=>row.id===inactive));
   const saved=await loadPage(owner,'inquiries/'+inquiry,new URL('https://test.invalid/inquiries/'+inquiry+'?customer_id='+parties[1].id));assert.equal(saved.detail.customer_id,customer);assert.equal(saved.lookups.customers[0].id,customer);
  }finally{await withTenant(owner,async db=>{await db.query('DELETE FROM inquiries WHERE id=$1',[inquiry]);await db.query('DELETE FROM parties WHERE id=ANY($1::uuid[])',[parties.map(row=>row.id)]);});invalidateReads(owner);}
 });
}
