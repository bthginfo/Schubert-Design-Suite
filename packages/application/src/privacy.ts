import {assertDocumentAccess} from './document-access.js';
import {z} from 'zod';
import {verify} from 'node:crypto';
import {rows,one,withTenant,insert,update,type DbClient} from '@schubert/db';
import {assertFreshAuth,assertVersion,earliestErasureDate,requireRule} from '@schubert/domain';
import {deletePrivate} from '@schubert/adapters';
import type {ActorContext} from '@schubert/contracts';
import {register,getRecord,hash,baseData} from './core.js';

async function privacyTarget(db:DbClient,ctx:ActorContext,documentId?:string,partyId?:string){const object=await getRecord(db,documentId?'documents':'parties',documentId??partyId,true);if(documentId)await assertDocumentAccess(db,ctx,object);return object;}
const date=z.iso.date(),scope=z.object({document_id:z.uuid().optional(),party_id:z.uuid().optional()}).refine(p=>!!p.document_id!==!!p.party_id,'Genau ein konkretes Objekt auswählen.');
register('privacy.retention.approve','admin',async r=>{
 assertFreshAuth(r.ctx.reauthenticatedAt);
 const p=z.object({document_kind:z.enum(['invoice','contract','communication','personnel','document']),years:z.number().int().min(1).max(40),basis:z.string().min(12).max(3000),valid_from:date,responsible_person:z.string().min(3).max(250),source_reference:z.string().min(8).max(2000),previous_version_id:z.uuid().optional()}).parse(r.payload);
 if(p.previous_version_id)await getRecord(r.db,'retention_policies',p.previous_version_id);
 return r.insert('retention_policies',{...p,content_hash:hash(p),approved_by:r.ctx.actorId,approved_at:new Date(),status:'approved'});
});
register('privacy.retention.assign','admin',async r=>{
 assertFreshAuth(r.ctx.reauthenticatedAt);const p=z.object({document_id:z.uuid(),policy_id:z.uuid(),started_on:date,reason:z.string().min(10)}).parse(r.payload),doc=await privacyTarget(r.db,r.ctx,p.document_id),policy=await getRecord(r.db,'retention_policies',p.policy_id);
 requireRule(!['deleting','erased','deleted'].includes(doc.status)&&policy.status==='approved'&&policy.approved_by&&policy.valid_from<=p.started_on,'RETENTION_POLICY','Ein verfügbares Dokument und die anwendbare bestätigte Regel auswählen.');
 const until=earliestErasureDate(p.started_on,policy.years);const versions=await rows<any>(r.db,'SELECT id FROM document_versions WHERE document_id=$1',[doc.id]);
 for(const v of versions)await r.insert('retention_assignments',{document_version_id:v.id,policy_id:policy.id,started_at:p.started_on,retain_until:until,notes:p.reason,status:'active'});
 return {id:doc.id,version:doc.version,assignedVersions:versions.length,retain_until:until};
});
register('privacy.purpose.create','admin',async r=>{
 assertFreshAuth(r.ctx.reauthenticatedAt);const p=scope.and(z.object({purpose:z.string().min(5).max(1000),legal_basis:z.string().min(5).max(2000),retain_until:z.iso.datetime({offset:true}).optional()})).parse(r.payload),object=await privacyTarget(r.db,r.ctx,p.document_id,p.party_id);
 requireRule(!['deleting','erased','deleted'].includes(object.status),'ERASURE_STATE','Für ein entferntes oder bereits gesperrtes Objekt kann kein neuer Zweck eröffnet werden.');return r.insert('processing_purposes',{...p,status:'active'});
});
register('privacy.purpose.close','admin',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const purpose=await getRecord(r.db,'processing_purposes',r.command.id,true);assertVersion(purpose.version,r.command.expectedVersion);requireRule(!purpose.closed_at,'PURPOSE_CLOSED','Dieser Zweck ist bereits beendet.');const reason=z.string().min(10).max(3000).parse(r.payload.reason);return r.update('processing_purposes',purpose.id,{closed_at:new Date(),closed_by:r.ctx.actorId,closure_reason:reason,status:'closed'},purpose.version);});
register('privacy.hold.create','admin',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const p=z.object({document_id:z.uuid(),reason:z.string().min(10).max(3000),review_due:date}).parse(r.payload),doc=await privacyTarget(r.db,r.ctx,p.document_id);requireRule(!['deleting','erased','deleted'].includes(doc.status),'ERASURE_STATE','Für dieses Objekt läuft bereits eine Entfernung.');return r.insert('legal_holds',{...p,status:'active'});});
register('privacy.hold.release','admin',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const hold=await getRecord(r.db,'legal_holds',r.command.id,true);assertVersion(hold.version,r.command.expectedVersion);requireRule(!hold.released_at,'HOLD_RELEASED','Die Sperre ist bereits beendet.');return r.update('legal_holds',hold.id,{released_at:new Date(),released_by:r.ctx.actorId,release_reason:z.string().min(10).max(3000).parse(r.payload.reason),status:'released'},hold.version);});

