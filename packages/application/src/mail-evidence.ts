import {insert,one,rows,type DbClient} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {requireRule} from '@schubert/domain';
import {assertOrderScope,baseData,getRecord,hash} from './core.js';
import {assertCustomerDocument,assertDocumentAccess,normalizeDocumentType,personnelDocumentTypes} from './document-access.js';

export async function mailScopeIn(db:DbClient,ctx:ActorContext,scope:any,legacy=false){
 requireRule(!(scope.supplier_id&&(scope.order_id||scope.customer_id)),'MAIL_SCOPE','Lieferantenpost und Kundenpost getrennt zuordnen.');
 if(scope.order_id){const order=await getRecord(db,'orders',scope.order_id);await assertOrderScope(db,ctx,order.id);requireRule(!scope.customer_id||scope.customer_id===order.customer_id,'MAIL_SCOPE','Auftrag und Kunde müssen übereinstimmen.');return{order_id:order.id,customer_id:order.customer_id,supplier_id:null};}
 if(scope.customer_id||scope.supplier_id){const party=await getRecord(db,'parties',scope.customer_id??scope.supplier_id);requireRule(legacy||party.status!=='erased'&&party.active!==false,'MAIL_SCOPE','Dieser Geschäftspartner ist nicht mehr für neue Korrespondenz verfügbar.');requireRule(scope.supplier_id?party.is_supplier:party.is_customer,'MAIL_SCOPE','Die ausgewählte Akte gehört nicht zum angegebenen Bereich.');return{order_id:null,customer_id:scope.customer_id??null,supplier_id:scope.supplier_id??null};}
 requireRule(legacy&&scope.created_by===ctx.actorId,'MAIL_SCOPE','Den Versand einem konkreten Kunden, Lieferanten oder Auftrag zuordnen.',404);return{order_id:null,customer_id:null,supplier_id:null};
}
export async function mailAudienceIn(db:DbClient,scope:any,files:any[]){
 for(const file of files){
  if(scope.customer_id){requireRule(file.visibility==='customer','MAIL_ATTACHMENT_AUDIENCE','Kundenpost darf nur eine freigegebene Kundenfassung enthalten.');await assertCustomerDocument(db,file,scope.customer_id);}
  if(scope.supplier_id){requireRule(file.visibility==='supplier','MAIL_ATTACHMENT_AUDIENCE','Lieferantenpost darf nur eine freigegebene Lieferantenfassung enthalten.');const type=normalizeDocumentType(file.entity_type);const match=await one(db,`SELECT 1 WHERE($1::text IN('supplier','suppliers') AND $2::uuid=$3) OR($1='purchase-orders' AND EXISTS(SELECT 1 FROM purchase_orders WHERE id=$2 AND supplier_id=$3)) OR($1='supplier-invoices' AND EXISTS(SELECT 1 FROM supplier_invoices WHERE id=$2 AND supplier_id=$3)) OR EXISTS(SELECT 1 FROM document_links WHERE document_id=$4 AND entity_type IN('supplier','suppliers') AND entity_id=$3)`,[type,file.entity_id??null,scope.supplier_id,file.id]);requireRule(match,'MAIL_ATTACHMENT_SCOPE','Die Lieferantenfassung gehört nicht zu dieser Lieferantenakte.',404);}
 }
}
export async function mailReviewDocumentIn(db:DbClient,ctx:ActorContext,versionId:string){
 const file=await one<any>(db,"SELECT d.*,v.id document_version_id,v.status version_status,v.content_hash version_hash,b.content_hash blob_hash,b.scan_status FROM document_versions v JOIN documents d ON d.id=v.document_id JOIN blob_objects b ON b.id=v.blob_object_id WHERE v.id=$1",[versionId]);requireRule(file,'MAIL_EVIDENCE','Der konkrete Versandnachweis ist nicht verfügbar.',404);await assertDocumentAccess(db,ctx,file);requireRule(!personnelDocumentTypes.includes(file.entity_type)&&file.status==='available'&&file.version_status==='available'&&['clean','trusted_generator'].includes(file.scan_status)&&file.version_hash===file.blob_hash,'MAIL_EVIDENCE','Eine geprüfte, verfügbare genaue Originalversion als Versandnachweis auswählen.');return file;
}
export async function recordMailEvidenceIn(db:DbClient,ctx:ActorContext,email:any,proof:{outcome:'accepted'|'not_accepted';source:'smtp'|'documented_review';acceptedAt?:Date|null;providerReference:string;reason:string;jobId?:string;evidenceVersionId?:string;evidenceHash?:string}){
 const old=await one<any>(db,'SELECT * FROM mail_delivery_evidence WHERE outgoing_message_id=$1',[email.id]);if(old){requireRule(old.mail_content_hash===email.content_hash&&old.outcome===proof.outcome,'MAIL_EVIDENCE_CONFLICT','Ein unveränderlicher Versandnachweis ist bereits vorhanden.',409);return old;}
 const data={outgoing_message_id:email.id,job_id:proof.jobId??null,outcome:proof.outcome,source:proof.source,message_id:email.message_id,mail_content_hash:email.content_hash,attachment_snapshot:email.attachment_snapshot??[],accepted_at:proof.outcome==='accepted'?proof.acceptedAt:null,provider_reference:proof.providerReference,evidence_document_version_id:proof.evidenceVersionId??null,evidence_hash:proof.evidenceHash??null,reason:proof.reason};
 const evidence=await insert(db,'mail_delivery_evidence',{...baseData(ctx),...data,content_hash:hash(data),status:'confirmed'});
 if(proof.outcome==='accepted'){
  const snapshots=email.attachment_snapshot??[],ids=snapshots.map((s:any)=>s.documentVersionId);if(ids.length){const invoices=await rows<any>(db,'SELECT DISTINCT i.id,a.document_version_id,a.content_hash FROM invoice_artifacts a JOIN invoices i ON i.id=a.invoice_id WHERE a.document_version_id=ANY($1::uuid[]) AND i.issued_at IS NOT NULL',[ids]);for(const invoice of invoices){requireRule(snapshots.some((s:any)=>s.documentVersionId===invoice.document_version_id&&s.sha256===invoice.content_hash),'MAIL_INVOICE_EVIDENCE','Die bestätigte Anlagenversion stimmt nicht mit dem Rechnungsoriginal überein.');await db.query("UPDATE invoices SET delivery_status='provider_accepted',version=version+1,updated_at=now(),updated_by=$2 WHERE id=$1 AND delivery_status NOT IN('delivered','received','provider_accepted')",[invoice.id,ctx.actorId]);}}
 }
 return evidence;
}
export async function acceptedMailReceiptIn(db:DbClient,email:any){const evidence=await one<any>(db,"SELECT id,outcome,source,accepted_at,provider_reference,content_hash FROM mail_delivery_evidence WHERE outgoing_message_id=$1 AND outcome='accepted'",[email.id]);return{status:'provider_accepted',messageId:email.message_id,outgoingMessageId:email.id,evidenceId:evidence?.id??null,acceptedAt:evidence?.accepted_at??email.sent_at??null,receiptRecovered:true};}
