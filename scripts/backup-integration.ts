import 'dotenv/config';
import {config,parse} from 'dotenv';config({path:'.env.testing.local',quiet:true});
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,verify} from 'node:crypto';
import assert from 'node:assert/strict';
import {withTenant,one,getPool,closePools} from '@schubert/db';
import {executeCommand,processPending} from '@schubert/application';
import {rolePermissions} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
if(process.env.APP_ENV==='production'||!process.env.TEST_TENANT_ID)throw new Error('Isolated development backup exercise only.');
const secret=parse(await readFile('.env.backup.local'));Object.assign(process.env,{BACKUP_VAULT_URL:'http://127.0.0.1:8085',BACKUP_TRIGGER_SECRET:secret.BACKUP_TRIGGER_SECRET,BACKUP_SIGN_PUBLIC_KEY:secret.BACKUP_SIGN_PUBLIC_KEY});
const member=(await getPool().query('SELECT lookup_request_context($1,NULL) context',[process.env.TEST_OWNER_ID])).rows[0]?.context;assert.equal(member?.tenant_id,process.env.TEST_TENANT_ID);
const ctx:ActorContext={tenantId:member.tenant_id,legalEntityId:member.legal_entity_id,actorId:member.user_id,employeeId:member.employee_id,role:member.role,permissions:[...rolePermissions[member.role],...member.permissions],permissionVersion:member.permission_version,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID(),reauthenticatedAt:new Date()};
try{
 const job=await executeCommand(ctx,{name:'system.backup.create',idempotencyKey:randomUUID(),payload:{}});
 // This test uses the real scheduled job; only the test tenant's wait is brought forward.
 await withTenant(ctx,db=>db.query("UPDATE job_runs SET next_attempt_at=now() WHERE id=$1 AND job_type='backup.create' AND status='pending'",[job.id]));
 await processPending(ctx,1,job.id);const actual=await withTenant(ctx,db=>one<any>(db,'SELECT status,result,last_error FROM job_runs WHERE id=$1',[job.id]));assert.equal(actual.status,'completed',actual.last_error);assert(actual.result.fileCount>0&&actual.result.tableCount>100&&actual.result.rowCount>0);
 await writeFile('../../work/backup-integration-result.json',JSON.stringify({jobId:job.id,tenantId:ctx.tenantId,legalEntityId:ctx.legalEntityId,...actual.result},null,2));
 console.log(JSON.stringify({jobId:job.id,status:actual.status,fileCount:actual.result.fileCount,tableCount:actual.result.tableCount,rowCount:actual.result.rowCount,snapshotAt:actual.result.snapshotAt,independentPrivateStorage:true}));
}finally{await closePools();}
