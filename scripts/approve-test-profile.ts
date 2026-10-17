import 'dotenv/config';
import {config} from 'dotenv';config({path:'.env.testing.local',quiet:true});
import {getPool,withTenant,one,closePools} from '@schubert/db';
import {executeCommand} from '@schubert/application';
import {rolePermissions} from '@schubert/domain';
import type {ActorContext} from '@schubert/contracts';
import {randomUUID} from 'node:crypto';
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV==='production')throw new Error('Synthetic profile approval is forbidden in production.');
const user=process.env.TEST_OWNER_ID!;const m=(await getPool().query('SELECT lookup_request_context($1,NULL) context',[user])).rows[0]?.context;
if(!m||m.tenant_id!==process.env.TEST_TENANT_ID||m.legal_entity_id!==process.env.TEST_LEGAL_ENTITY_ID)throw new Error('Isolated fixture does not match.');
const ctx:ActorContext={tenantId:m.tenant_id,legalEntityId:m.legal_entity_id,actorId:user,employeeId:m.employee_id,role:m.role,permissions:[...rolePermissions[m.role],...m.permissions],permissionVersion:m.permission_version,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID(),reauthenticatedAt:new Date()};
try{const legal=await withTenant(ctx,db=>one<any>(db,'SELECT * FROM legal_entities WHERE id=$1',[ctx.legalEntityId]));if(!legal?.name.startsWith('Testbetrieb'))throw new Error('A real company profile may not be approved by a fixture.');await executeCommand(ctx,{name:'settings.update',expectedVersion:legal.version,idempotencyKey:randomUUID(),payload:{contract_approved:true,approval_statement:'Ausschließlich synthetischer Testvertrag im isolierten Abnahmetenant; keine Produktionsfreigabe.'}});console.log('Contract fixture approved only for the isolated synthetic tenant.');}finally{await closePools();}
