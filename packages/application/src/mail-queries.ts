import {rows,type DbClient} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {documentReadPredicate} from './document-access.js';

export async function mailRelatedIn(db:DbClient,ctx:ActorContext,slug:string,record:any){
 if(!ctx.permissions.some(permission=>['sales','billing'].includes(permission))||!['orders','customers','suppliers'].includes(slug))return{};
 const order=slug==='orders'?record.id:null,customer=slug==='customers'?record.id:slug==='orders'?record.customer_id:null,supplier=slug==='suppliers'?record.id:null;
 const outgoing=await rows<any>(db,`SELECT m.id,m.version,m.status,m.created_at,m.recipient,m.sender,m.reply_to,m.subject,m.body,m.content_hash,m.message_id,m.attachment_version_ids,m.attachment_snapshot,m.order_id,m.customer_id,m.supplier_id,m.parent_message_id,m.sent_at,m.last_error,m.dispatch_started_at,
 e.id evidence_id,e.outcome evidence_outcome,e.source evidence_source,e.accepted_at,e.provider_reference,e.reason evidence_reason,e.evidence_document_version_id,v.document_id evidence_document_id,d.name evidence_name,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('document_version_id',av.id,'document_id',av.document_id,'name',ad.name,'revision',av.revision,'download_url','/api/v1/documents/'||av.document_id||'/download?version='||av.id) ORDER BY av.id) FROM document_versions av JOIN documents ad ON ad.id=av.document_id WHERE av.id=ANY(m.attachment_version_ids)),'[]'::jsonb) attachments
 FROM outgoing_messages m LEFT JOIN mail_delivery_evidence e ON e.outgoing_message_id=m.id LEFT JOIN document_versions v ON v.id=e.evidence_document_version_id LEFT JOIN documents d ON d.id=v.document_id
 WHERE($1::uuid IS NOT NULL AND m.order_id=$1) OR($2::uuid IS NOT NULL AND $1::uuid IS NULL AND(m.customer_id=$2 OR EXISTS(SELECT 1 FROM orders o WHERE o.id=m.order_id AND o.customer_id=$2))) OR($3::uuid IS NOT NULL AND m.supplier_id=$3) ORDER BY m.created_at DESC LIMIT 50`,[order,customer,supplier]);
 const attachments=await rows<any>(db,`SELECT d.id,d.name,d.current_version_id,d.visibility,v.revision,v.content_hash,
 '/api/v1/documents/'||d.id||'/download?version='||v.id download_url
 FROM documents d JOIN document_versions v ON v.id=d.current_version_id
 WHERE d.status='available' AND v.status='available' AND d.size_bytes<=10485760 AND d.visibility=$4 AND ${documentReadPredicate(ctx,'d')} AND(
 ($1::uuid IS NOT NULL AND(d.entity_id=$1 OR d.entity_id IN(SELECT id FROM invoices WHERE order_id=$1 UNION SELECT id FROM delivery_notes WHERE order_id=$1 UNION SELECT id FROM acceptance_reports WHERE order_id=$1 UNION SELECT quote_version_id FROM orders WHERE id=$1)))
 OR($1::uuid IS NULL AND $2::uuid IS NOT NULL AND(d.entity_id=$2 OR d.entity_id IN(SELECT id FROM orders WHERE customer_id=$2 UNION SELECT id FROM invoices WHERE customer_id=$2 UNION SELECT id FROM quotes WHERE customer_id=$2 UNION SELECT v.id FROM quote_versions v JOIN quotes q ON q.id=v.quote_id WHERE q.customer_id=$2)))
 OR($3::uuid IS NOT NULL AND(d.entity_id=$3 OR d.entity_id IN(SELECT id FROM purchase_orders WHERE supplier_id=$3 UNION SELECT id FROM supplier_invoices WHERE supplier_id=$3)))
 OR EXISTS(SELECT 1 FROM document_links l WHERE l.document_id=d.id AND((l.entity_type IN('customer','customers') AND l.entity_id=$2) OR(l.entity_type IN('supplier','suppliers') AND l.entity_id=$3))))
 AND(COALESCE(d.entity_type,'') NOT IN('invoice','invoices','billing.invoice') OR EXISTS(SELECT 1 FROM invoice_artifacts a JOIN invoices i ON i.id=a.invoice_id WHERE a.document_version_id=v.id AND a.content_hash=v.content_hash AND i.artifact_status='archived')) ORDER BY d.created_at DESC LIMIT 50`,[order,customer,supplier,supplier?'supplier':'customer']);
 return{outgoing_messages:outgoing,mail_attachments:attachments};
}
