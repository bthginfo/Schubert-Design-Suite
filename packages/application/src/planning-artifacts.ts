import {zipSync} from 'fflate';
import {crc32,inflateSync} from 'node:zlib';
import {z} from 'zod';
import {designSnapshotSchema,type ActorContext,type DesignSnapshot} from '@schubert/contracts';
import {withTenant,one,rows,insert,update,type DbClient} from '@schubert/db';
import {requireRule,DomainError} from '@schubert/domain';
import {callWorker,contentHash,privateBytes} from '@schubert/adapters';
import {createPlanningPdf} from '@schubert/documents';
import {calculateBOM,validateDesign,renderTechnicalSvg} from '@schubert/geometry';
import {baseData,canonical,getRecord,hash} from './core.js';
import {validatePlanningReferences} from './planning.js';
import {buildRenderRequest,buildDocumentSource} from './render-request.js';
import {issueRenderUpload,readUploadedRender,clearRenderUpload} from './render-output.js';
import {compositeSources} from './planning-composite.js';

type ArtifactDocument={id:string;current_version_id:string;content_hash:string;[key:string]:any};
export type PlanningArtifactHelpers={
  generatedDocument:(ctx:ActorContext,bytes:Uint8Array,name:string,mime:string,entityType:string,entityId:string,audience:string,job:any)=>Promise<ArtifactDocument>;
  guardLease:(ctx:ActorContext,job:any)=>Promise<unknown>;
};
type SavedArtifact={kind:string;name:string;mime:string;documentId:string;documentVersionId:string;contentHash:string;byteLength:number;revisionId:string;revisionContentHash:string;bytes:Uint8Array};
const PNG_SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
const PACKAGE_VERSION='schubert-planning-package/1.0.0';

function inspectPng(bytes:Uint8Array){
  const png=Buffer.from(bytes);requireRule(png.length>=57&&png.subarray(0,8).equals(PNG_SIGNATURE),'RENDER_PNG','Der Worker hat keine vollständige PNG-Datei geliefert.');
  let width=0,height=0,depth=0,color=0,offset=8,finished=false;const compressed:Buffer[]=[];
  while(offset<png.length){requireRule(offset+12<=png.length,'RENDER_PNG','Ein Bilddatenblock ist unvollständig.');const size=png.readUInt32BE(offset),end=offset+size+12;requireRule(end<=png.length,'RENDER_PNG','Ein Bilddatenblock überschreitet die Originaldatei.');const type=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+size);requireRule(crc32(png.subarray(offset+4,offset+8+size))===png.readUInt32BE(offset+8+size),'RENDER_PNG','Die PNG-Prüfsumme ist ungültig.');
    if(offset===8)requireRule(type==='IHDR'&&size===13,'RENDER_PNG','Der native Bildkopf fehlt.');
    if(type==='IHDR'){requireRule(!width&&size===13,'RENDER_PNG','Mehrdeutiger Bildkopf.');width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];color=data[9];requireRule(width>0&&height>0&&width*height<=50_000_000&&[8,16].includes(depth)&&[0,2,4,6].includes(color)&&data[10]===0&&data[11]===0&&data[12]===0,'RENDER_PNG','Nicht unterstütztes oder zu großes natives Bildprofil.');}
    if(type==='IDAT')compressed.push(data);
    if(type==='IEND'){requireRule(size===0&&end===png.length,'RENDER_PNG','Daten nach dem Bildende sind nicht zulässig.');finished=true;}
    offset=end;
  }
  requireRule(finished&&compressed.length>0,'RENDER_PNG','Die nativen Bilddaten fehlen.');
  const channels=({0:1,2:3,4:2,6:4} as Record<number,number>)[color],expected=height*(1+width*channels*depth/8);let pixels:Buffer;
  try{pixels=inflateSync(Buffer.concat(compressed),{maxOutputLength:expected});}catch{throw new DomainError('RENDER_PNG','Die nativen Bilddaten sind beschädigt.',422);}
  requireRule(pixels.length===expected,'RENDER_PNG','Der Bilddatenumfang passt nicht zur nativen Auflösung.');return{width,height};
}

