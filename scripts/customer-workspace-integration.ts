import {customerWorkspace} from '../packages/application/src/customer-workspace.js';
import {workspaceOverview} from '../packages/application/src/workspaces.js';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {ActorContext,CustomerWorkspaceSection} from '@schubert/contracts';
import {executeCommand,loadPage,invalidateReads,baseData} from '@schubert/application';
import {insert,withTenant} from '@schubert/db';
import {referenceSearch} from '../packages/application/src/reference-search.js';
import {assistantInputSchema,prepareAssistantContext} from '../packages/application/src/assistant-context.js';

export async function customerWorkspaceIntegration(actor:(role:string)=>ActorContext,test:(label:string,run:()=>Promise<void>)=>Promise<void>){
  const owner=actor('Owner'),office=actor('Office'),planner=actor('Planner'),employee=actor('Employee');
  const call=(name:string,payload:Record<string,unknown>)=>executeCommand(owner,{name,payload,idempotencyKey:randomUUID()});
  const page=(ctx:ActorContext,path:string,query='')=>loadPage(ctx,path,new URL('https://test.invalid/'+path+query));
  const customer=await call('crm.customer.create',{name:'TEST · Kundenarbeitsbereich '+randomUUID()}),other=await call('crm.customer.create',{name:'TEST · Anderer Kundenarbeitsbereich '+randomUUID()});
  const order=await call('sales.order.create',{title:'TEST · Zugeordneter Auftrag',customer_id:customer.id,currency:'EUR'}),foreign=await call('sales.order.create',{title:'TEST · Fremder Auftrag',customer_id:other.id,currency:'EUR'});
  await test('Customer tiles count all records, bound their preview and preserve customer/entity/permission scope',async()=>{
    for(let n=0;n<11;n++)await call('crm.inquiry.create',{title:'TEST · Anfrage '+n,customer_id:customer.id});
    await call('crm.inquiry.create',{title:'TEST · Andere Anfrage',customer_id:other.id});invalidateReads(owner);
    const detail=await page(owner,'customers/'+customer.id),sections:CustomerWorkspaceSection[]=detail.summary.customerWorkspace.sections;
    const inquiries=sections.find(s=>s.key==='inquiries')!;assert.equal(inquiries.total,11);assert.equal(inquiries.items.length,8);assert.equal(sections.find(s=>s.key==='orders')!.total,1);
    const list=await page(owner,'orders','?customer_id='+customer.id);assert.deepEqual(list.records.map((r:any)=>r.id),[order.id]);
    await assert.rejects(()=>page(owner,'orders','?customer_id=invalid'),(e:any)=>e.code==='FILTER_PARTY');
    await assert.rejects(()=>page({...owner,legalEntityId:randomUUID()},'customers/'+customer.id),(e:any)=>e.code==='NOT_FOUND');
    await assert.rejects(()=>page({...owner,legalEntityId:randomUUID()},'orders','?customer_id='+customer.id),(e:any)=>e.code==='NOT_FOUND');
    await assert.rejects(()=>page(employee,'customers/'+customer.id),(e:any)=>e.code==='FORBIDDEN');
    const limited={...owner,permissions:['crm']};const withoutSales=await withTenant(limited,db=>customerWorkspace(db,limited,customer.id));assert.deepEqual(withoutSales.sections.map(s=>s.key),['inquiries']);
  });
  await test('Customer planning requires real matching references and filters both projects and searchable assignment options',async()=>{
    await assert.rejects(()=>call('planning.project.create',{kind:'memorial',name:'TEST · Missing relationship',customer_id:customer.id}),(e:any)=>e.code==='PROJECT_CUSTOMER_SCOPE');
    await assert.rejects(()=>call('planning.project.create',{kind:'memorial',name:'TEST · Wrong relationship',customer_id:customer.id,order_id:foreign.id}),(e:any)=>e.code==='PROJECT_CUSTOMER_SCOPE');
    const own=await call('planning.project.create',{kind:'memorial',name:'TEST · Kundengebundener Plan',customer_id:customer.id,order_id:order.id});
    await call('planning.project.create',{kind:'room_plan',name:'TEST · Fremder Plan',customer_id:other.id,order_id:foreign.id});invalidateReads(owner);invalidateReads(planner);
    const studio=await page(planner,'studio','?customer_id='+customer.id);assert.deepEqual(studio.records.map((r:any)=>r.id),[own.project.id]);assert.equal(studio.summary.projectCustomerName,customer.name);assert(studio.related.orders.every((r:any)=>r.id===order.id));
    const choices=await referenceSearch(planner,'orders',{parentId:customer.id});assert(choices.some((r:any)=>r.id===order.id));assert(!choices.some((r:any)=>r.id===foreign.id));
    const detail=await page(owner,'customers/'+customer.id);assert.equal(detail.summary.customerWorkspace.sections.find((s:any)=>s.key==='studio').total,1);
    const delegated={...employee,permissions:[...employee.permissions,'crm','planning']};const narrow=await withTenant(delegated,db=>customerWorkspace(db,delegated,customer.id));
    assert.equal(narrow.sections.find(s=>s.key==='studio')!.total,0);assert.equal(narrow.sections.find(s=>s.key==='orders')!.total,0);

  });
  await test('Customer document counts and lists include its order originals without disclosing unrelated or personnel files',async()=>{
    const docs=await withTenant(owner,async db=>{
      const add=(entity_type:string,entity_id:string,name:string)=>insert(db,'documents',{...baseData(owner),name,entity_type,entity_id,status:'draft',visibility:'internal',original_name:name+'.txt',mime_type:'text/plain',size_bytes:0,content_hash:'0'.repeat(64)});
      const direct=await add('customers',customer.id,'TEST · Kundenunterlage'),linked=await add('orders',order.id,'TEST · Auftragsunterlage'),unrelated=await add('customers',other.id,'TEST · Andere Unterlage'),hr=await add('employee',owner.employeeId!,'TEST · Personalunterlage');
      await insert(db,'document_links',{...baseData(owner),document_id:hr.id,entity_type:'customers',entity_id:customer.id});return {direct,linked,unrelated,hr};
    });invalidateReads(office);
    const detail=await page(office,'customers/'+customer.id),section=detail.summary.customerWorkspace.sections.find((s:any)=>s.key==='documents');assert.equal(section.total,2);
    const list=await page(office,'documents','?customer_id='+customer.id);assert.deepEqual(new Set(list.records.map((r:any)=>r.id)),new Set([docs.direct.id,docs.linked.id]));
    assert(!list.records.some((r:any)=>[docs.unrelated.id,docs.hr.id].includes(r.id)));
  });
  await test('Task hubs expose only permitted modules and do not turn office navigation into a finance grant',async()=>{
    const hub=await page(office,'office');assert.equal(hub.view,'workspace');assert.deepEqual(hub.summary.workspace.cards.map((c:any)=>c.slug),['quotes','invoices']);
    const stock=await page(employee,'purchasing').catch(()=>null);assert.equal(stock,null);
    await assert.rejects(()=>page(employee,'office'),(e:any)=>e.code==='FORBIDDEN');
    const limited={...owner,permissions:['inventory']};const restricted=await withTenant(limited,db=>workspaceOverview(db,limited,'purchasing'));assert.deepEqual(restricted.cards.map(c=>c.slug),['stock','inventory']);
  });
  await test('Customer and office assistant context follows the visible area and retains its permission boundary',async()=>{
    const input=assistantInputSchema.parse({message:'Welcher nächste Schritt ist sinnvoll?',context:{path:'customers/'+customer.id,search:'?bereich=orders'}});
    const prepared=await prepareAssistantContext(office,input,'https://test.invalid');assert.equal(prepared.context.record.id,customer.id);assert.equal(prepared.context.customerWorkspace.area,'orders');
    assert.deepEqual(prepared.context.customerWorkspace.recentRecords.map((r:any)=>r.id),[order.id]);assert(!JSON.stringify(prepared.context).includes(foreign.id));
    const workspace=await prepareAssistantContext(office,assistantInputSchema.parse({message:'Wo finde ich meine Angebote?',context:{path:'office'}}),'https://test.invalid');
    assert(workspace.context.allowedCommands.includes('sales.quote.create'));assert(!workspace.context.allowedCommands.includes('billing.payment.create'));assert.deepEqual(workspace.context.tasks.map((task:any)=>task.href),['/quotes','/invoices']);
  });
}
