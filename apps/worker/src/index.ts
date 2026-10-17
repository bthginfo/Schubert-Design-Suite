import 'dotenv/config';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {closePools} from '@schubert/db';
import {processPending} from '@schubert/application';
import type {ActorContext} from '@schubert/contracts';
const [tenant,legal,job]=process.argv.slice(2);
const ctx:ActorContext={tenantId:z.uuid().parse(tenant),legalEntityId:z.uuid().parse(legal),actorId:'manual-job-service',actorType:'service',role:'JobWorker',permissions:[],employeeId:null,permissionVersion:0,correlationId:randomUUID(),identityAssurance:'service_identity'};
try{console.log(JSON.stringify(await processPending(ctx,1,job?z.uuid().parse(job):undefined)));}finally{await closePools();}