/** Check the returned PNG itself, rather than trusting dimensions in a worker response. */
export function verifyPlanningRender(revision:any,job:any,result:any,bytes:Uint8Array,profile:'preview'|'final'){
  requireRule(result.revisionId===revision.id&&result.contentHash===revision.content_hash&&result.jobId===job.id&&String(result.fencingToken)===String(job.fencing_token),'RENDER_BINDING','Renderbild gehört zu einem anderen Planstand oder Jobversuch.',409);
  const {width,height}=inspectPng(bytes);
  requireRule(width===result.width&&height===result.height&&width>0&&height>0&&width*height<=50_000_000,'RENDER_RESOLUTION','Bildinhalt und Auflösungsnachweis stimmen nicht überein.');
  requireRule(profile!=='final'||width>=3840&&height>=2160,'RENDER_RESOLUTION','Das endgültige Bild muss nativ mindestens 3840 × 2160 Pixel besitzen.');
  requireRule(contentHash(bytes)===result.imageHash,'RENDER_IMAGE_HASH','Bildinhalt und SHA-256-Nachweis stimmen nicht überein.');
  const manifest=result.manifest;
  requireRule(manifest&&manifest.revisionId===revision.id&&manifest.contentHash===revision.content_hash&&manifest.profile===profile&&manifest.generatorVersion==='schubert-blender/1.0.0'&&manifest.geometryEngineVersion===revision.snapshot.geometryEngineVersion&&manifest.unit==='mm'&&manifest.coordinateSystem==='right_handed_z_up'&&manifest.camera,'RENDER_MANIFEST','Vollständiger revisionsgebundener Kameranachweis fehlt.');
  if(job.payload?.sceneAdapterVersion)requireRule(manifest.sceneAdapterVersion===job.payload.sceneAdapterVersion,'RENDER_SCENE_VERSION','Der Worker verwendet nicht die für diesen Auftrag eingefrorene Szeneversion.');
  requireRule(typeof result.manifestCanonical==='string'&&contentHash(Buffer.from(result.manifestCanonical))===result.manifestHash,'RENDER_MANIFEST_HASH','Renderprotokoll und Inhaltsnachweis stimmen nicht überein.');
  let decoded:unknown;try{decoded=JSON.parse(result.manifestCanonical);}catch{throw new DomainError('RENDER_MANIFEST_HASH','Renderprotokoll ist ungültig.',422);}
  requireRule(hash(decoded)===hash(manifest),'RENDER_MANIFEST_HASH','Das angezeigte Renderprotokoll weicht vom archivierten Inhalt ab.');
  requireRule(['verified_geometry','model_based'].includes(result.accuracy),'RENDER_ACCURACY','Diese Ausgabe ist nicht als deterministischer Planrender gekennzeichnet.');
  return{width,height};
}

async function liveFence(db:DbClient,job:any){
  const live=await getRecord(db,'job_runs',job.id,true);
  requireRule(live.status==='running'&&String(live.fencing_token)===String(job.fencing_token)&&new Date(live.lease_until).getTime()>Date.now(),'JOB_LEASE_LOST','Dieser Jobversuch ist nicht mehr aktiv.',409);return live;
}

async function revisionData(ctx:ActorContext,job:any,forRelease=false){return withTenant(ctx,async db=>{
  await liveFence(db,job);const revision=await getRecord(db,'design_revisions',job.payload.revisionId),snapshot=designSnapshotSchema.parse(revision.snapshot);
  requireRule(snapshot.revisionId===revision.id&&hash(snapshot)===revision.content_hash,'PLANNING_REVISION_HASH','Planrevision und eingefrorener Inhalt stimmen nicht überein.');
  const variant=await getRecord(db,'design_variants',revision.variant_id),project=await getRecord(db,'planning_projects',variant.planning_project_id);
  requireRule(snapshot.planningProjectId===project.id&&snapshot.variantId===variant.id,'PLANNING_REVISION_SCOPE','Planinhalt gehört zu einem anderen Projekt.');
  const validation=validateDesign(snapshot,{forRelease});requireRule(!validation.blocking.length,'PLANNING_PACKAGE_INVALID',validation.blocking.join('\n'));
  await validatePlanningReferences(db,ctx,snapshot,forRelease);
  const fontIds=[...new Set(snapshot.elements.filter(e=>e.kind==='inscription').map(e=>e.fontVariantVersionId))].filter(id=>z.uuid().safeParse(id).success);
  const fonts=fontIds.length?await rows<any>(db,'SELECT id,name,selection_ref,material_article_ref,source_url FROM font_variants WHERE id=ANY($1::uuid[])',[fontIds]):[];
  return{revision:{...revision,snapshot},variant,project,validation,fonts};
});}

