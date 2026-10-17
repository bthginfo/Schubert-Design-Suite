import {config} from 'dotenv';config({quiet:true});config({path:'.env.testing.local',quiet:true});
import {randomUUID} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {withTenant,one,closePools} from '@schubert/db';
import {rolePermissions} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
import {hash} from '../packages/application/src/core.js';
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV==='production'||!process.env.TEST_TENANT_ID||!process.env.TEST_LEGAL_ENTITY_ID||!process.env.TEST_OWNER_ID)throw new Error('Only isolated development QA is allowed.');
const ctx:ActorContext={tenantId:process.env.TEST_TENANT_ID,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID,actorId:process.env.TEST_OWNER_ID,employeeId:null,role:'Owner',permissions:rolePermissions.Owner,permissionVersion:1,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID()};
try{await withTenant(ctx,async db=>{
 const legal=await one<any>(db,'SELECT name FROM legal_entities WHERE id=$1',[ctx.legalEntityId]);assert.ok(legal?.name?.startsWith('Testbetrieb'));
 const row=await one<any>(db,"SELECT s.id,s.snapshot,s.content_hash,s.document_id,j.id job_id,j.status export_status,j.last_error FROM report_snapshots s LEFT JOIN job_runs j ON j.job_type='reports.export' AND j.payload->>'reportId'=s.id::text ORDER BY s.created_at DESC LIMIT 1");
 assert.ok(row);assert.equal(row.content_hash,hash(row.snapshot),'Stored JSON bytes must preserve the frozen logical hash.');
 console.log(JSON.stringify({reportId:row.id,financial:row.snapshot.context.financial,exportJobId:row.job_id,status:row.export_status,documentId:row.document_id||null,hashVerified:true,error:row.last_error||null}));
});}finally{await closePools();}
