import 'dotenv/config';
import {config} from 'dotenv';config({path:'.env.testing.local',quiet:true});config({path:'.env.workers.local',quiet:true});
import {getPool,withTenant,rows,one,closePools} from '@schubert/db';
import {processPending} from '@schubert/application';
import {rolePermissions} from '@schubert/domain';
import {randomUUID} from 'node:crypto';
import type {ActorContext} from '@schubert/contracts';
if(process.env.APP_ENV==='production'||!process.env.TEST_TENANT_ID)throw new Error('Development test jobs only.');
process.env.DOCUMENT_WORKER_URL='https://schubert-suite-files.vercel.app';
const type=process.argv[2];if(!['business.pdf','document.preview','document.ingest','document.extract','migration.stage','migration.drive.extract'].includes(type))throw new Error('Explicit bounded test job type required.');
const member=(await getPool().query('SELECT lookup_request_context($1,NULL) context',[process.env.TEST_OWNER_ID])).rows[0].context;
const ctx:ActorContext={tenantId:member.tenant_id,legalEntityId:member.legal_entity_id,actorId:member.user_id,employeeId:member.employee_id,role:member.role,permissions:[...rolePermissions[member.role],...member.permissions],permissionVersion:member.permission_version,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID()};
try{const jobs=await withTenant(ctx,db=>rows<any>(db,"SELECT id FROM job_runs WHERE job_type=$1 AND status IN('pending','retry') AND next_attempt_at<=now() ORDER BY created_at LIMIT 5",[type]));for(const job of jobs){await processPending(ctx,1,job.id);console.log(JSON.stringify(await withTenant(ctx,db=>one<any>(db,'SELECT id,status,result,last_error FROM job_runs WHERE id=$1',[job.id]))));}}finally{await closePools();}