async function packageRelease(db:DbClient,ctx:ActorContext,job:any,revision:any){
  const packet=await getRecord(db,'release_packages',job.payload.releasePackageId,true),release=await getRecord(db,'manufacturing_releases',packet.release_id),manifest=await getRecord(db,'render_manifests',job.payload.manifestId??release.render_manifest_id);
  requireRule(packet.revision_id===revision.id&&release.revision_id===revision.id&&release.content_hash===revision.content_hash&&release.status==='released'&&release.render_manifest_id===manifest.id&&manifest.revision_id===revision.id&&packet.manifest_hash===manifest.content_hash&&hash(manifest.manifest)===manifest.content_hash&&manifest.manifest.revisionId===revision.id&&manifest.manifest.contentHash===revision.content_hash,'PLANNING_RELEASE_BINDING','Fertigungsfreigabe, eingefrorenes Manifest und Planrevision stimmen nicht überein.');
  requireRule(manifest.manifest.geometryVersion===revision.snapshot.geometryEngineVersion&&hash(manifest.manifest.assets)===hash(revision.snapshot.assetManifest),'PLANNING_RELEASE_ASSETS','Geometriekern oder Originaldateiversionen weichen von der Fertigungsfreigabe ab.');
  const approvals=await rows<any>(db,"SELECT * FROM design_approvals WHERE revision_id=$1 AND content_hash=$2 AND status='approved'",[revision.id,revision.content_hash]);
  for(const kind of ['technical','design',...(revision.snapshot.elements.some((e:any)=>e.kind==='inscription')?['inscription']:[])])requireRule(approvals.some(a=>a.kind===kind),'PLANNING_APPROVAL_REQUIRED',`Die getrennte Zustimmung „${kind}“ für genau diesen Inhaltsstand fehlt.`);
  const entity=await getRecord(db,'legal_entities',ctx.legalEntityId);requireRule(entity.manufacturing_approved,'MANUFACTURING_PROFILE','Die technische Fertigungszuständigkeit ist nicht freigegeben.');
  const variant=await getRecord(db,'design_variants',revision.variant_id),project=await getRecord(db,'planning_projects',variant.planning_project_id);
  if(project.grave_plot_id){const grave=await getRecord(db,'grave_plots',project.grave_plot_id);if(grave.permit_required)requireRule(await one(db,'SELECT id FROM grave_permissions WHERE grave_plot_id=$1 AND revision_id=$2 AND approved_at IS NOT NULL',[grave.id,revision.id]),'CEMETERY_PERMIT','Die erforderliche Friedhofsgenehmigung für diesen Planstand fehlt.');}
  await validatePlanningReferences(db,ctx,revision.snapshot,true);return{packet,release,manifest,approvals};
}

async function archive(ctx:ActorContext,job:any,helpers:PlanningArtifactHelpers,revision:any,kind:string,name:string,mime:string,bytes:Uint8Array,audience='internal'):Promise<SavedArtifact>{
  await helpers.guardLease(ctx,job);const key=`${job.id}:${kind}`;
  const doc=await helpers.generatedDocument(ctx,bytes,name,mime,'design_revision',revision.id,audience,{...job,generationKey:key,generation_key:key});
  // The document checkpoint may already exist from an earlier attempt. Use its real original bytes.
  const source=await withTenant(ctx,async db=>{await liveFence(db,job);const document=await getRecord(db,'documents',doc.id),version=await getRecord(db,'document_versions',doc.current_version_id),blob=await getRecord(db,'blob_objects',version.blob_object_id);
    requireRule(document.current_version_id===version.id&&version.document_id===document.id&&document.entity_type==='design_revision'&&document.entity_id===revision.id&&document.mime_type===mime&&document.status==='available'&&version.status==='available'&&blob.status==='available'&&blob.scan_status==='trusted_generator'&&document.content_hash===version.content_hash&&version.content_hash===blob.content_hash&&blob.storage_key.startsWith(ctx.tenantId+'/'),'PLANNING_ARTIFACT_SOURCE','Archiviertes Teilartefakt ist nicht vollständig revisionsgebunden verfügbar.');return{document,version,blob};});
  const storedBytes=source.version.content_hash===contentHash(bytes)?bytes:await privateBytes(source.blob.storage_key,100*1024*1024,ctx);
  requireRule(contentHash(storedBytes)===source.version.content_hash&&storedBytes.length===Number(source.blob.size_bytes),'PLANNING_ARTIFACT_HASH','Archivierte Originalbytes stimmen nicht mit dem Teilartefaktnachweis überein.');
  return{kind,name,mime,documentId:source.document.id,documentVersionId:source.version.id,contentHash:source.version.content_hash,byteLength:storedBytes.length,revisionId:revision.id,revisionContentHash:revision.content_hash,bytes:storedBytes};
}
function descriptor({bytes,...metadata}:SavedArtifact){return metadata;}
async function publishRenderRecord(ctx:ActorContext,job:any,revision:any,output:{image:SavedArtifact;result:any;dimensions:{width:number;height:number}}){await withTenant(ctx,async db=>{await liveFence(db,job);const exists=await one(db,'SELECT id FROM render_artifacts WHERE revision_id=$1 AND document_id=$2',[revision.id,output.image.documentId]);if(!exists)await insert(db,'render_artifacts',{...baseData(ctx),revision_id:revision.id,document_id:output.image.documentId,content_hash:output.image.contentHash,kind:'deterministic_render',width_px:output.dimensions.width,height_px:output.dimensions.height,accuracy:output.result.accuracy,status:'available'});});}

