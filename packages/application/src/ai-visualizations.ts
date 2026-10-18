import {z} from 'zod';
import {withTenant,one,update} from '@schubert/db';
import {assertVersion,requireRule,dec} from '@schubert/domain';
import {integrationConfiguration,privateBytes,contentHash,callWorker} from '@schubert/adapters';
import {compactContext,imageQualitySchema,imageSizeSchema,imageIntentSchema,visualizationInstructions} from '@schubert/ai';
import {createPlanningPdf} from '@schubert/documents';
import type {ActorContext} from '@schubert/contracts';
import {register,getRecord,hash,assertOrderScope} from './core.js';
import {assertDocumentAccess,personnelDocumentTypes} from './document-access.js';

export const visualizationInputSchema=z.object({
 revision_id:z.uuid(),prompt:z.string().trim().min(8).max(2000),
 intent:imageIntentSchema.default('plan'),quality:imageQualitySchema.default('medium'),size:imageSizeSchema.default('1536x1024'),
 reference_document_ids:z.array(z.uuid()).max(2).default([]),reference_preview_job_ids:z.array(z.uuid()).max(2).default([]),
 rights_basis:z.enum(['own_content','licensed_document']).default('licensed_document'),rights_evidence_version_id:z.uuid().optional(),rights_statement:z.string().trim().min(20).max(3000)
}).superRefine((p,ctx)=>{
 if(p.rights_basis==='licensed_document'&&!p.rights_evidence_version_id)ctx.addIssue({code:'custom',path:['rights_evidence_version_id'],message:'Nutzungsnachweis auswählen.'});
 if(p.intent==='photo'&&!p.reference_document_ids.length)ctx.addIssue({code:'custom',path:['reference_document_ids'],message:'Das zu bearbeitende Foto auswählen und vorbereiten.'});
 if(p.intent==='plan'&&p.reference_document_ids.length>1)ctx.addIssue({code:'custom',path:['reference_document_ids'],message:'Zusätzlich zum gespeicherten Plan höchstens eine Bildvorlage auswählen.'});
});
async function imageBasis(db:any,ctx:ActorContext,p:z.infer<typeof visualizationInputSchema>){
 const revision=await getRecord(db,'design_revisions',p.revision_id),variant=await getRecord(db,'design_variants',revision.variant_id),project=await getRecord(db,'planning_projects',variant.planning_project_id);
 if(project.order_id)await assertOrderScope(db,ctx,project.order_id);
 let evidenceHash:string;
 if(p.rights_basis==='own_content')evidenceHash=hash({basis:'own_content',statement:p.rights_statement});
 else{
  const evidence=await getRecord(db,'document_versions',p.rights_evidence_version_id!),evidenceDoc=await getRecord(db,'documents',evidence.document_id);
  await assertDocumentAccess(db,ctx,evidenceDoc);requireRule(evidenceDoc.status==='available'&&evidence.status==='available'&&!personnelDocumentTypes.includes(evidenceDoc.entity_type),'IMAGE_RIGHTS_EVIDENCE','Einen geprüften Nutzungsnachweis außerhalb von Personalakten auswählen.');evidenceHash=evidence.content_hash;
 }
 requireRule(p.reference_preview_job_ids.length===p.reference_document_ids.length,'IMAGE_REFERENCE_BINDING','Jede Bildquelle an die tatsächlich geprüfte vorbereitete Seite binden.');
 const references=[];
 for(const [index,id] of p.reference_document_ids.entries()){
  const doc=await getRecord(db,'documents',id);await assertDocumentAccess(db,ctx,doc);requireRule(doc.status==='available'&&!personnelDocumentTypes.includes(doc.entity_type),'IMAGE_REFERENCE_SCOPE','Die ausgewählte Bildquelle ist nicht verfügbar.');
  const version=await getRecord(db,'document_versions',doc.current_version_id),preview=await one<any>(db,"SELECT result FROM job_runs WHERE id=$2 AND job_type='document.preview' AND payload->>'documentVersionId'=$1 AND status='completed'",[version.id,p.reference_preview_job_ids[index]]);
  requireRule(version.status==='available'&&preview?.result?.sourceHash===version.content_hash&&preview.result.width>0&&preview.result.width<=1440&&preview.result.height>0&&preview.result.height<=1440,'IMAGE_REFERENCE_PREPARE','Die ausgewählte Bildseite zuerst vorbereiten und prüfen.');
  references.push({documentId:doc.id,documentVersionId:version.id,sourceHash:version.content_hash,...preview.result});
 }
 const protectedContent=revision.snapshot.elements.some((e:any)=>e.kind==='inscription'&&(e.locked||e.phase==='existing'));
 return{revision,variant,project,references,protectedContent,evidenceHash};
}
export function visualizationQuote(profile:any,p:z.infer<typeof visualizationInputSchema>){
 const references=p.reference_document_ids.length+(p.intent==='plan'?1:0),maxOutput=profile.imageMaxOutputTokens??8192,maxInput=profile.imageMaxInputTokensPerReference??8192;
 const rates={text:profile.imageTextCostPerMillion??'5',image:profile.imageInputCostPerMillion??'8',output:profile.imageOutputCostPerMillion??'30'};
 const estimated=dec(new TextEncoder().encode(p.prompt).length+16000).mul(rates.text).add(dec(references*maxInput).mul(rates.image)).add(dec(maxOutput).mul(rates.output)).div(1000000).toDecimalPlaces(6,0).toString(),limit=profile.imageMaxRequestCost??'0.5';
 requireRule(dec(estimated).lte(limit),'IMAGE_REQUEST_LIMIT','Die vorsichtige Kostenreservierung überschreitet das eingestellte Bildlimit. Weniger Vorlagen auswählen oder das Bildprofil in den Einstellungen prüfen.');
 return{estimatedMaxCost:estimated,maximum:limit,currency:'USD',rates,fallbackRates:{text:'5',image:'8',output:'30'},maxOutputTokens:maxOutput,maxInputTokensPerReference:maxInput,preferredModel:profile.imageModel??'gpt-image-2.5-flare',fallbackModel:profile.imageFallbackModel??'gpt-image-2',size:p.size,quality:p.quality,planReference:p.intent==='plan',connectionVersionId:profile.connectionVersionId??null};
}
register('planning.visualization.quote','planning',async r=>{
 const p=visualizationInputSchema.parse(r.payload),basis=await imageBasis(r.db,r.ctx,p),profile=await integrationConfiguration(r.ctx,'openai'),pricing=visualizationQuote(profile,p);
 return{id:basis.variant.id,version:basis.variant.version,revisionId:basis.revision.id,contentHash:basis.revision.content_hash,...pricing,protectedContent:basis.protectedContent,requestHash:hash({p,revision:basis.revision.content_hash,pricing,references:basis.references,evidenceHash:basis.evidenceHash})};
});
register('planning.visualization.request','planning',async r=>{
 const p=visualizationInputSchema.parse(r.payload),basis=await imageBasis(r.db,r.ctx,p);assertVersion(basis.variant.version,r.command.expectedVersion);
 const profile=await integrationConfiguration(r.ctx,'openai'),pricing=visualizationQuote(profile,p),requestHash=hash({p,revision:basis.revision.content_hash,pricing,references:basis.references,evidenceHash:basis.evidenceHash});
 requireRule(r.payload.cost_acknowledged===true&&r.payload.request_hash===requestHash&&String(r.payload.approved_maximum)===pricing.estimatedMaxCost,'IMAGE_COST_CONFIRM','Die konkrete Kostenvorschau erneut prüfen und ausdrücklich bestätigen.',409);
 await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['ai-visualization:'+r.ctx.tenantId+':'+r.ctx.legalEntityId+':'+requestHash]);
 const existing=await one<any>(r.db,"SELECT * FROM job_runs WHERE job_type='planning.ai_visualization' AND payload->>'requestHash'=$1 AND status IN('pending','retry','running','completed','outcome_unknown') ORDER BY created_at DESC LIMIT 1",[requestHash]);if(existing)return{...existing,command_noop:true};
 return r.insert('job_runs',{job_type:'planning.ai_visualization',name:'Fotorealistisches Konzept · '+pricing.preferredModel,payload:{...p,requestHash,revisionHash:basis.revision.content_hash,connectionVersionId:pricing.connectionVersionId,pricing,references:basis.references,protectedContent:basis.protectedContent,rightsEvidenceHash:basis.evidenceHash,rightsDeclaredBy:r.ctx.actorId},status:'pending'});
});
export async function runAIVisualization(ctx:ActorContext,job:any,deps:{guardLease:Function;generatedDocument:Function}){
 const p=job.payload,checkpoint=await withTenant(ctx,db=>one<any>(db,"SELECT d.* FROM documents d WHERE d.generation_key=$1 AND status='available'",[job.id+':design_revision:KI_Konzept_'+p.revision_id+'.png']));
 if(checkpoint)return{documentId:checkpoint.id,documentVersionId:checkpoint.current_version_id,revisionId:p.revision_id,accuracy:'generative_visualization',protectedContentRequiresComposite:p.protectedContent};
 const basis=await withTenant(ctx,db=>imageBasis(db,ctx,p));requireRule(basis.revision.content_hash===p.revisionHash&&basis.evidenceHash===p.rightsEvidenceHash,'IMAGE_SOURCE_CHANGED','Gebundener Plan- oder Nutzungsnachweis stimmt nicht mehr.');
 const references:{bytes:Uint8Array;name:string}[]=[];
 if(p.pricing.planReference){
  const pdf=await createPlanningPdf(basis.revision.snapshot,{title:basis.project.name??'Planung',revision:p.revision_id,status:'draft'});
  requireRule(pdf.length<=2800000,'IMAGE_PLAN_SIZE','Der Plan ist für eine Bildvorlage zu umfangreich. Eine einzelne Planansicht als Dokument verwenden.');
  const preview=await callWorker('/planning/source-preview',{bytes:Buffer.from(pdf).toString('base64'),mime:'application/pdf',pageIndex:0,maxDimension:1440}),bytes=Buffer.from(preview.pngBase64??'','base64');
  requireRule(bytes.length>24&&bytes.length<=2500000&&contentHash(bytes)===preview.previewHash,'IMAGE_PLAN_REFERENCE','Die gespeicherte Planansicht konnte nicht als Bildvorlage vorbereitet werden.');references.push({bytes,name:'saved-plan.png'});
 }
 for(const ref of p.references){
  const source=await withTenant(ctx,async db=>{const version=await getRecord(db,'document_versions',ref.document_version_id),doc=await getRecord(db,'documents',version.document_id);await assertDocumentAccess(db,ctx,doc);requireRule(doc.status==='available'&&version.status==='available'&&version.content_hash===ref.previewHash,'IMAGE_SOURCE_CHANGED','Eine gebundene Bildvorlage ist nicht mehr verfügbar.');return{version,blob:await getRecord(db,'blob_objects',version.blob_object_id)};});
  const bytes=await privateBytes(source.blob.storage_key,2500000,ctx);requireRule(contentHash(bytes)===ref.previewHash,'IMAGE_SOURCE_HASH','Bildvorlage wurde verändert.');references.push({bytes,name:'reference.png'});
 }
 const context=compactContext({snapshot:basis.revision.snapshot,entityType:'planning',designKind:basis.project.kind}),prompt=visualizationInstructions(basis.project.kind,p.intent??'plan',p.prompt)+'\nGespeicherte Planungsdaten als Orientierung: '+Buffer.from(JSON.stringify(context)).subarray(0,14000).toString('utf8');
 const {generateVisualization}=await import('@schubert/ai');await deps.guardLease(ctx,job);const output=await generateVisualization(ctx,prompt,references,false,{connectionVersionId:p.connectionVersionId,pricing:p.pricing,requestId:job.id});requireRule(output.bytes.length>24&&output.bytes.length<=2800000,'IMAGE_OUTPUT','Das Anbieterbild überschreitet die sichere Verarbeitungsgröße. Kein automatischer neuer Bildauftrag.');
 await deps.guardLease(ctx,job);const labelled=await callWorker('/image/label',{bytes:output.bytes.toString('base64'),label:'KI-Visualisierung · Konzept · keine technische Zeichnung',revision:p.revision_id});requireRule(labelled.contentHash&&labelled.pngBase64,'IMAGE_LABEL','Die Konzeptkennzeichnung konnte nicht bestätigt werden.');const bytes=Buffer.from(labelled.pngBase64,'base64');requireRule(contentHash(bytes)===labelled.contentHash,'IMAGE_LABEL_HASH','Bildkennzeichnung stimmt nicht mit dem gesicherten Ergebnis überein.');
 const doc=await deps.generatedDocument(ctx,bytes,'KI_Konzept_'+p.revision_id+'.png','image/png','design_revision',p.revision_id,'internal',job);await withTenant(ctx,db=>update(db,'ai_runs',output.runId,{result:{documentId:doc.id,documentVersionId:doc.current_version_id,revisionId:p.revision_id,contentHash:doc.content_hash,accuracy:'generative_visualization'}}));
 return{documentId:doc.id,documentVersionId:doc.current_version_id,revisionId:p.revision_id,model:output.model,actualCost:output.actualCost,quality:p.pricing.quality,size:p.pricing.size,intent:p.intent??'plan',accuracy:'generative_visualization',label:'KI-Visualisierung · keine technische Zeichnung',protectedContentRequiresComposite:p.protectedContent,providerRunId:output.runId};
}