/** Enumerate every derivative before any byte is removed. Shared originals retain their other permissions. */
export async function erasureReview(db:DbClient,job:any){
 const purposes=await rows<any>(db,'SELECT id,purpose,legal_basis,retain_until FROM processing_purposes WHERE(document_id=$1 OR party_id=$2) AND closed_at IS NULL',[job.document_id??null,job.party_id??null]);
 const blockers=purposes.filter(p=>!p.retain_until||new Date(p.retain_until)>new Date()).map(p=>'Aktiver Zweck: '+p.purpose);
 if(job.party_id){
  await getRecord(db,'parties',job.party_id,true);
  const uses=await one<any>(db,`SELECT EXISTS(SELECT 1 FROM orders WHERE customer_id=$1 AND status NOT IN('closed','completed','cancelled','archived')) active_order,
   EXISTS(SELECT 1 FROM receivables WHERE party_id=$1 AND open_amount<>0 AND transferred_to_id IS NULL UNION ALL SELECT 1 FROM payables WHERE party_id=$1 AND open_amount<>0 AND transferred_to_id IS NULL) open_balance,
   (SELECT count(*) FROM invoices WHERE customer_id=$1 AND issued_at IS NOT NULL)::int retained_invoice_count,
   (SELECT count(*) FROM supplier_invoices WHERE supplier_id=$1 AND status NOT IN('rejected','duplicate'))::int retained_supplier_count,
   EXISTS(SELECT 1 FROM quotes WHERE customer_id=$1 AND status IN('draft','under_review','approved','published') AND(valid_until IS NULL OR valid_until>=CURRENT_DATE)) active_quote,
   EXISTS(SELECT 1 FROM documents WHERE entity_id=$1 AND status NOT IN('erased','deleted')) linked_document`,[job.party_id]);
  if(uses.active_order)blockers.push('Laufender Auftrag');if(uses.open_balance)blockers.push('Offener Zahlungssaldo');if(uses.active_quote)blockers.push('Noch offenes Angebot');if(uses.linked_document)blockers.push('Verknüpfte Dokumente zuerst einzeln prüfen');
  return {blockers,documentIds:[],versionIds:[],files:[],sharedFiles:[],partyId:job.party_id,retainedFinancialSnapshots:uses.retained_invoice_count+uses.retained_supplier_count,retentionNotice:'Das Stammprofil kann unabhängig von historischen Fremdschlüsseln anonymisiert werden. Gesetzlich aufzubewahrende, unveränderliche Belegoriginale und deren eingefrorene Empfängerangaben bleiben ausschließlich für ihren dokumentierten Buchführungszweck bestehen.',reviewedAt:new Date().toISOString()};
 }
 const doc=await getRecord(db,'documents',job.document_id,true);
 const related=await rows<any>(db,`WITH RECURSIVE descendants AS(SELECT id FROM documents WHERE id=$1 UNION SELECT d.id FROM documents d LEFT JOIN job_runs j ON j.id=d.source_job_id JOIN descendants s ON(d.entity_id=s.id AND d.entity_type IN('document','documents','source_preview','source_document','document_preview') OR j.payload->>'documentId'=s.id::text)) SELECT d.id FROM descendants d`,[doc.id]);
 const ids=related.map(d=>d.id),versions=await rows<any>(db,'SELECT id FROM document_versions WHERE document_id=ANY($1::uuid[])',[ids]),versionIds=versions.map(v=>v.id);
 const checks=await one<any>(db,`SELECT EXISTS(SELECT 1 FROM legal_holds WHERE document_id=ANY($1::uuid[]) AND released_at IS NULL) hold,
  EXISTS(SELECT 1 FROM retention_assignments WHERE document_version_id=ANY($2::uuid[]) AND retain_until>=now()) retained,
  EXISTS(SELECT 1 FROM processing_purposes WHERE document_id=ANY($1::uuid[]) AND closed_at IS NULL AND(retain_until IS NULL OR retain_until>=now())) purpose,
  EXISTS(SELECT 1 FROM product_assets WHERE document_id=ANY($1::uuid[]) AND status='approved') catalog`,[ids,versionIds]);
 if(checks.hold)blockers.push('Aktive rechtliche Sperre');if(checks.retained)blockers.push('Laufende Aufbewahrungsfrist');if(checks.purpose&&!blockers.some(x=>x.startsWith('Aktiver Zweck')))blockers.push('Aktiver Zweck einer Ableitung');if(checks.catalog)blockers.push('Freigegebener Katalog-/Planungsnachweis');
 const files=await rows<any>(db,`SELECT DISTINCT b.id blob_id,b.storage_key,b.content_hash,b.size_bytes,
  EXISTS(SELECT 1 FROM document_versions other JOIN documents od ON od.id=other.document_id WHERE other.blob_object_id=b.id AND NOT(other.document_id=ANY($1::uuid[])) AND od.status NOT IN('erased','deleted')) shared,
  EXISTS(SELECT 1 FROM archive_objects a WHERE a.object_key=b.storage_key AND a.status='archived' AND a.retain_until>=now()) archived
  FROM document_versions v JOIN blob_objects b ON b.id=v.blob_object_id WHERE v.document_id=ANY($1::uuid[])`,[ids]);
 if(files.some(f=>f.archived))blockers.push('Original im laufenden Rechnungsarchiv');
 return {blockers:[...new Set(blockers)],documentIds:ids,versionIds,files:files.filter(f=>!f.shared),sharedFiles:files.filter(f=>f.shared).map(f=>({blobId:f.blob_id,reason:'Weitere berechtigte Akte verwendet dasselbe Original'})),partyId:null,objectHash:doc.content_hash,reviewedAt:new Date().toISOString()};
}
register('privacy.erasure.request','admin',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const p=scope.and(z.object({reason:z.string().min(10).max(3000)})).parse(r.payload);await privacyTarget(r.db,r.ctx,p.document_id,p.party_id);const decision=await erasureReview(r.db,p);return r.insert('deletion_jobs',{...p,decision,status:'requested'});});
register('privacy.erasure.review','admin',async r=>{const job=await getRecord(r.db,'deletion_jobs',r.command.id,true);assertVersion(job.version,r.command.expectedVersion);requireRule(job.status==='requested','ERASURE_STATE','Nur einen offenen Antrag neu prüfen.');return r.update('deletion_jobs',job.id,{decision:await erasureReview(r.db,job)},job.version);});
register('privacy.erasure.approve','admin',async r=>{assertFreshAuth(r.ctx.reauthenticatedAt);const job=await getRecord(r.db,'deletion_jobs',r.command.id,true);assertVersion(job.version,r.command.expectedVersion);requireRule(job.status==='requested','ERASURE_STATE','Löschantrag ist bereits entschieden.');await privacyTarget(r.db,r.ctx,job.document_id,job.party_id);const decision=await erasureReview(r.db,job);requireRule(!decision.blockers.length,'RETENTION_HOLD','Entfernung gesperrt: '+decision.blockers.join('; '));await r.insert('job_runs',{name:'Freigegebene Datenentfernung',job_type:'privacy.erase',payload:{deletionJobId:job.id},status:'pending'});return r.update('deletion_jobs',job.id,{decision,approved_by:r.ctx.actorId,approved_at:new Date(),status:'approved'},job.version);});

