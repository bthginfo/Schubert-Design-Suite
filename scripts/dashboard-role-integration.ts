import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {baseData, executeCommand, exportRecords, loadPage} from '@schubert/application';
import {insert, one, withTenant} from '@schubert/db';
import {moduleBySlug,workspaces,type ActorContext} from '@schubert/contracts';
import {rolePermissions} from '@schubert/domain';

export async function dashboardRoleIntegration(actor:(role:string)=>ActorContext, test:(label:string, run:()=>Promise<void>)=>Promise<void>) {
  for(const role of Object.keys(rolePermissions).filter(role=>role!=='Portal')){
    await test(role+' can load every permitted workspace and navigation target',async()=>{
      const ctx=actor(role);
      const has=(permission:string)=>ctx.permissions.includes(permission)||ctx.permissions.includes(permission+'.read');
      const load=(slug:string)=>loadPage(ctx,slug,new URL('https://test.invalid/'+slug));
      const home=await load('');
      const routes=new Set<string>(['account','help',...home.navigation.map((item:{slug:string})=>item.slug)]);
      if(has('planning'))routes.add('studio');
      if(has('reports'))routes.add('reports');
      if(has('time'))routes.add('time');
      if(has('admin')||has('admin.technical'))routes.add('settings');
      for(const [slug,area] of Object.entries(workspaces)){
        if(area.cards.some(card=>has(moduleBySlug(card.slug)!.permission)))routes.add(slug);
      }
      for(const slug of routes){
        const result=await load(slug);
        assert(result.connected&&!result.error,role+' /'+slug);
      }
    });
  }
  const owner=actor('Owner');
  const page=(ctx:ActorContext,slug:string)=>loadPage(ctx,slug,new URL('https://test.invalid/'+slug+'?check='+randomUUID()));
  await test('Dispatch sees operational orders while a cancelled assignment drops out of employee orders, agenda and search',async()=>{
    const employee=actor('Employee'), dispatcher=actor('Dispatcher');
    const label='TEST Rollenprüfung '+randomUUID();
    const customer=await executeCommand(owner,{name:'crm.customer.create',idempotencyKey:randomUUID(),payload:{name:label}});
    const order=await executeCommand(owner,{name:'sales.order.create',idempotencyKey:randomUUID(),payload:{title:label,customer_id:customer.id,currency:'EUR'}});
    await withTenant(owner,db=>insert(db,'dispatch_assignments',{...baseData(owner),employee_id:employee.employeeId,order_id:order.id,title:label,status:'cancelled',starts_at:new Date(),ends_at:new Date(Date.now()+3600000)}));
    const home=await page(dispatcher,'');
    assert(home.related.orders.some((row:any)=>row.id===order.id));
    const ownHome=await page(employee,'');
    assert(!ownHome.related.orders.some((row:any)=>row.id===order.id));
    assert(!ownHome.related.dispatch_assignments.some((row:any)=>row.order_id===order.id));
    const orders=await loadPage(employee,'orders',new URL('https://test.invalid/orders?q='+encodeURIComponent(label)));
    assert(!orders.records.some((row:any)=>row.id===order.id));
    const filter=new URL('https://test.invalid/orders?q='+encodeURIComponent(label));
    assert((await exportRecords(dispatcher,'orders',filter)).some(row=>row.id===order.id));
    assert(!(await exportRecords(employee,'orders',filter)).some(row=>row.id===order.id));
    await assert.rejects(()=>page(employee,'orders/'+order.id),(error:any)=>error.status===404);
  });
  await test('Technical administration has no personal time view or task rows and purchasing counts actual suppliers',async()=>{
    const tech=actor('TechAdmin'), home=await page(tech,'');
    assert.deepEqual(home.related.tasks,[]);
    assert.equal(home.summary.openTasks,0);
    assert.equal(home.summary.timeSession,null);
    await assert.rejects(()=>page(tech,'time'),(error:any)=>error.status===403);
    const hub=await page(owner,'purchasing');
    const expected=await withTenant(owner,db=>one<{n:number}>(db,'SELECT count(*)::int n FROM parties WHERE is_supplier AND (legal_entity_id=$1 OR legal_entity_id IS NULL)',[owner.legalEntityId]));
    assert.equal(hub.summary.workspace.cards.find((card:any)=>card.slug==='suppliers').total,expected!.n);
  });
}
