import {config} from 'dotenv';
config({quiet:true});config({path:'.env.testing.local',quiet:true});
import {randomUUID} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {withTenant,one,closePools} from '@schubert/db';
import {rolePermissions} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
import {referenceSearch} from '../packages/application/src/reference-search.js';
import {salesPriceSchema} from '../packages/application/src/sales-prices.js';
import {hash} from '../packages/application/src/core.js';
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV==='production'||!process.env.TEST_TENANT_ID||!process.env.TEST_LEGAL_ENTITY_ID||!process.env.TEST_OWNER_ID)throw new Error('Only the isolated development QA tenant is allowed.');
const ctx:ActorContext={tenantId:process.env.TEST_TENANT_ID,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID,actorId:process.env.TEST_OWNER_ID,employeeId:null,role:'Owner',permissions:rolePermissions.Owner,permissionVersion:1,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID()};
try{await withTenant(ctx,async db=>{
 const legal=await one<any>(db,'SELECT name FROM legal_entities WHERE id=$1',[ctx.legalEntityId]);assert.ok(legal?.name?.startsWith('Testbetrieb'),'A real business may never be used for this probe.');
 const priceId='8d330aeb-75f9-499f-b870-2715d877afff',quoteId='cc936108-95c0-43de-bc8d-a3b780140c79';
 const price=await one<any>(db,'SELECT * FROM sales_price_versions WHERE id=$1',[priceId]);assert.equal(price?.status,'approved');assert.ok(price.approved_at&&price.content_hash);
 const line=await one<any>(db,'SELECT * FROM quote_lines WHERE parent_id=$1 AND position=1',[quoteId]);assert.equal(line.price_version_id,priceId);assert.equal(Number(line.unit_price),25);assert.equal(line.unit,'h');assert.equal(Number(line.tax_rate),19);assert.ok(line.price_applied_at);
 const quote=await one<any>(db,'SELECT net_total,tax_total,gross_total FROM quotes WHERE id=$1',[quoteId]);assert.equal(Number(quote.net_total),50);assert.equal(Number(quote.tax_total),9.5);assert.equal(Number(quote.gross_total),59.5);
 await db.query('SAVEPOINT frozen_price_check');let blocked=false;try{await db.query('UPDATE sales_price_versions SET amount=amount+1 WHERE id=$1',[priceId]);}catch(cause:any){blocked=cause.code==='P0001'&&String(cause.message).includes('reviewed_sales_price_immutable');}finally{await db.query('ROLLBACK TO SAVEPOINT frozen_price_check');}
 assert.ok(blocked,'The database itself must prevent edits of reviewed prices.');assert.equal(Number((await one<any>(db,'SELECT amount FROM sales_price_versions WHERE id=$1',[priceId])).amount),250);
 const next=await one<any>(db,'SELECT * FROM sales_price_versions WHERE id=$1',['c7f112a6-e5d2-4284-8044-2e396dbe051f']);assert.equal(next.status,'approved');assert.equal(Number(next.amount),300);assert.equal(next.previous_version_id,priceId);assert.equal(next.valid_from,'2026-10-17');assert.equal(next.content_hash,hash({data:salesPriceSchema.parse(next),revision:next.revision,previousVersionId:priceId}));
 console.log('Actual browser-created prices and quote: basis conversion, tax, actual application time, correct calendar dates, frozen hashes and database immutability verified.');
});const available:any[]=await referenceSearch(ctx,'sales-prices',{parentId:'647ccdb2-2002-4de9-a6ee-41b34f4562a2'});assert.equal(available.length,1);assert.equal(available[0].id,'c7f112a6-e5d2-4284-8044-2e396dbe051f');console.log('Current lookup offers only the reviewed successor; the existing quote retains its original price.');}finally{await closePools();}