async function renderCheckpoint(ctx:ActorContext,job:any,revision:any,profile:'preview'|'final'){
  const checkpoints=await withTenant(ctx,async db=>{await liveFence(db,job);const docs=await rows<any>(db,"SELECT * FROM documents WHERE source_job_id=$1 AND generation_key=ANY($2::text[]) AND status='available'",[job.id,['render','render_mask','render_manifest'].map(kind=>`${job.id}:${kind}`)]);if(!docs.some(d=>d.generation_key===`${job.id}:render`)||!docs.some(d=>d.generation_key===`${job.id}:render_manifest`))return null;
    const records=[];for(const doc of docs){const version=await getRecord(db,'document_versions',doc.current_version_id),blob=await getRecord(db,'blob_objects',version.blob_object_id);requireRule(doc.entity_type==='design_revision'&&doc.entity_id===revision.id&&version.status==='available'&&version.content_hash===doc.content_hash&&blob.content_hash===doc.content_hash&&blob.scan_status==='trusted_generator'&&blob.status==='available'&&blob.storage_key.startsWith(ctx.tenantId+'/'),'RENDER_CHECKPOINT_SOURCE','Gespeicherter Rendercheckpoint ist nicht vollständig verfügbar.');records.push({doc,version,blob});}return records;});
  if(!checkpoints)return null;const saved:SavedArtifact[]=[];
  for(const {doc,version,blob}of checkpoints){const bytes=await privateBytes(blob.storage_key,40*1024*1024,ctx);requireRule(contentHash(bytes)===doc.content_hash&&bytes.length===Number(blob.size_bytes),'RENDER_CHECKPOINT_HASH','Archivierter Rendercheckpoint wurde verändert.');saved.push({kind:doc.generation_key.slice(job.id.length+1),name:doc.name,mime:doc.mime_type,documentId:doc.id,documentVersionId:version.id,contentHash:doc.content_hash,byteLength:bytes.length,revisionId:revision.id,revisionContentHash:revision.content_hash,bytes});}
  const image=saved.find(a=>a.kind==='render')!,mask=saved.find(a=>a.kind==='render_mask'),proofDocument=saved.find(a=>a.kind==='render_manifest')!;let proof:any,manifest:any;try{proof=JSON.parse(Buffer.from(proofDocument.bytes).toString('utf8'));manifest=JSON.parse(proof.workerManifestCanonical);}catch{return null;}
  requireRule(proof.sourceJobId===job.id&&proof.imageHash===image.contentHash&&(!proof.maskHash||mask?.contentHash===proof.maskHash),'RENDER_CHECKPOINT_BINDING','Gespeicherte Renderbestandteile gehören nicht zum selben Originalbild.');
  const result={...proof,manifest,manifestCanonical:proof.workerManifestCanonical,manifestHash:proof.workerManifestHash,imageHash:image.contentHash,revisionId:revision.id,contentHash:revision.content_hash,jobId:job.id,fencingToken:String(job.fencing_token),reusedArchivedOriginal:true};
  const dimensions=verifyPlanningRender(revision,job,result,image.bytes,profile);if(mask){const size=inspectPng(mask.bytes);requireRule(size.width===dimensions.width&&size.height===dimensions.height,'RENDER_MASK','Archivierte Schutzmaske passt nicht zum Originalbild.');}
  const protectedIds=revision.snapshot.elements.filter((e:any)=>e.kind==='inscription'&&e.phase!=='demolition'&&(e.locked||e.phase==='existing')).map((e:any)=>e.id);requireRule(!protectedIds.length||mask&&protectedIds.every((id:string)=>manifest.protectedElementIds?.includes(id)),'RENDER_PROTECTION_REQUIRED','Archivierter Schutzmaskennachweis ist unvollständig.');
  return{image,mask,proofDocument,proof,result,dimensions};
}

