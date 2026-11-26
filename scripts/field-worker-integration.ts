import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {baseData, executeCommand, loadPage} from '@schubert/application';
import {insert, withTenant} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';

/** Field roles: own day on the overview, worker view of an assigned order and order preselection for time. */
export async function fieldWorkerIntegration(actor:(role:string)=>ActorContext, test:(label:string, run:()=>Promise<void>)=>Promise<void>) {
  const owner=actor('Owner'), employee=actor('Employee');
  const run=(ctx:ActorContext,name:string,payload:Record<string,unknown>)=>executeCommand(ctx,{name,idempotencyKey:randomUUID(),payload});
  const page=(ctx:ActorContext,path:string)=>{const url=new URL('https://test.invalid/'+path);url.searchParams.set('check',randomUUID());return loadPage(ctx,url.pathname.slice(1),url);};
  await test('Field roles see only their own open work packages, their order site and may preselect only assigned orders for time',async()=>{
    const label='TEST Feldansicht '+randomUUID().slice(0,8);
    const customer=await run(owner,'crm.customer.create',{name:label+' Kunde',phone:'089 555 0199',street:'Kundenweg 3',postal_code:'85435',city:'Erding'});
    const site=await run(owner,'projects.site.create',{name:label+' Bad',customer_id:customer.id,street:'Baustellenweg 7',postal_code:'85354',city:'Freising'});
    const assigned=await run(owner,'sales.order.create',{title:label+' zugeteilt',customer_id:customer.id,site_id:site.id,currency:'EUR'});
    const foreign=await run(owner,'sales.order.create',{title:label+' fremd',customer_id:customer.id,currency:'EUR'});
    const assignment=await withTenant(owner,db=>insert(db,'dispatch_assignments',{...baseData(owner),employee_id:employee.employeeId,order_id:assigned.id,title:label+' Einsatz',status:'confirmed',starts_at:new Date(Date.now()+86_400_000),ends_at:new Date(Date.now()+90_000_000),location:'Treffpunkt Hof'}));
    const pkg=(name:string,order:string,assigned_to?:string|null)=>run(owner,'projects.package.create',{name:label+' '+name,order_id:order,kind:'assembly',unit:'h',...(assigned_to?{assigned_to}:{})});
    const mine=await pkg('eigen',assigned.id,employee.employeeId);
    const open=await pkg('offen',assigned.id);
    const colleague=await pkg('Kollege',assigned.id,owner.employeeId);
    const elsewhere=await pkg('fremder Auftrag',foreign.id);
    try{
      const home=await page(employee,'');
      const visible=home.related.work_packages.map((row:any)=>row.id);
      assert(visible.includes(mine.id)&&visible.includes(open.id),'own and unassigned packages of assigned orders are listed');
      assert(!visible.includes(colleague.id),'a colleague\'s package stays off the field overview');
      assert(!visible.includes(elsewhere.id),'packages of unassigned orders stay off the field overview');
      assert(home.related.work_packages.find((row:any)=>row.id===mine.id).mine===true);
      assert(visible.indexOf(mine.id)<visible.indexOf(open.id),'own packages come first');
      assert.deepEqual((await page(owner,'')).related.work_packages,[],'office roles keep their office overview');

      const detail=await page(employee,'orders/'+assigned.id);
      const brief=detail.summary.fieldOrder;
      assert.equal(brief.customer_name,label+' Kunde');
      assert.equal(brief.customer_phone,'089 555 0199');
      assert.equal(brief.site_address,'Baustellenweg 7, 85354 Freising');
      assert.equal(brief.customer_address,'Kundenweg 3, 85435 Erding');
      assert.deepEqual(brief.assignments.map((row:any)=>row.id),[assignment.id]);
      assert.equal(brief.assignments[0].location,'Treffpunkt Hof');
      assert.equal((await page(owner,'orders/'+assigned.id)).summary.fieldOrder,undefined,'office roles keep the office order file');
      await assert.rejects(()=>page(employee,'orders/'+foreign.id),(error:any)=>error.status===404);

      const time=await page(employee,'time?order='+assigned.id);
      assert.equal(time.summary.preselectedOrder,assigned.id);
      assert(time.lookups.orders.some((row:any)=>row.id===assigned.id));
      const blocked=await page(employee,'time?order='+foreign.id);
      assert.equal(blocked.summary.preselectedOrder,undefined,'an unassigned order is never preselected');
      assert(!blocked.lookups.orders.some((row:any)=>row.id===foreign.id));
      assert.equal((await page(employee,'time?order=kein-auftrag')).summary.preselectedOrder,undefined);
    }finally{
      // Leave the synthetic employee's day as it was.
      await withTenant(owner,db=>db.query("UPDATE dispatch_assignments SET status='cancelled' WHERE id=$1",[assignment.id]));
    }
  });
}
