import 'dotenv/config';
import {config}from'dotenv';config({path:'.env.testing.local',quiet:true});
import{loadPage}from'@schubert/application';import{getPool,closePools}from'@schubert/db';import{rolePermissions}from'@schubert/domain';import type{ActorContext}from'@schubert/contracts';
const user=process.env.TEST_OWNER_ID!;const m=(await getPool().query('SELECT lookup_request_context($1,NULL) context',[user])).rows[0].context;const ctx:ActorContext={tenantId:m.tenant_id,legalEntityId:m.legal_entity_id,actorId:user,employeeId:m.employee_id,role:m.role,permissions:[...rolePermissions[m.role],...m.permissions],permissionVersion:m.permission_version,actorType:'employee',identityAssurance:'individual_session',correlationId:'test-diagnostics'};
for(const path of process.argv.slice(2)){try{const data=await loadPage(ctx,path,new URL('http://localhost/'+path));console.log(JSON.stringify({path,view:data.view,records:data.records.length}));}catch(e:any){console.log(JSON.stringify({path,code:e.code,message:e.message,column:e.column,table:e.table}));}}
await closePools();
