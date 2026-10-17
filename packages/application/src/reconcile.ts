import type {ActorContext} from '@schubert/contracts';
import {withTenant,rows,insert} from '@schubert/db';
import {baseData} from './core.js';
import {scheduleBackupIn} from './backup.js';
import {queueNotificationEmails} from './notifications.js';
import {deletePrivate} from '@schubert/adapters';
/** One daily catch-up complements committed event delivery; no idle browser/DB polling. */
export async function reconcileWork(ctx:ActorContext){const result=await withTenant(ctx,async db=>{
 const recovered=await db.query("UPDATE job_runs SET status=CASE WHEN status='running' THEN 'retry' ELSE status END,lease_until=NULL,queued_at=NULL,queue_message_id=NULL,version=version+1 WHERE(status='running' AND lease_until<now()) OR(status IN('pending','retry') AND queued_at<now()-interval '1 hour')");
 const due=await rows<any>(db,"SELECT 'receivables' table_name,id,version FROM receivables WHERE open_amount>0 AND NOT disputed AND transferred_to_id IS NULL AND due_date<CURRENT_DATE UNION ALL SELECT 'payables',id,version FROM payables WHERE open_amount>0 AND NOT disputed AND transferred_to_id IS NULL AND due_date<CURRENT_DATE LIMIT 1000");
 if(due.length)await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['audit:'+ctx.tenantId]);
 if(due.length)await db.query("INSERT INTO outbox_events(tenant_id,legal_entity_id,event_type,aggregate_type,aggregate_id,aggregate_version,event_sequence,actor_id,correlation_id,payload,status) SELECT $1,$2,CASE WHEN d.table_name='receivables' THEN 'system.receivable.overdue.v1' ELSE 'system.payable.overdue.v1' END,d.table_name,d.id,d.version,COALESCE((SELECT max(e.event_sequence)+1 FROM outbox_events e WHERE e.aggregate_type=d.table_name AND e.aggregate_id=d.id AND e.aggregate_version=d.version),0),'scheduled-reconciliation',$4,jsonb_build_object('entityId',d.id,'version',d.version),'pending' FROM jsonb_to_recordset($3::jsonb) AS d(table_name text,id uuid,version integer) WHERE NOT EXISTS(SELECT 1 FROM outbox_events e WHERE e.event_type=CASE WHEN d.table_name='receivables' THEN 'system.receivable.overdue.v1' ELSE 'system.payable.overdue.v1' END AND e.aggregate_type=d.table_name AND e.aggregate_id=d.id AND e.aggregate_version=d.version) ON CONFLICT DO NOTHING",[ctx.tenantId,ctx.legalEntityId,JSON.stringify(due),ctx.correlationId]);
 await scheduleBackupIn(db,ctx);await queueNotificationEmails(db,ctx);
 const dispatcher=await db.query("INSERT INTO job_runs(tenant_id,legal_entity_id,created_by,name,job_type,payload,status)SELECT $1,$2,'scheduled-reconciliation','Ausstehende Mitteilungen nachholen','outbox.dispatch','{}','pending' WHERE EXISTS(SELECT 1 FROM outbox_events WHERE published_at IS NULL)ON CONFLICT DO NOTHING",[ctx.tenantId,ctx.legalEntityId]);
 return{recoveredJobs:recovered.rowCount,checkedDueItems:due.length,dispatcherScheduled:dispatcher.rowCount};
});
 // Free reserved capacity only after the private provider confirms removal. Registered originals are excluded.
 const expired=await withTenant(ctx,db=>rows<{storage_key:string}>(db,"SELECT o.storage_key FROM blob_storage_objects o WHERE o.status='reserved' AND o.reserved_until<now() AND NOT EXISTS(SELECT 1 FROM blob_objects b WHERE b.storage_key=o.storage_key) AND NOT EXISTS(SELECT 1 FROM archive_objects a WHERE a.object_key=o.storage_key) AND NOT EXISTS(SELECT 1 FROM upload_intents u WHERE u.pathname=o.storage_key AND u.expires_at>=now()) ORDER BY o.reserved_until LIMIT 10"));
 let removed=0;for(const item of expired){try{await deletePrivate(item.storage_key,ctx);removed++;}catch{console.error(JSON.stringify({code:'EXPIRED_UPLOAD_CLEANUP_DEFERRED',correlationId:ctx.correlationId}));}}
 return{...result,expiredReservationsRemoved:removed,expiredReservationsDeferred:expired.length-removed};
}
