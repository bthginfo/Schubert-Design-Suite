import{z}from'zod';
import type{ActorContext}from'@schubert/contracts';
import{designSnapshotSchema}from'@schubert/contracts';
import{one,type DbClient}from'@schubert/db';
import{requireRule}from'@schubert/domain';
import{privateBytes,contentHash}from'@schubert/adapters';
import{register,getRecord,hash,assertOrderScope}from'./core.js';
import{assertDocumentAccess}from'./document-access.js';

const inputSchema=z.object({source_job_id:z.uuid(),candidate_document_version_id:z.uuid(),rights_evidence_version_id:z.uuid(),statement:z.string().trim().min(20).max(5000),same_camera_acknowledged:z.literal(true),customer_concept_use_acknowledged:z.literal(true)}).strict();

async function original(db:DbClient,ctx:ActorContext,id:string,byDocument=false,mime?:string){
  const doc=byDocument?await getRecord(db,'documents',id):null,version=await getRecord(db,'document_versions',doc?.current_version_id??id),document=doc??await getRecord(db,'documents',version.document_id),blob=await getRecord(db,'blob_objects',version.blob_object_id);
  if(ctx.actorType!=='service')await assertDocumentAccess(db,ctx,document);
  requireRule(document.status==='available'&&version.status==='available'&&blob.status==='available'&&['clean','trusted_generator'].includes(blob.scan_status)&&version.document_id===document.id&&version.content_hash===blob.content_hash&&blob.storage_key.startsWith(ctx.tenantId+'/')&&(!mime||document.mime_type===mime),'COMPOSITE_SOURCE_UNAVAILABLE','Eine gebundene Original-, Kandidaten- oder Nachweisversion ist nicht mehr geprüft verfügbar.');
  return{doc:document,version,blob};
}

/** Resolve original archived sources again for every authorized job attempt. */
export async function compositeSources(db:DbClient,ctx:ActorContext,input:unknown){
  const p=inputSchema.parse(input),sourceJob=await getRecord(db,'job_runs',p.source_job_id);
  requireRule(['planning.render','planning.package'].includes(sourceJob.job_type)&&sourceJob.status==='completed','COMPOSITE_RENDER_SOURCE','Ein abgeschlossenes deterministisches Originalrender auswählen.');
  const revision=await getRecord(db,'design_revisions',sourceJob.payload.revisionId),snapshot=designSnapshotSchema.parse(revision.snapshot),variant=await getRecord(db,'design_variants',revision.variant_id),project=await getRecord(db,'planning_projects',variant.planning_project_id);
  if(project.order_id)await assertOrderScope(db,ctx,project.order_id);
  requireRule(hash(snapshot)===revision.content_hash&&snapshot.revisionId===revision.id,'COMPOSITE_REVISION_HASH','Die eingefrorene Originalrevision stimmt nicht mit ihrem Inhaltsnachweis überein.');
  const protectedIds=snapshot.elements.filter(e=>e.kind==='inscription'&&e.phase!=='demolition'&&(e.locked||e.phase==='existing')).map(e=>e.id);
  requireRule(protectedIds.length>0,'COMPOSITE_PROTECTED_CONTENT','Diese Revision enthält keine gesperrte Bestandsinschrift für eine geschützte Bildableitung.');
  const result=sourceJob.result??{},imageId=result.documentId??result.renderDocumentId,maskId=result.maskDocumentId,proofId=result.manifestDocumentId??result.renderManifestDocumentId;
  requireRule(imageId&&maskId&&proofId,'COMPOSITE_ORIGINALS_REQUIRED','Archiviertes Originalbild, Schutzmaske und revisionsgebundenes Renderprotokoll fehlen. Originalrender erneut vollständig erzeugen.');
  const image=await original(db,ctx,imageId,true,'image/png'),mask=await original(db,ctx,maskId,true,'image/png'),proofDocument=await original(db,ctx,proofId,true,'application/json'),candidate=await original(db,ctx,p.candidate_document_version_id,false,'image/png'),rights=await original(db,ctx,p.rights_evidence_version_id);
  for(const source of[image,mask,proofDocument,candidate])requireRule(source.doc.entity_type==='design_revision'&&source.doc.entity_id===revision.id,'COMPOSITE_REVISION_SCOPE','Alle Bilddateien müssen ausdrücklich derselben unveränderlichen Designrevision zugeordnet sein.');
  for(const source of[image,mask,proofDocument])requireRule(source.doc.source_job_id===sourceJob.id&&source.blob.scan_status==='trusted_generator','COMPOSITE_ORIGINAL_SOURCE','Originale müssen aus dem archivierten deterministischen Renderauftrag stammen.');
  const proofBytes=await privateBytes(proofDocument.blob.storage_key,1024*1024,ctx);requireRule(contentHash(proofBytes)===proofDocument.version.content_hash,'COMPOSITE_PROOF_HASH','Der archivierte Originalnachweis wurde verändert.');
  let proof:any,workerManifest:any;try{proof=JSON.parse(Buffer.from(proofBytes).toString('utf8'));workerManifest=JSON.parse(proof.workerManifestCanonical);}catch{requireRule(false,'COMPOSITE_PROOF','Originalkameranachweis ist nicht lesbar.');}
  requireRule(proof.sourceJobId===sourceJob.id&&proof.revisionId===revision.id&&proof.contentHash===revision.content_hash&&proof.imageHash===image.version.content_hash&&proof.maskHash===mask.version.content_hash&&proof.workerManifestHash===contentHash(Buffer.from(proof.workerManifestCanonical))&&workerManifest.revisionId===revision.id&&workerManifest.contentHash===revision.content_hash&&workerManifest.camera&&protectedIds.every(id=>workerManifest.protectedElementIds?.includes(id)),'COMPOSITE_PROOF_BINDING','Originalbild, vollständige Bestandsmaske und Kameranachweis gehören nicht zum selben eingefrorenen Planstand.');
  return{input:p,sourceJob,revision:{...revision,snapshot},image,mask,proofDocument,candidate,rights,proof,workerManifest,protectedIds};
}