async function render(ctx:ActorContext,job:any,helpers:PlanningArtifactHelpers,revision:any,profile:'preview'|'final'){
  await helpers.guardLease(ctx,job);const request=await buildRenderRequest(ctx,revision,{...job,payload:{...job.payload,profile}});
  if(profile==='final'){
    requireRule(!request.geometry.warnings.length,'RENDER_FINAL_GEOMETRY',request.geometry.warnings.join('\n'));
    for(const e of revision.snapshot.elements as DesignSnapshot['elements'])if(e.phase!=='demolition'&&e.kind==='inscription')requireRule(e.renderingBasis==='verified_contours'&&e.glyphPlacements.length>0,'RENDER_ORIGINALS_REQUIRED','Ein endgültiger Render benötigt lizenzierte Originalzeichen und deren echte Platzierung. Shopabbildungen belegen keine Herstellerkontur.');
  }
  const checkpoint=await renderCheckpoint(ctx,job,revision,profile);if(checkpoint){await publishRenderRecord(ctx,job,revision,checkpoint);return checkpoint;}
  const upload=await issueRenderUpload(ctx,job);
  try{
  const result=await callWorker('/render',{...request,outputTargets:upload.targets});const image=await readUploadedRender(ctx,job,result,upload.ticket,'image'),dimensions=verifyPlanningRender(revision,job,result,image,profile);
  const saved=await archive(ctx,job,helpers,revision,'render',`Planansicht_Revision_${revision.revision_number}.png`,'image/png',image,'customer');
  requireRule(saved.contentHash===result.imageHash,'RENDER_CHECKPOINT_CHANGED','Ein früher archivierter Render dieses Jobs besitzt andere Originalbytes.',409);
  let mask:SavedArtifact|undefined;
  const protectedIds=revision.snapshot.elements.filter((e:any)=>e.kind==='inscription'&&e.phase!=='demolition'&&(e.locked||e.phase==='existing')).map((e:any)=>e.id);
  if(result.maskBlob){const maskBytes=await readUploadedRender(ctx,job,result,upload.ticket,'mask'),maskSize=inspectPng(maskBytes);requireRule(maskSize.width===dimensions.width&&maskSize.height===dimensions.height&&contentHash(maskBytes)===result.maskHash,'RENDER_MASK','Schutzmaske und Renderkamera stimmen nicht überein.');mask=await archive(ctx,job,helpers,revision,'render_mask','Bestandsinschrift_Schutzmaske.png','image/png',maskBytes);}
  requireRule(!protectedIds.length||mask&&protectedIds.every((id:string)=>result.manifest.protectedElementIds?.includes(id)),'RENDER_PROTECTION_REQUIRED','Eine vorhandene gesperrte Inschrift besitzt noch keine überprüfbare Schutzmaske.');
  const proof={...result.manifest,imageHash:saved.contentHash,maskHash:mask?.contentHash??null,width:dimensions.width,height:dimensions.height,accuracy:result.accuracy,workerManifestHash:result.manifestHash,workerManifestCanonical:result.manifestCanonical,sourceJobId:job.id,sourceFencingToken:String(job.fencing_token)};
  const proofDocument=await archive(ctx,job,helpers,revision,'render_manifest','Renderprotokoll.json','application/json',Buffer.from(canonical(proof)));
  await publishRenderRecord(ctx,job,revision,{image:saved,result,dimensions});
  return{image:saved,mask,proofDocument,proof,result,dimensions};
  }finally{await clearRenderUpload(ctx,job,upload.ticket);}
}

export function verifyPlanningComposite(revision:any,job:any,result:any,bytes:Uint8Array,sources:any){
  const size=inspectPng(bytes),manifest=result.manifest;
  requireRule(result.jobId===job.id&&String(result.fencingToken)===String(job.fencing_token)&&result.revisionId===revision.id&&result.contentHash===revision.content_hash&&result.sourceJobId===sources.sourceJob.id,'COMPOSITE_RESULT_BINDING','Konzeptbild gehört zu einem anderen Jobversuch oder Originalplanstand.',409);
  requireRule(size.width===result.width&&size.height===result.height&&size.width===sources.proof.width&&size.height===sources.proof.height&&contentHash(bytes)===result.imageHash&&result.sourceImageHash===sources.image.version.content_hash&&result.maskHash===sources.mask.version.content_hash&&result.candidateHash===sources.candidate.version.content_hash,'COMPOSITE_IMAGE_PROOF','Bildinhalt, ursprünglicher Kameraausschnitt oder Schutzmaskennachweis stimmen nicht überein.');
  requireRule(result.accuracy==='concept_visualization_with_protected_original_pixels'&&manifest?.operation==='protected-composite/v1'&&manifest.revisionId===revision.id&&manifest.contentHash===revision.content_hash&&manifest.sourceJobId===sources.sourceJob.id&&manifest.sourceManifestHash===sources.proof.workerManifestHash&&manifest.pixelProtection==='all_nonzero_mask_pixels_copied_from_original_rgba_without_blending'&&manifest.width===size.width&&manifest.height===size.height&&hash(manifest.camera)===hash(sources.workerManifest.camera)&&hash(manifest.sourceHashes)===hash([sources.image.version.content_hash,sources.mask.version.content_hash,sources.candidate.version.content_hash])&&sources.protectedIds.every((id:string)=>manifest.protectedElementIds?.includes(id)),'COMPOSITE_PIXEL_PROOF','Der vollständige Bestandsschutz- und Kameranachweis der Bildableitung fehlt.');
  requireRule(typeof result.manifestCanonical==='string'&&contentHash(Buffer.from(result.manifestCanonical))===result.manifestHash,'COMPOSITE_MANIFEST_HASH','Der Inhaltsnachweis des Konzeptprotokolls ist ungültig.');
  let decoded:any;try{decoded=JSON.parse(result.manifestCanonical);}catch{throw new DomainError('COMPOSITE_MANIFEST_HASH','Das Konzeptprotokoll ist nicht lesbar.',422);}requireRule(hash(decoded)===hash(manifest),'COMPOSITE_MANIFEST_HASH','Angezeigtes und archiviertes Konzeptprotokoll weichen voneinander ab.');return size;
}

