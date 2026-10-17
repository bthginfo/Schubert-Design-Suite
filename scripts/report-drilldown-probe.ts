import {config} from 'dotenv';
config({quiet:true});config({path:'.env.testing.local',quiet:true});
import {randomUUID} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {withTenant,one,closePools} from '@schubert/db';
import {modules,type ActorContext} from '@schubert/contracts';
import {rolePermissions} from '@schubert/domain';
import {filteredWhere} from '../packages/application/src/read-filters.js';
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV==='production'||!process.env.TEST_TENANT_ID||!process.env.TEST_LEGAL_ENTITY_ID||!process.env.TEST_OWNER_ID)throw new Error('Only isolated development QA is allowed.');
const ctx:ActorContext={tenantId:process.env.TEST_TENANT_ID,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID,actorId:process.env.TEST_OWNER_ID,employeeId:null,role:'Owner',permissions:rolePermissions.Owner,permissionVersion:1,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID()};
try{await withTenant(ctx,async db=>{
 const legal=await one<any>(db,'SELECT name FROM legal_entities WHERE id=$1',[ctx.legalEntityId]);assert.ok(legal?.name?.startsWith('Testbetrieb'));
 for(const [metric,slug]of Object.entries({ordered_net:'orders',invoiced_net:'invoices',performance_value:'performance-valuations',received_payments:'payments'})){
  const module=modules.find(item=>item.slug===slug)!;assert.ok(module);
  for(const end of ['2026-10-16','2026-10-17'])for(const unit of ['', 'bath']){
   const url=new URL('https://qa.invalid/'+slug+'?'+new URLSearchParams({metric,from:'2026-10-01',to:end,currency:'EUR',...(unit?{business_unit:unit}:{})}));
   const params:any[]=[];const where=filteredWhere(module,url,params);
   const rows=(await db.query(`SELECT id FROM ${module.table} WHERE TRUE ${where}`,params)).rows;
   if(end==='2026-10-16'&&metric==='ordered_net')assert.equal(rows.length,0,'Later acceptance must not leak into the partial-month source list.');
   if(end==='2026-10-17'&&metric==='ordered_net'&&!unit)assert.ok(rows.length>=6);
   if(metric==='invoiced_net')for(const row of rows){const invoice=await one<any>(db,'SELECT kind,issued_at FROM invoices WHERE id=$1',[row.id]);assert.ok(invoice.issued_at);assert.ok(!['advance','progress'].includes(invoice.kind));}
   console.log(JSON.stringify({metric,through:end,business:unit||'all',sourceRows:rows.length}));
  }
 }
 const open=modules.find(item=>item.slug==='receivables')!,params:any[]=[];
 const rows=(await db.query(`SELECT id,open_amount FROM receivables WHERE TRUE ${filteredWhere(open,new URL('https://qa.invalid/receivables?status=open&currency=EUR&as_of=2026-10-17&bucket=31_60&disputed=false'),params)}`,params)).rows;
 assert.equal(rows.length,1);assert.equal(Number(rows[0].open_amount),1380);
 const syntheticQuery=async(slug:string,metric:string,fixture:string,from='2026-10-16',to='2026-10-17')=>{const module=modules.find(item=>item.slug===slug)!,values:any[]=[];const where=filteredWhere(module,new URL('https://qa.invalid/'+slug+'?'+new URLSearchParams({metric,from,to,currency:'EUR'})),values);return(await db.query(fixture+` SELECT id FROM ${module.table} WHERE TRUE ${where} ORDER BY id`,values)).rows.map(row=>row.id);};
 const invoices=await syntheticQuery('invoices','invoiced_net',`WITH invoices(id,kind,issued_at,currency)AS(VALUES('normal','normal','2026-10-16T22:30:00Z'::timestamptz,'EUR'),('advance','advance','2026-10-16T22:30:00Z'::timestamptz,'EUR'),('progress','progress','2026-10-16T22:30:00Z'::timestamptz,'EUR'),('later','normal','2026-10-17T22:30:00Z'::timestamptz,'EUR'),('draft','normal',NULL::timestamptz,'EUR'),('foreign','normal','2026-10-16T22:30:00Z'::timestamptz,'USD'))`);
 assert.deepEqual(invoices,['normal'],'Berlin issue date, actual issue, revenue kind and currency must match the chart.');
 const base=`orders(id,created_at,status,business_unit,currency)AS(VALUES('old','2026-09-01'::timestamptz,'confirmed','stone','EUR'),('later','2026-09-01'::timestamptz,'confirmed','stone','EUR'),('legacy','2026-09-01'::timestamptz,'confirmed','stone','EUR')),quote_acceptances(order_id,status,accepted_at)AS(VALUES('old','accepted','2026-09-10'::timestamptz),('later','accepted','2026-10-18'::timestamptz)),order_confirmations(order_id,status,created_at)AS(SELECT NULL::text,NULL::text,NULL::timestamptz WHERE FALSE)`;
 const ordered=await syntheticQuery('orders','ordered_net',`WITH ${base},change_orders(id,order_id,status,accepted_at)AS(VALUES('change','old','accepted','2026-10-17'::timestamptz)),audit_events(aggregate_id,action,created_at)AS(SELECT NULL::text,NULL::text,NULL::timestamptz WHERE FALSE)`);
 assert.deepEqual(ordered,['old'],'An actual new change must appear even if the original order was created and accepted in an earlier month.');
 const valuations=await syntheticQuery('performance-valuations','performance_value',`WITH ${base},performance_valuations(id,order_id,status,effective_on,created_at,currency)AS(VALUES('older','old','approved','2026-09-15'::date,'2026-09-16'::timestamptz,'EUR'),('latest','old','approved','2026-10-01'::date,'2026-10-02'::timestamptz,'EUR'),('unreviewed','old','draft','2026-10-15'::date,'2026-10-15'::timestamptz,'EUR'),('future','old','approved','2026-10-18'::date,'2026-10-18'::timestamptz,'EUR'),('future-order','later','approved','2026-10-01'::date,'2026-10-02'::timestamptz,'EUR'))`);
 assert.deepEqual(valuations,['latest'],'Cumulative performance must include the latest approved earlier-date valuation and exclude a later accepted order.');
 console.log('Actual PostgreSQL synthetic boundary queries passed: Berlin midnight, revenue states, historical order/change event and cumulative reviewed valuation. No fixture rows were written.');
 console.log('Real Neon source filters preserve metric dates, states, currency, business units and the exact open-item aging group.');
});}finally{await closePools();}
