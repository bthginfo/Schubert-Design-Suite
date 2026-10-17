import {config} from 'dotenv';config({quiet:true});config({path:'.env.testing.local',quiet:true});
import {randomUUID} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {withTenant,one,closePools} from '@schubert/db';
import {rolePermissions} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV==='production'||!process.env.TEST_TENANT_ID||!process.env.TEST_LEGAL_ENTITY_ID||!process.env.TEST_OWNER_ID)throw new Error('Only isolated development QA is allowed.');
const ctx:ActorContext={tenantId:process.env.TEST_TENANT_ID,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID,actorId:process.env.TEST_OWNER_ID,employeeId:null,role:'Owner',permissions:rolePermissions.Owner,permissionVersion:1,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID()};
try{await withTenant(ctx,async db=>{
 const legal=await one<any>(db,'SELECT name FROM legal_entities WHERE id=$1',[ctx.legalEntityId]);assert.ok(legal?.name?.startsWith('Testbetrieb'));
 const doc=await one<any>(db,"SELECT d.id,d.status,(SELECT count(*) FROM processing_purposes p WHERE p.document_id=d.id AND p.closed_at IS NULL)::int active_purposes,(SELECT count(*) FROM legal_holds h WHERE h.document_id=d.id AND h.released_at IS NULL)::int active_holds FROM documents d WHERE id=$1",['94aac35e-76b2-4fc4-93e0-1b0540c7b609']);
 const jobs=(await db.query('SELECT id,version,status,decision FROM deletion_jobs WHERE document_id=$1 ORDER BY created_at DESC',[doc.id])).rows;
 console.log(JSON.stringify({document:doc,jobs:jobs.map(j=>({id:j.id,version:j.version,status:j.status,blockers:j.decision?.blockers,removedFiles:j.decision?.removedFiles,independentProof:!!j.decision?.independentProof}))}));
});}finally{await closePools();}