async function protectedComposite(ctx:ActorContext,job:any,helpers:PlanningArtifactHelpers){
  await helpers.guardLease(ctx,job);
  const sources=await withTenant(ctx,async db=>{await liveFence(db,job);return compositeSources(db,ctx,job.payload.input);}),{revision}=sources;
  const hashes={image:sources.image.version.content_hash,mask:sources.mask.version.content_hash,proof:sources.proofDocument.version.content_hash,candidate:sources.candidate.version.content_hash,rights:sources.rights.version.content_hash};
  requireRule(revision.id===job.payload.revisionId&&hash(hashes)===hash(job.payload.sourceHashes)&&job.payload.usageDeclaration?.evidenceDocumentVersionId===sources.rights.version.id&&job.payload.usageDeclaration.evidenceContentHash===sources.rights.version.content_hash,'COMPOSITE_INPUT_CHANGED','Die freigegebenen Bild- und Nutzungsnachweise wurden seit der Beauftragung verändert.',409);
  const ref=(source:any)=>{const bound=buildDocumentSource(ctx,source.version,source.blob,job);return{sourceRef:bound.token,sourceHash:bound.contentHash,byteLength:bound.byteLength};};
  requireRule([sources.image,sources.mask,sources.candidate].reduce((sum,s)=>sum+Number(s.blob.size_bytes),0)<=80*1024*1024,'COMPOSITE_IMAGE_LIMIT','Die drei Originalbilder überschreiten gemeinsam das sichere Verarbeitungslimit.');
  const upload=await issueRenderUpload(ctx,job);
  try{
    const request={jobId:job.id,fencingToken:String(job.fencing_token),revisionId:revision.id,contentHash:revision.content_hash,sourceJobId:sources.sourceJob.id,sourceFencingToken:String(sources.proof.sourceFencingToken),sourceManifest:sources.proof,originalRef:ref(sources.image),maskRef:ref(sources.mask),candidateRef:ref(sources.candidate),outputTargets:upload.targets};
    requireRule(Buffer.byteLength(JSON.stringify(request))<=4_000_000,'COMPOSITE_REQUEST_LIMIT','Der gebundene Konzeptauftrag überschreitet das sichere Transportlimit.');
    const result=await callWorker('/composite',request),image=await readUploadedRender(ctx,job,result,upload.ticket,'image'),size=verifyPlanningComposite(revision,job,result,image,sources),mask=await readUploadedRender(ctx,job,result,upload.ticket,'mask'),maskSize=inspectPng(mask);
    requireRule(contentHash(mask)===sources.mask.version.content_hash&&maskSize.width===size.width&&maskSize.height===size.height,'COMPOSITE_MASK_CHANGED','Die Bildableitung hat die archivierte Bestandsmaske verändert.');
    const saved=await archive(ctx,job,helpers,revision,'concept','Konzeptbild_mit_geschuetzter_Bestandsinschrift.png','image/png',image,'customer');requireRule(saved.contentHash===result.imageHash,'COMPOSITE_CHECKPOINT_CHANGED','Der archivierte Konzeptcheckpoint besitzt andere Originalbytes.',409);
    const proof={schemaVersion:'schubert-protected-composite/1.0.0',conceptJobId:job.id,revisionId:revision.id,contentHash:revision.content_hash,sourceJobId:sources.sourceJob.id,sourceFencingToken:sources.proof.sourceFencingToken,originalImageVersionId:sources.image.version.id,originalMaskVersionId:sources.mask.version.id,originalProofVersionId:sources.proofDocument.version.id,candidateVersionId:sources.candidate.version.id,imageHash:saved.contentHash,sourceHashes:hashes,usageDeclaration:job.payload.usageDeclaration,width:size.width,height:size.height,accuracy:result.accuracy,workerManifestHash:result.manifestHash,workerManifestCanonical:result.manifestCanonical};
    const proofFile=await archive(ctx,job,helpers,revision,'concept_manifest','Konzeptbild_Bestandsschutz_Nachweis.json','application/json',Buffer.from(canonical(proof)));
    await withTenant(ctx,async db=>{await liveFence(db,job);await compositeSources(db,ctx,job.payload.input);const exists=await one(db,'SELECT id FROM render_artifacts WHERE revision_id=$1 AND document_id=$2',[revision.id,saved.documentId]);if(!exists)await insert(db,'render_artifacts',{...baseData(ctx),revision_id:revision.id,document_id:saved.documentId,content_hash:saved.contentHash,kind:'protected_composite',width_px:size.width,height_px:size.height,accuracy:result.accuracy,status:'available'});});
    return{revisionId:revision.id,contentHash:revision.content_hash,documentId:saved.documentId,documentVersionId:saved.documentVersionId,manifestDocumentId:proofFile.documentId,sourceJobId:sources.sourceJob.id,width:size.width,height:size.height,accuracy:result.accuracy,conceptOnly:true};
  }finally{await clearRenderUpload(ctx,job,upload.ticket);}
}

