import {send} from '@vercel/queue';
import {withTenant,rows} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';

export const JOB_TOPIC='schubert-jobs-v1';
/** PostgreSQL remains authoritative. Only committed work is handed to the event service. */
export async function enqueuePending(ctx:ActorContext,jobId?:string){
  const pending=await withTenant(ctx,db=>rows<any>(db,"SELECT id,version,next_attempt_at FROM job_runs WHERE($1::uuid IS NULL OR id=$1) AND((status IN('pending','retry') AND(queued_at IS NULL OR queued_at<now()-interval '1 hour')) OR(status='running' AND lease_until<now())) ORDER BY created_at LIMIT 100",[jobId??null]));
  for(const job of pending){
    const delivery=await send(JOB_TOPIC,{tenantId:ctx.tenantId,legalEntityId:ctx.legalEntityId,jobId:job.id},{region:'fra1',retentionSeconds:604800,delaySeconds:Math.max(0,Math.ceil((new Date(job.next_attempt_at).getTime()-Date.now())/1000)),idempotencyKey:'job:'+job.id+':'+job.version});
    await withTenant(ctx,db=>db.query('UPDATE job_runs SET queued_at=now(),queue_message_id=$1 WHERE id=$2 AND version=$3',[delivery.messageId,job.id,job.version]));
  }
  return{enqueued:pending.length};
}
