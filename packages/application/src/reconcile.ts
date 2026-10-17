import type {ActorContext} from '@schubert/contracts';
import {withTenant,rows,insert} from '@schubert/db';
import {baseData} from './core.js';
import {scheduleBackupIn} from './backup.js';
import {queueNotificationEmails} from './notifications.js';
/** One daily catch-up complements committed event delivery; no idle browser/DB polling. */
export async function reconcileWork(ctx:ActorContext){return withTenant(ctx,async db=>{
 const recovered=await db.query("UPDATE job_runs SET status=CASE WHEN status='running' THEN 'retry' ELSE status END,lease_until=NULL,queued_at=NULL,queue_message_id=NULL,version=version+1 WHERE(status='running' AND lease_until<now()) OR(status IN('pending','retry') AND queued_at<now()-interval '1 hour')");
 await db.query("DELETE FROM blob_storage_objects WHERE status='reserved' AND reserved_until<now() AND NOT EXISTS(SELECT 1 FROM blob_objects b WHERE b.storage_key=blob_storage_objects.storage_key) AND NOT EXISTS(SELECT 1 FROM archive_objects a WHERE a.object_key=blob_storage_objects.storage_key)");
 const due=await rows<any>(db,"SELECT 'receivables' table_name,id,version FROM receivables WHERE open_amount>0 AND NOT disputed AND transferred_to_id IS NULL AND due_date<CURRENT_DATE UNION ALL SELECT 'payables',id,version FROM payables WHERE open_amount>0 AND NOT disputed AND transferred_to_id IS NULL AND due_date<CURRENT_DATE LIMIT 1000");
 for(const item of due)await db.query("INSERT INTO outbox_events(tenant_id,legal_entity_id,event_type,aggregate_type,aggregate_id,aggregate_version,event_sequence,actor_id,payload,status)VALUES($1,$2,$3,$4,$5,$6,0,'scheduled-reconciliation',$7,'pending')ON CONFLICT DO NOTHING",[ctx.tenantId,ctx.legalEntityId,item.table_name==='receivables'?'system.receivable.overdue.v1':'system.payable.overdue.v1',item.table_name,item.id,item.version,JSON.stringify({entityId:item.id,version:item.version})]);
 await scheduleBackupIn(db,ctx);await queueNotificationEmails(db,ctx);
 const dispatcher=await db.query("INSERT INTO job_runs(tenant_id,legal_entity_id,created_by,name,job_type,payload,status)SELECT $1,$2,'scheduled-reconciliation','Ausstehende Mitteilungen nachholen','outbox.dispatch','{}','pending' WHERE EXISTS(SELECT 1 FROM outbox_events WHERE published_at IS NULL)ON CONFLICT DO NOTHING",[ctx.tenantId,ctx.legalEntityId]);
 return{recoveredJobs:recovered.rowCount,checkedDueItems:due.length,dispatcherScheduled:dispatcher.rowCount};
});}
