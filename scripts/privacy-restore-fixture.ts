import 'dotenv/config';
import {config,parse} from 'dotenv';config({path:'.env.testing.local',quiet:true});
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {withTenant,one,insert,getPool,closePools} from '@schubert/db';
import {executeCommand,processPending,generatedDocument,baseData} from '@schubert/application';
import {rolePermissions} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
if(process.env.APP_ENV==='production'||!process.env.TEST_TENANT_ID)throw new Error('Synthetic recovery fixture only.');
const secret=parse(await readFile('.env.backup.local'));Object.assign(process.env,{BACKUP_VAULT_URL:'http://127.0.0.1:8085',BACKUP_TRIGGER_SECRET:secret.BACKUP_TRIGGER_SECRET,BACKUP_SIGN_PUBLIC_KEY:secret.BACKUP_SIGN_PUBLIC_KEY});
const member=(await getPool().query('SELECT lookup_request_context($1,NULL) context',[process.env.TEST_OWNER_ID])).rows[0].context;
const ctx:ActorContext={tenantId:member.tenant_id,legalEntityId:member.legal_entity_id,actorId:member.user_id,employeeId:member.employee_id,role:member.role,permissions:[...rolePermissions[member.role],...member.permissions],permissionVersion:member.permission_version,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID(),reauthenticatedAt:new Date()};
const cmd=(name:string,payload:any={},record?:any)=>executeCommand(ctx,{name,payload,id:record?.id,expectedVersion:record?.version,idempotencyKey:randomUUID()}),path='../../work/privacy-restore-fixture.json';
try{
 if(process.argv[2]==='prepare'){
  const bytes=Buffer.from('Synthetic identity-scoped erasure recovery '+randomUUID()),doc=await generatedDocument(ctx,bytes,'Synthetischer Restore-Nachweis.txt','text/plain','test',randomUUID());
  const source=await withTenant(ctx,db=>one<any>(db,'SELECT v.blob_object_id,b.storage_key FROM document_versions v JOIN blob_objects b ON b.id=v.blob_object_id WHERE v.id=$1',[doc.current_version_id]));
  const other=await withTenant(ctx,async db=>{const d=await insert(db,'documents',{...baseData(ctx),name:'Unabhängige erlaubte Akte',original_name:'erlaubt.txt',mime_type:'text/plain',size_bytes:bytes.length,content_hash:doc.content_hash,visibility:'internal',status:'available'}),v=await insert(db,'document_versions',{...baseData(ctx),document_id:d.id,blob_object_id:source.blob_object_id,content_hash:doc.content_hash,revision:1,status:'available'});await db.query('UPDATE documents SET current_version_id=$1 WHERE id=$2',[v.id,d.id]);await insert(db,'document_extractions',{...baseData(ctx),document_version_id:doc.current_version_id,field_name:'__page_text_00000',value:'Synthetic erased OCR personal information',source_locator:'test:restore-privacy',parser_version:'synthetic-test/1',source_kind:'search_text',status:'extracted'});return d;});
  await writeFile(path,JSON.stringify({tenantId:ctx.tenantId,erasedId:doc.id,survivingId:other.id,storageKey:source.storage_key,contentHash:doc.content_hash,preparedAt:new Date().toISOString()},null,2));console.log('Prepared two separately authorized synthetic document identities sharing exact bytes.');
 }else if(process.argv[2]==='erase'){
  const fixture=JSON.parse(await readFile(path,'utf8'));assert.equal(fixture.tenantId,ctx.tenantId);const request=await cmd('privacy.erasure.request',{document_id:fixture.erasedId,reason:'Synthetischer Nachweis: älteres Backup darf eine später entfernte Akte nicht wiederherstellen.'});await cmd('privacy.erasure.approve',{},request);const job=await withTenant(ctx,db=>one<any>(db,"SELECT id FROM job_runs WHERE job_type='privacy.erase' AND payload->>'deletionJobId'=$1 ORDER BY created_at DESC LIMIT 1",[request.id]));await processPending(ctx,1,job.id);const actual=await withTenant(ctx,db=>one<any>(db,'SELECT status,result,last_error FROM job_runs WHERE id=$1',[job.id]));assert.equal(actual.status,'completed',actual.last_error);assert.equal(actual.result.sharedFilesPreserved,1);await writeFile(path,JSON.stringify({...fixture,erasedAt:new Date().toISOString(),deletionJobId:request.id},null,2));console.log('Erased first identity after backup; separate permitted identity and shared bytes remain.');
 }else throw new Error('Choose prepare or erase.');
}finally{await closePools();}