register('planning.composite.request','planning',async r=>{
  requireRule(r.ctx.actorType==='employee'&&!r.payload.ai_proposal_id,'COMPOSITE_HUMAN_REVIEW','Die geprüfte Bildzuordnung und Nutzungserklärung muss eine interne Person selbst dokumentieren.');
  const sources=await compositeSources(r.db,r.ctx,r.payload),{input,revision}=sources;
  const sourceHashes={image:sources.image.version.content_hash,mask:sources.mask.version.content_hash,proof:sources.proofDocument.version.content_hash,candidate:sources.candidate.version.content_hash,rights:sources.rights.version.content_hash},requestHash=hash({revision:revision.content_hash,input,sourceHashes});
  const existing=await one<any>(r.db,"SELECT * FROM job_runs WHERE job_type='planning.composite' AND payload->>'requestHash'=$1 AND status IN('pending','running','retry','completed') ORDER BY created_at DESC LIMIT 1",[requestHash]);if(existing)return existing;
  const job=await r.insert('job_runs',{name:'Konzeptbild mit geschützter Bestandsinschrift',job_type:'planning.composite',payload:{revisionId:revision.id,input,sourceHashes,requestHash,usageDeclaration:{purpose:'customer_concept',declaredBy:r.ctx.actorId,declaredAt:new Date().toISOString(),statement:input.statement,evidenceDocumentVersionId:sources.rights.version.id,evidenceContentHash:sources.rights.version.content_hash}},status:process.env.RENDER_WORKER_URL?'pending':'unavailable',last_error:process.env.RENDER_WORKER_URL?null:'Der isolierte Bildworker ist noch nicht eingerichtet.'});
  await r.insert('render_jobs',{revision_id:revision.id,profile:'concept',job_run_id:job.id,status:job.status});return job;
});
