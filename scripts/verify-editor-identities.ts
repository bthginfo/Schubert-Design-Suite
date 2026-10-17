import {config} from 'dotenv';
config({quiet:true});config({path:'.env.testing.local',quiet:true});
import {randomUUID} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {withTenant,one,closePools} from '@schubert/db';
import {rolePermissions} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV==='production'||!process.env.TEST_TENANT_ID||!process.env.TEST_LEGAL_ENTITY_ID||!process.env.TEST_OWNER_ID)throw new Error('Only the isolated development QA tenant is allowed.');
const ctx:ActorContext={tenantId:process.env.TEST_TENANT_ID,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID,actorId:process.env.TEST_OWNER_ID,employeeId:null,role:'Owner',permissions:rolePermissions.Owner,permissionVersion:1,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID()};
const phase=process.argv[2],path='work/qa-editor-identities.json';
try{await withTenant(ctx,async db=>{
 const legal=await one<any>(db,'SELECT name FROM legal_entities WHERE id=$1',[ctx.legalEntityId]);assert.ok(legal?.name?.startsWith('Testbetrieb'));
 const rows=(await db.query('SELECT id,position,description,price_version_id,unit_price,price_applied_at FROM quote_lines WHERE parent_id=$1 ORDER BY position',['cc936108-95c0-43de-bc8d-a3b780140c79'])).rows;
 assert.equal(rows[0].price_version_id,'8d330aeb-75f9-499f-b870-2715d877afff');assert.equal(Number(rows[0].unit_price),25);assert.ok(rows[0].price_applied_at);
 if(phase==='initial'){assert.equal(rows.length,2);await mkdir('work',{recursive:true});await writeFile(path,JSON.stringify({originalId:rows[0].id,manualId:rows[1].id}));}
 else {const original=JSON.parse(await readFile(path,'utf8'));assert.equal(rows[0].id,original.originalId,'Existing line identity must survive all edits.');
  if(phase==='edited'){assert.equal(rows.length,2);assert.equal(rows[1].id,original.manualId,'The first autosave response must bind the new line before its next edit.');assert.ok(rows[1].description.includes('erneut bearbeitet'));}
  if(phase==='deleted'){assert.equal(rows.length,1);}
  if(phase==='restored'){assert.equal(rows.length,2);assert.notEqual(rows[1].id,original.manualId,'Restoring a removed manual line creates a new actual identity.');assert.ok(rows[1].description.includes('erneut bearbeitet'));}
 }
 console.log(`Editor phase ${phase}: actual database identities and immutable original selling-price provenance verified.`);
});}finally{await closePools();}
