import {QueueClient} from '@vercel/queue';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {withTenant,one} from '@schubert/db';
import {processPending,enqueuePending} from '@schubert/application';
import type {ActorContext} from '@schubert/contracts';
const queue=new QueueClient({region:'fra1'});
export default queue.handleNodeCallback(async input=>{
  const p=z.object({tenantId:z.uuid(),legalEntityId:z.uuid(),jobId:z.uuid()}).strict().parse(input);
  const ctx:ActorContext={tenantId:p.tenantId,legalEntityId:p.legalEntityId,actorId:'queue-service',actorType:'service',role:'JobWorker',permissions:[],employeeId:null,permissionVersion:0,correlationId:randomUUID(),identityAssurance:'service_identity'};
  await processPending(ctx,1,p.jobId);
  const job=await withTenant(ctx,db=>one<any>(db,'SELECT status,last_error,next_attempt_at FROM job_runs WHERE id=$1',[p.jobId]));
  if(job&&['pending','running','retry'].includes(job.status))throw Object.assign(new Error('JOB_RETRY'),{retryAt:job.next_attempt_at});
  await enqueuePending(ctx);
},{visibilityTimeoutSeconds:850,retry:(error:any,metadata)=>metadata.deliveryCount>=8?{acknowledge:true}:{afterSeconds:Math.min(3600,Math.max(30,Math.ceil((new Date(error.retryAt??Date.now()+60000).getTime()-Date.now())/1000)))}});