/** Only complete, archived artifacts can make a manufacturing package ready. */
export async function runPlanningArtifact(ctx:ActorContext,job:any,helpers:PlanningArtifactHelpers){
  requireRule(['planning.render','planning.package','planning.composite'].includes(job.job_type),'PLANNING_JOB_TYPE','Dieser Verarbeitungspfad gehört zu keinem Planungsartefakt.');
  if(job.job_type==='planning.composite')return protectedComposite(ctx,job,helpers);
  const isPackage=job.job_type==='planning.package';
  try{
    const data=await revisionData(ctx,job,isPackage),{revision,project,fonts}=data;
    if(!isPackage){const output=await render(ctx,job,helpers,revision,job.payload.profile==='final'?'final':'preview');return{revisionId:revision.id,contentHash:revision.content_hash,documentId:output.image.documentId,documentVersionId:output.image.documentVersionId,manifestDocumentId:output.proofDocument.documentId,maskDocumentId:output.mask?.documentId??null,width:output.dimensions.width,height:output.dimensions.height,accuracy:output.result.accuracy};}
    const release=await withTenant(ctx,async db=>{await liveFence(db,job);return packageRelease(db,ctx,job,revision);});
    if(release.packet.package_ready){const report=release.packet.validation_report;requireRule(report?.zipDocumentId&&report?.manifestDocumentId&&report.revisionId===revision.id&&report.contentHash===revision.content_hash&&report.renderWidth>=3840&&report.renderHeight>=2160&&report.artifacts?.length>=6,'PLANNING_PACKAGE_INCOMPLETE','Ein älteres Paket ohne vollständiges Archiv benötigt eine erneute Paketerstellung.');await withTenant(ctx,async db=>{await liveFence(db,job);for(const artifact of report.artifacts){const version=await getRecord(db,'document_versions',artifact.documentVersionId),doc=await getRecord(db,'documents',artifact.documentId);requireRule(doc.status==='available'&&version.status==='available'&&version.document_id===doc.id&&doc.entity_id===revision.id&&version.content_hash===artifact.contentHash,'PLANNING_PACKAGE_INCOMPLETE','Ein archiviertes Teilartefakt ist nicht mehr vollständig verfügbar.');}});return report;}
    const fontLabels=Object.fromEntries(fonts.map(f=>[f.id,f.name])),fontReferences=Object.fromEntries(fonts.map(f=>[f.id,{sourceUrl:f.source_url??undefined,selectionRef:f.selection_ref??undefined,materialArticleRef:f.material_article_ref??undefined}]));
    const pdf=await createPlanningPdf(revision.snapshot,{title:project.name??'Fertigungspaket',revision:String(revision.revision_number),status:'Zur Fertigung freigegeben',audience:'internal',contentHash:revision.content_hash,projectReference:project.number??project.id,orderReference:project.order_id??undefined,createdBy:revision.created_by??undefined,generatedAt:new Date(revision.created_at).toISOString(),fontLabels,fontReferences});
    const technical=await archive(ctx,job,helpers,revision,'technical_pdf','Technische_Zeichnung.pdf','application/pdf',pdf);
    const bom=calculateBOM(revision.snapshot),bomFile=await archive(ctx,job,helpers,revision,'bom','Stueckliste.json','application/json',Buffer.from(canonical({...bom,revisionId:revision.id,contentHash:revision.content_hash,geometryEngineVersion:revision.snapshot.geometryEngineVersion})));
    const frozenBom=await withTenant(ctx,db=>one<any>(db,"SELECT * FROM bom_snapshots WHERE revision_id=$1 AND content_hash=$2 AND status='frozen' ORDER BY created_at LIMIT 1",[revision.id,revision.content_hash]));
    requireRule(frozenBom&&hash(frozenBom.lines)===hash(bom.lines),'PLANNING_BOM_MISMATCH','Stückliste und eingefrorene Fertigungsfreigabe stimmen nicht überein.');
    const output=await render(ctx,job,helpers,revision,'final');
    const artifacts:SavedArtifact[]=[technical,bomFile,output.image,output.proofDocument,...(output.mask?[output.mask]:[])];
    const extras:Record<string,Uint8Array>={'Planstand.json':Buffer.from(canonical(revision.snapshot))};
    for(const view of ['front','top','side'] as const)extras[`Ansicht_${view}.svg`]=Buffer.from(renderTechnicalSvg(revision.snapshot,view,20));
    const manifest={schemaVersion:PACKAGE_VERSION,revisionId:revision.id,contentHash:revision.content_hash,revisionNumber:revision.revision_number,planningProjectId:project.id,variantId:revision.variant_id,releaseId:release.release.id,releaseManifestId:release.manifest.id,releaseManifestHash:release.manifest.content_hash,geometryEngineVersion:revision.snapshot.geometryEngineVersion,documentGeneratorVersion:'schubert-documents-1',renderGeneratorVersion:output.result.manifest.generatorVersion,generatedAt:new Date(release.release.created_at).toISOString(),audience:'internal',unit:'mm',coordinateSystem:'right_handed_z_up',render:{width:output.dimensions.width,height:output.dimensions.height,accuracy:output.result.accuracy,imageHash:output.image.contentHash,manifestHash:output.result.manifestHash,camera:output.result.manifest.camera,warnings:output.result.manifest.warnings??[]},approvalIds:release.approvals.map(a=>a.id).sort(),artifacts:artifacts.map(descriptor),additionalFiles:Object.entries(extras).map(([name,bytes])=>({name,contentHash:contentHash(bytes),byteLength:bytes.length})),validation:data.validation,rightsNotice:'Originaldateien bleiben privat. Dieses Paket enthält keine zusätzliche Nutzungs- oder Herstellerfreigabe.'};
    const manifestFile=await archive(ctx,job,helpers,revision,'manifest','Manifest.json','application/json',Buffer.from(canonical(manifest)));
    const files:Record<string,[Uint8Array,{mtime:Date;level:0}]>={};const mtime=new Date('2000-01-01T00:00:00.000Z');
    for(const artifact of [...artifacts,manifestFile])files[artifact.name]=[artifact.bytes,{mtime,level:0}];for(const[name,bytes]of Object.entries(extras))files[name]=[bytes,{mtime,level:0}];
    requireRule(Object.values(files).reduce((sum,[bytes])=>sum+bytes.length,0)<=100*1024*1024,'PLANNING_PACKAGE_SIZE','Fertigungspaket überschreitet die Archivgrenze. Eine dokumentierte Teilfreigabe verwenden.');
    const zipFile=await archive(ctx,job,helpers,revision,'zip',`Fertigungspaket_Revision_${revision.revision_number}.zip`,'application/zip',zipSync(files));
    const report={revisionId:revision.id,contentHash:revision.content_hash,releaseId:release.release.id,technicalPdf:technical.documentId,pdfDocumentId:technical.documentId,bom:bomFile.documentId,bomDocumentId:bomFile.documentId,renderDocumentId:output.image.documentId,renderManifestDocumentId:output.proofDocument.documentId,maskDocumentId:output.mask?.documentId??null,manifestDocumentId:manifestFile.documentId,manifestDocumentVersionId:manifestFile.documentVersionId,manifestContentHash:manifestFile.contentHash,zipDocumentId:zipFile.documentId,zipDocumentVersionId:zipFile.documentVersionId,zipContentHash:zipFile.contentHash,artifacts:[...artifacts,manifestFile,zipFile].map(descriptor),renderWidth:output.dimensions.width,renderHeight:output.dimensions.height,accuracy:output.result.accuracy,validation:data.validation,packageVersion:PACKAGE_VERSION};
    await withTenant(ctx,async db=>{await liveFence(db,job);const current=await packageRelease(db,ctx,job,revision);for(const artifact of [...artifacts,manifestFile,zipFile]){const version=await getRecord(db,'document_versions',artifact.documentVersionId),doc=await getRecord(db,'documents',artifact.documentId);requireRule(doc.status==='available'&&version.status==='available'&&doc.entity_id===revision.id&&version.document_id===doc.id&&version.content_hash===artifact.contentHash,'PLANNING_PACKAGE_INCOMPLETE','Ein Teilartefakt wurde vor Abschluss zurückgezogen.');}await update(db,'release_packages',current.packet.id,{package_ready:true,status:'package_ready',validation_report:report},current.packet.version);});
    return report;
  }catch(error){
    if(isPackage)await withTenant(ctx,async db=>{await liveFence(db,job);const packet=await getRecord(db,'release_packages',job.payload.releasePackageId,true);if(!packet.package_ready||error instanceof DomainError&&error.code==='PLANNING_PACKAGE_INCOMPLETE')await update(db,'release_packages',packet.id,{package_ready:false,status:'blocked',validation_report:{revisionId:job.payload.revisionId,blocked:true,code:error instanceof DomainError?error.code:'PLANNING_PROCESSING_FAILED',message:error instanceof DomainError?error.message:'Das Paket konnte noch nicht vollständig archiviert werden.',jobId:job.id}},packet.version);}).catch(()=>undefined);
    throw error;
  }
}
