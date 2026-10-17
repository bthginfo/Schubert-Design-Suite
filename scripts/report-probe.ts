import {config} from 'dotenv';
config({quiet:true});config({path:'.env.testing.local',quiet:true});
import {randomUUID} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {withTenant,closePools} from '@schubert/db';
import {rolePermissions} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
import {reportDetails} from '../packages/application/src/report-data.js';
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV==='production'||!process.env.TEST_TENANT_ID||!process.env.TEST_LEGAL_ENTITY_ID)throw new Error('Isolated development report probe only.');
const ctx:ActorContext={tenantId:process.env.TEST_TENANT_ID,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID,actorId:process.env.TEST_OWNER_ID!,employeeId:process.env.TEST_OWNER_EMPLOYEE_ID||null,role:'Owner',permissions:rolePermissions.Owner,permissionVersion:1,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID()};
try{
 for(const [from,to] of [['2026-10-01','2026-10-31'],['2026-10-16','2026-10-17'],['2026-10-01','2026-10-16']]){
  const result=await withTenant(ctx,db=>reportDetails(db,ctx,new URL('https://qa.invalid/reports?'+new URLSearchParams({from,to}))));
  assert.equal(result.context.from,from);assert.equal(result.context.to,to);assert.equal(result.context.financial,true);if(to==='2026-10-16'){assert.equal(result.metrics.ordered_net,'0.00');assert.equal(result.metrics.received_payments,'0.00');}
  assert.ok(result.series.every((row:any)=>row.month>='2026-10'&&row.month<='2026-10'));
  assert.ok(result.aging.every((row:any)=>new URL(row.href,'https://qa.invalid').searchParams.get('currency')===row.currency));
  console.log(JSON.stringify({range:{from,to},orders:result.order_costs.length,monthlyRows:result.series.length,agingGroups:result.aging.length,capacityRows:result.capacity.length,materialRows:result.material_forecast.length,liquidityRows:result.liquidity.length,metrics:result.metrics}));
 }
 const operationalCtx={...ctx,role:'Dispatcher',permissions:rolePermissions.Dispatcher};
 const result=await withTenant(operationalCtx,db=>reportDetails(db,operationalCtx,new URL('https://qa.invalid/reports?from=2026-10-01&to=2026-10-31')));
 assert.equal(result.context.financial,false);for(const key of ['order_costs','series','aging','liquidity','open_items','open_totals','unallocated_payments'])assert.equal(result[key].length,0);
 assert.deepEqual(result.metrics,{});assert.ok(!/"(?:open_amount|budget_net|opening_balance|cost_total)":/.test(JSON.stringify(result)));
 console.log('Operative report scope: no financial payload.');
}finally{await closePools();}