async function independentTombstone(ctx:ActorContext,job:any,entry:any){
 const url=process.env.BACKUP_VAULT_URL,secret=process.env.BACKUP_TRIGGER_SECRET,publicKey=process.env.BACKUP_SIGN_PUBLIC_KEY;requireRule(url&&secret&&publicKey,'ERASURE_JOURNAL','Die getrennte Sicherung muss den minimalen Löschvermerk vor der Entfernung bestätigen.',503);
 const response=await fetch(new URL('/tombstones',url),{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({tenantId:ctx.tenantId,legalEntityId:ctx.legalEntityId,jobId:job.id,fencingToken:String(job.fencing_token),entry}),signal:AbortSignal.timeout(30000)}),proof:any=await response.json();
 requireRule(response.ok&&proof.entryHash===hash(entry)&&verify(null,Buffer.from(JSON.stringify({entryHash:proof.entryHash,key:proof.key})),publicKey,Buffer.from(proof.signature??'','base64')),'ERASURE_JOURNAL','Der unabhängige Löschvermerk konnte nicht bestätigt werden.',503);return proof;
}
export async function runErasure(ctx:ActorContext,job:any,guardLease:(ctx:ActorContext,job:any)=>Promise<any>){
 const prepared=await withTenant(ctx,async db=>{const request=await getRecord(db,'deletion_jobs',job.payload.deletionJobId,true);if(request.status==='completed')return{completed:true};requireRule(request.status==='approved'||request.status==='deleting','ERASURE_STATE','Löschfreigabe fehlt.');const decision=await erasureReview(db,request);requireRule(!decision.blockers.length,'RETENTION_HOLD','Neue Aufbewahrung oder Sperre: '+decision.blockers.join('; '));if(request.document_id)await db.query("UPDATE documents SET status='deleting' WHERE id=ANY($1::uuid[])",[decision.documentIds]);await update(db,'deletion_jobs',request.id,{status:'deleting',decision});return{request,decision};});
 if('completed' in prepared)return{deleted:true,alreadyCompleted:true};const {request,decision}=prepared;
 const entry={entityType:request.document_id?'document':'party',entityId:request.document_id??request.party_id,relatedIds:decision.documentIds,objectHash:decision.objectHash??hash(request.party_id),deletionJobId:request.id};
 await guardLease(ctx,job);const independentProof=await independentTombstone(ctx,job,entry);
 for(const file of decision.files){await guardLease(ctx,job);await deletePrivate(file.storage_key,ctx);}
 return withTenant(ctx,async db=>{
  const live=await getRecord(db,'job_runs',job.id,true);requireRule(live.status==='running'&&String(live.fencing_token)===String(job.fencing_token)&&new Date(live.lease_until)>new Date(),'STALE_JOB_FENCE','Neuer Löschversuch hat übernommen.',409);
  if(request.party_id){await db.query("UPDATE parties SET name='Entferntes Geschäftspartnerprofil',email=NULL,phone=NULL,street=NULL,postal_code=NULL,city=NULL,country=NULL,vat_id=NULL,notes=NULL,active=false,status='erased',version=version+1 WHERE id=$1",[request.party_id]);await db.query('DELETE FROM contacts WHERE party_id=$1',[request.party_id]);await db.query('DELETE FROM addresses WHERE party_id=$1',[request.party_id]);}
  else{
   await db.query('DELETE FROM search_documents WHERE document_id=ANY($1::uuid[])',[decision.documentIds]);await db.query('DELETE FROM document_extractions WHERE document_version_id=ANY($1::uuid[])',[decision.versionIds]);
   await db.query("UPDATE portal_publications SET revoked_at=now(),status='revoked' WHERE document_version_id=ANY($1::uuid[])",[decision.versionIds]);
   await db.query("UPDATE documents SET name='Entferntes Dokument',original_name='Entferntes Original',notes=NULL,title=NULL,current_version_id=NULL,status='erased',version=version+1 WHERE id=ANY($1::uuid[])",[decision.documentIds]);
   await db.query("UPDATE document_versions SET status='erased' WHERE id=ANY($1::uuid[])",[decision.versionIds]);await db.query("UPDATE blob_objects SET status='deleted' WHERE id=ANY($1::uuid[])",[decision.files.map((f:any)=>f.blob_id)]);await db.query("UPDATE archive_objects SET status='deleted' WHERE object_key=ANY($1::text[]) AND retain_until<now()",[decision.files.map((f:any)=>f.storage_key)]);
   await db.query("UPDATE ai_runs SET result=NULL,status='source_erased' WHERE source_document_ids&&$1::uuid[]",[decision.documentIds]);
   await db.query("UPDATE ai_proposals SET commands='[]',missing_inputs='{}',status='source_erased' WHERE ai_run_id IN(SELECT id FROM ai_runs WHERE source_document_ids&&$1::uuid[])",[decision.documentIds]);
   await db.query("UPDATE job_runs SET status='source_erased',lease_until=NULL,fencing_token=fencing_token+1 WHERE id<>$1 AND status IN('pending','retry','running') AND(payload->>'documentId'=ANY($2::text[]) OR payload->>'sourceDocumentId'=ANY($2::text[]))",[job.id,decision.documentIds]);
  }
  await db.query("UPDATE command_receipts SET result=jsonb_build_object('id',result->>'id','status','source_erased') WHERE command_name NOT LIKE 'privacy.%' AND result->>'id'=ANY($1::text[])",[[entry.entityId,...decision.documentIds]]);
  await db.query(`INSERT INTO deletion_tombstones(tenant_id,legal_entity_id,object_hash,entity_type,entity_id,related_ids,deletion_job_id,independent_proof,review_due,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,current_date+365,'active') ON CONFLICT(tenant_id,legal_entity_id,deletion_job_id) WHERE deletion_job_id IS NOT NULL DO NOTHING`,[ctx.tenantId,ctx.legalEntityId,entry.objectHash,entry.entityType,entry.entityId,entry.relatedIds,request.id,independentProof]);
  await update(db,'deletion_jobs',request.id,{status:'completed',decision:{removedFiles:decision.files.length,sharedFilesPreserved:decision.sharedFiles,derivativeCount:decision.documentIds.length,independentProof}});return{deleted:true,removedFiles:decision.files.length,sharedFilesPreserved:decision.sharedFiles.length,independentJournal:true};
 });
}
