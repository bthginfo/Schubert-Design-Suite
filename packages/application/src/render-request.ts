import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {ActorContext,Contour,DesignSnapshot} from '@schubert/contracts';
import {designSnapshotSchema} from '@schubert/contracts';
import {withTenant,one} from '@schubert/db';
import {requireRule} from '@schubert/domain';
import {privateBytes,readPrivate,callWorker} from '@schubert/adapters';
import {validateDesign,worldMatrix,surfaceMatrix,worldPoint,measureValue,roomContour,multiplyMatrix,transformMatrix,IDENTITY_TRANSFORM,hasAssetUsage,wallCoreEnds,wallCoreMesh,wallLayerMeshes,layerSlices,withThroughCutouts,miterCut,machiningDepth,mm,wallJoinConsistencyIssues} from '@schubert/geometry';
import {canonical,hash,getRecord} from './core.js';
import {assertDocumentAccess} from './document-access.js';
export const RENDER_SCENE_VERSION='schubert-scene/1.0.3';

/** The worker never receives storage credentials, a mutable catalogue or a remote URL. */
export async function buildRenderRequest(ctx:ActorContext,revision:any,job:any){
  const snapshot=designSnapshotSchema.parse(revision.snapshot),validation=validateDesign(snapshot);
  requireRule(hash(snapshot)===revision.content_hash,'RENDER_REVISION_HASH','Der eingefrorene Geometrieinhalt stimmt nicht mit der Revision überein.');
  requireRule(!validation.blocking.length,'RENDER_GEOMETRY',validation.blocking.join('\n'));
  const selected=await withTenant(ctx,async db=>{
    const records:any[]=[];
    const approvedEvidence=new Set<string>();
    for(const entry of snapshot.assetManifest){
      if(entry.purpose==='technical_document')continue; // Evidence stays revision-bound, but is not an image/model sent to Blender.
      const asset=await one<any>(db,'SELECT * FROM product_assets WHERE id=$1',[entry.assetVersionId])??await one<any>(db,'SELECT * FROM glyph_assets WHERE id=$1',[entry.assetVersionId]);
      requireRule(asset?.tenant_id===ctx.tenantId&&asset?.legal_entity_id===ctx.legalEntityId&&asset.approved_at&&asset.rights_verified,'RENDER_ASSET_RIGHTS','Eine ausgewählte Originaldatei ist nicht für die Verwendung freigegeben.');
      requireRule(hasAssetUsage(asset,'customer_visualization'),'RENDER_ASSET_PURPOSE','Diese Originalversion besitzt noch keinen ausdrücklich belegten Nutzungsumfang für Kundenvisualisierungen.');
      requireRule(entry.contentHash===asset.content_hash&&entry.rightsVerified===asset.rights_verified&&entry.geometryVerified===asset.geometry_verified,'RENDER_ASSET_HASH','Der eingefrorene Assetnachweis stimmt nicht mit der tatsächlich geprüften Version überein.');
      requireRule(asset.license_document_version_id,'RENDER_ASSET_LICENSE','Der konkrete versionierte Nutzungsnachweis fehlt.');
      for(const id of[asset.source_document_version_id,asset.document_version_id,asset.license_document_version_id,asset.evidence_version_id,asset.fastening_document_version_id].filter(Boolean))if(!approvedEvidence.has(id)){
        const proof=await getRecord(db,'document_versions',id),doc=await getRecord(db,'documents',proof.document_id),stored=await getRecord(db,'blob_objects',proof.blob_object_id);
        if(ctx.actorType!=='service')await assertDocumentAccess(db,ctx,doc);
        requireRule(proof.status==='available'&&doc.status==='available'&&stored.status==='available'&&['clean','trusted_generator'].includes(stored.scan_status)&&proof.content_hash===stored.content_hash&&stored.storage_key.startsWith(ctx.tenantId+'/'),'RENDER_ASSET_EVIDENCE','Ein Rechte-, Original- oder Geometrienachweis wurde zurückgezogen oder ist nicht mehr geprüft verfügbar.');approvedEvidence.add(id);
      }
      const version=await getRecord(db,'document_versions',asset.document_version_id??asset.source_document_version_id),document=await getRecord(db,'documents',version.document_id),blob=await getRecord(db,'blob_objects',version.blob_object_id);
      for(const row of[version,document,blob])requireRule(row.tenant_id===ctx.tenantId&&row.legal_entity_id===ctx.legalEntityId,'RENDER_ASSET_SCOPE','Originalquelle ist für dieses Unternehmen nicht verfügbar.');
      requireRule(version.status==='available'&&document.status==='available'&&blob.scan_status==='clean'&&version.content_hash===blob.content_hash&&blob.storage_key.startsWith(ctx.tenantId+'/'),'RENDER_ASSET_QUARANTINE','Nur geprüfte private Originaldateiversionen lassen sich rendern.');
      records.push({asset,entry,version,blob});
    }
    return records;
  });
  let total=0;const privateAssets=[];
  for(const {asset,entry,version,blob}of selected){
    const size=Number(blob.size_bytes);total+=size;requireRule(size>0&&size<=40*1024*1024&&total<=80*1024*1024,'RENDER_ASSET_LIMIT','Dieser Render benötigt eine kleinere, freigegebene LOD-Ableitung.');
    const sourceRef=signAssetToken({tenantId:ctx.tenantId,legalEntityId:ctx.legalEntityId,documentVersionId:version.id,sourceHash:version.content_hash,size,jobId:job.id,fencingToken:String(job.fencing_token),expiresAt:Date.now()+900000});
    privateAssets.push({assetVersionId:asset.id,contentHash:entry.contentHash,sourceHash:version.content_hash,sourceRef,byteLength:size,kind:entry.purpose,rightsVerified:true,usageScopes:asset.validation_report.usageScopes,geometryVerified:!!asset.geometry_verified,sourceAxes:{unit:asset.source_unit??'mm',up:asset.source_up_axis??'Z',forward:asset.source_forward_axis??'Y',handedness:asset.source_handedness??'right_handed'},contour:asset.contour??asset.validation_report?.contour??null,nominalHeightMm:asset.nominal_font_height_mm??null,format:asset.validation_report?.format??null});
  }
  const request={snapshot,canonicalSnapshot:canonical(snapshot),contentHash:revision.content_hash,profile:job.payload.profile,jobId:job.id,fencingToken:String(job.fencing_token),privateAssets,geometry:renderGeometry(snapshot),generatorVersion:'schubert-blender/1.0.0',sceneAdapterVersion:job.payload.sceneAdapterVersion??RENDER_SCENE_VERSION};
  requireRule(Buffer.byteLength(JSON.stringify(request))<=4_000_000,'RENDER_MODEL_LIMIT','Geometrieauftrag überschreitet das Transportlimit. Eine fachlich geprüfte Teil-/LOD-Ausgabe verwenden.');return request;
}

const assetTokenSchema=z.object({tenantId:z.uuid(),legalEntityId:z.uuid(),documentVersionId:z.uuid(),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),size:z.number().int().positive().max(40*1024*1024),jobId:z.uuid(),fencingToken:z.string().regex(/^\d+$/),expiresAt:z.number().int(),purpose:z.enum(['catalog','candidate','document']).optional()});
function assetTokenKey(){const master=process.env.BETTER_AUTH_SECRET;requireRule(master&&master.length>=32,'RENDER_ASSET_KEY','Serverseitiger Signaturschlüssel fehlt.',503);return createHmac('sha256',master).update('schubert-private-render-assets/v1').digest();}
function signAssetToken(payload:z.infer<typeof assetTokenSchema>){const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');return encoded+'.'+createHmac('sha256',assetTokenKey()).update(encoded).digest('base64url');}
/** The scanner can read its exact quarantined source; all other jobs require a clean source. */
export function buildDocumentSource(ctx:ActorContext,version:any,blob:any,job:any){
  const size=Number(blob.size_bytes);requireRule(size>0&&size<=40*1024*1024&&version.content_hash===blob.content_hash,'DOCUMENT_SOURCE','Dateiversion und Originalnachweis stimmen nicht überein.');
  return{token:signAssetToken({tenantId:ctx.tenantId,legalEntityId:ctx.legalEntityId,documentVersionId:version.id,sourceHash:version.content_hash,size,jobId:job.id,fencingToken:String(job.fencing_token),expiresAt:Date.now()+900000,purpose:'document'}),byteLength:size,contentHash:version.content_hash};
}
/** A generated, revision-bound concept candidate can also travel without an oversized inline image. */
export async function buildRenderCandidateRef(ctx:ActorContext,documentVersionId:string,jobId:string,fencingToken:string){
  const source=await withTenant(ctx,async db=>{const job=await getRecord(db,'job_runs',jobId);requireRule(job.job_type==='planning.render'&&job.status==='completed'&&String(job.fencing_token)===fencingToken,'RENDER_CANDIDATE_JOB','Originalrender und Jobversuch sind nicht mehr verfügbar.',409);const version=await getRecord(db,'document_versions',documentVersionId),doc=await getRecord(db,'documents',version.document_id),blob=await getRecord(db,'blob_objects',version.blob_object_id);for(const row of[version,doc,blob])requireRule(row.tenant_id===ctx.tenantId&&row.legal_entity_id===ctx.legalEntityId,'RENDER_CANDIDATE_SCOPE','Bildquelle ist nicht verfügbar.',404);requireRule(doc.entity_type==='design_revision'&&doc.entity_id===job.payload.revisionId&&doc.mime_type==='image/png'&&doc.status==='available'&&version.status==='available'&&['clean','trusted_generator'].includes(blob.scan_status)&&version.content_hash===blob.content_hash,'RENDER_CANDIDATE_SOURCE','Kandidat braucht eine geprüfte PNG-Dateiversion derselben Designrevision.');return{version,blob};});
  const size=Number(source.blob.size_bytes);requireRule(size>0&&size<=40*1024*1024,'RENDER_CANDIDATE_SIZE','Kandidat überschreitet das Bildlimit.');return{sourceRef:signAssetToken({tenantId:ctx.tenantId,legalEntityId:ctx.legalEntityId,documentVersionId,sourceHash:source.version.content_hash,size,jobId,fencingToken,expiresAt:Date.now()+900000,purpose:'candidate'}),sourceHash:source.version.content_hash,byteLength:size};
}
/** Dedicated service endpoint: opaque short-lived token, live job fence, RLS and 1 MB range. */
export async function readRenderAssetChunk(input:unknown){
  const p=z.object({token:z.string().max(4000),offset:z.number().int().nonnegative(),length:z.number().int().min(1).max(1024*1024)}).strict().parse(input),parts=p.token.split('.');requireRule(parts.length===2,'RENDER_ASSET_TOKEN','Ungültiger Originaldateizugriff.',401);
  const expected=createHmac('sha256',assetTokenKey()).update(parts[0]).digest(),signature=Buffer.from(parts[1],'base64url');requireRule(signature.length===expected.length&&timingSafeEqual(signature,expected),'RENDER_ASSET_TOKEN','Ungültiger Originaldateizugriff.',401);
  let decoded:unknown;try{decoded=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));}catch{requireRule(false,'RENDER_ASSET_TOKEN','Ungültiger Originaldateizugriff.',401);}
  const token=assetTokenSchema.parse(decoded);requireRule(token.expiresAt>Date.now()&&token.expiresAt<Date.now()+910000&&p.offset<token.size&&p.offset+p.length<=token.size,'RENDER_ASSET_RANGE','Originaldateizugriff ist abgelaufen oder überschreitet den freigegebenen Bereich.',401);
  const ctx:ActorContext={tenantId:token.tenantId,legalEntityId:token.legalEntityId,actorId:'render-worker',actorType:'service',role:'RenderWorker',permissions:[],employeeId:null,permissionVersion:0,correlationId:token.jobId,identityAssurance:'service_identity'};
  const metadata=await withTenant(ctx,async db=>{
    const source=await one<any>(db,`SELECT j.job_type,j.payload,j.status job_status,j.fencing_token,j.lease_until,v.status version_status,v.content_hash,d.id document_id,d.status document_status,b.scan_status,b.content_hash blob_hash,b.size_bytes,b.storage_key
      FROM job_runs j CROSS JOIN document_versions v JOIN documents d ON d.id=v.document_id JOIN blob_objects b ON b.id=v.blob_object_id WHERE j.id=$1 AND v.id=$2`,[token.jobId,token.documentVersionId]);
    requireRule(source,'RENDER_ASSET_SCOPE','Originalquelle ist nicht verfügbar.',404);
    requireRule(String(source.fencing_token)===token.fencingToken&&(token.purpose==='candidate'?source.job_status==='completed':source.job_status==='running'&&new Date(source.lease_until).getTime()>Date.now()),'RENDER_STALE_FENCE','Originalzugriff gehört nicht zum aktiven Jobversuch.',409);
    const scanner=token.purpose==='document'&&source.job_type==='document.ingest'&&source.payload.documentId===source.document_id&&source.payload.documentVersionId===token.documentVersionId;
    const clean=source.version_status==='available'&&source.document_status==='available'&&(source.scan_status==='clean'||['document','candidate'].includes(token.purpose??'')&&source.scan_status==='trusted_generator');
    requireRule(source.content_hash===token.sourceHash&&source.blob_hash===token.sourceHash&&Number(source.size_bytes)===token.size&&(clean||scanner&&source.version_status==='quarantine'&&source.document_status==='quarantine'&&source.scan_status==='quarantine')&&source.storage_key.startsWith(token.tenantId+'/'),'RENDER_ASSET_SOURCE','Originalquelle ist nicht für diesen Zugriff freigegeben.',409);
    return{key:source.storage_key};
  });
  const end=p.offset+p.length-1,file=await readPrivate(metadata.key,`bytes=${p.offset}-${end}`,ctx);requireRule(file.headers.get('Content-Range')===`bytes ${p.offset}-${end}/${token.size}`,'RENDER_RANGE_UNSUPPORTED','Dateispeicher hat den freigegebenen Teilbereich nicht bestätigt.',502);
  const reader=file.stream.getReader(),chunks:Uint8Array[]=[];let size=0;while(true){const read=await reader.read();if(read.done)break;size+=read.value.length;if(size>p.length){await reader.cancel();requireRule(false,'RENDER_CHUNK_SIZE','Originaldateibereich überschreitet das Transportlimit.',502);}chunks.push(read.value);}requireRule(size===p.length,'RENDER_CHUNK_SIZE','Originaldateibereich ist unvollständig.',502);return{bytes:Buffer.concat(chunks),contentHash:token.sourceHash,byteLength:token.size,offset:p.offset};
}

/** Large native 4K PNGs travel in authenticated 1 MB chunks, never as an oversized response. */
export async function readRenderImage(result:any):Promise<Uint8Array>{return readRenderOutput(result,'image');}
export async function readRenderMask(result:any):Promise<Uint8Array>{return readRenderOutput(result,'mask');}
async function readRenderOutput(result:any,kind:'image'|'mask'):Promise<Uint8Array>{
  if(result[kind+'Base64']){const bytes=Buffer.from(result[kind+'Base64'],'base64');requireRule(bytes.length<=40*1024*1024&&createHash('sha256').update(bytes).digest('hex')===result[kind+'Hash'],'RENDER_IMAGE_HASH','Renderbild und Artefaktnachweis stimmen nicht überein.');return bytes;}
  const ref=z.object({byteLength:z.number().int().positive().max(40*1024*1024),contentHash:z.string().regex(/^[a-f0-9]{64}$/),artifactId:z.string().regex(/^[a-f0-9]{64}$/).optional()}).parse(result[kind+'Ref']),chunks:Buffer[]=[];
  requireRule(ref.contentHash===result[kind+'Hash'],'RENDER_IMAGE_HASH','Renderreferenz und Artefaktnachweis stimmen nicht überein.');
  for(let offset=0;offset<ref.byteLength;offset+=1024*1024){const length=Math.min(1024*1024,ref.byteLength-offset),part=await callWorker('/render/artifact',{jobId:result.jobId,fencingToken:result.fencingToken,kind,offset,length,...(ref.artifactId?{artifactId:ref.artifactId}:{})});requireRule(part.jobId===result.jobId&&String(part.fencingToken)===String(result.fencingToken)&&part.contentHash===ref.contentHash&&part.offset===offset,'RENDER_CHUNK_BINDING','Renderbildbereich gehört zu einem anderen Jobstand.');const bytes=Buffer.from(part.bytesBase64,'base64');requireRule(bytes.length===length,'RENDER_CHUNK_SIZE','Renderbildbereich ist unvollständig.');chunks.push(bytes);}
  const image=Buffer.concat(chunks);requireRule(createHash('sha256').update(image).digest('hex')===ref.contentHash,'RENDER_IMAGE_HASH','Renderbild und Artefaktnachweis stimmen nicht überein.');return image;
}

/** Uses the same frame and wall topology as SVG, BOM and the interactive studio. */
export function renderGeometry(snapshot:DesignSnapshot){
  const bodies:any[]=[],glyphs:any[]=[],warnings:string[]=wallJoinConsistencyIssues(snapshot);
  const value=(id:string|null)=>measureValue(snapshot,id);
  for(const e of snapshot.elements.filter(e=>e.phase!=='demolition')){
    if(e.kind==='stone_piece'){
      const depth=value(e.thicknessMeasureId);if(depth===null){warnings.push(`${e.id}: Materialstärke offen.`);continue;}
      const cutouts=snapshot.elements.filter(c=>c.kind==='machining'&&c.hostElementId===e.id&&c.machiningType==='cutout'&&c.phase!=='demolition').map(c=>c.kind==='machining'?c.contour:null).filter((c):c is Contour=>!!c),contour=withThroughCutouts(e.finishedContour,cutouts),cuts=[];
      for(const cut of snapshot.elements)if(cut.kind==='machining'&&cut.hostElementId===e.id&&cut.phase!=='demolition'){
        if(cut.machiningType==='miter'&&cut.miter)cuts.push({mesh:miterCut(snapshot,e,cut.miter.edgeIndex,cut.miter.angleDeg,cut.face).mesh,type:'miter'});
        else if(cut.machiningType!=='cutout'){const amount=machiningDepth(snapshot,cut);if(amount===null)warnings.push(`${cut.label}: Bearbeitungstiefe offen; kein erfundener Materialabtrag.`);cuts.push({contour:cut.contour,depthMm:amount,zMm:amount===null?null:cut.face==='back'?mm(-Number(depth)-.02):mm(-Number(amount)),type:cut.machiningType});}
      }
      bodies.push({id:e.id,kind:e.kind,matrix:surfaceMatrix(snapshot,e.id),contour,depthMm:depth,zMm:String(-Number(depth)),materialVersionId:e.materialSpecVersionId,grainDirectionDeg:e.grainDirectionDeg,cuts});
    }
    if(e.kind==='wall'){
      const a=worldPoint(snapshot,e.startNodeId),b=worldPoint(snapshot,e.endNodeId),dx=Number(b.xMm)-Number(a.xMm),dy=Number(b.yMm)-Number(a.yMm),length=Math.hypot(dx,dy),h=value(e.heightMeasureId),t=value(e.coreThicknessMeasureId);if(!length||h===null||t===null){warnings.push(`${e.id}: Wandabmessungen offen.`);continue;}
      const rect=(x:number,y:number,w:number,h:number):Contour=>{const points=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];return{outer:points.map((p,i)=>({kind:'line',from:{xMm:String(p[0]),yMm:String(p[1])},to:{xMm:String(points[(i+1)%4][0]),yMm:String(points[(i+1)%4][1])}})),holes:[]};};
      const ends=wallCoreEnds(snapshot,e.id),start=Number(ends?.startExtensionMm??0),end=Number(ends?.endExtensionMm??0);const contour=rect(-start,0,length+start+end,Number(h));for(const opening of snapshot.elements)if(opening.kind==='opening'&&opening.wallId===e.id&&opening.openingType!=='recess'&&opening.phase!=='demolition'){
        const o=value(opening.offsetAlongWallMeasureId),w=value(opening.widthMeasureId),oh=value(opening.heightMeasureId),s=value(opening.sillHeightMeasureId);if([o,w,oh,s].includes(null)){warnings.push(`${opening.id}: Öffnungsabmessungen offen.`);continue;}contour.holes.push(rect(Number(o),Number(s),Number(w),Number(oh)).outer);
      }
      const ux=dx/length,uy=dy/length;const matrix=[ux,0,uy,Number(a.xMm)-uy*Number(t)/2,uy,0,-ux,Number(a.yMm)+ux*Number(t)/2,0,1,0,Number(a.zMm),0,0,0,1];const coreMesh=wallCoreMesh(snapshot,e.id);for(const id of coreMesh?.unresolvedOpeningIds??[])warnings.push(`${snapshot.elements.find(e=>e.id===id)?.label??'Wandöffnung'}: Öffnungsmaße oder Nischentiefe offen; die Öffnung wird nicht geraten.`);bodies.push({id:e.id,kind:e.kind,matrix,contour,mesh:coreMesh,depthMm:t,zMm:'0',cuts:[]});
      for(const layer of wallLayerMeshes(snapshot,e.id))bodies.push({id:e.id+':'+layer.layerId,kind:'wall_layer',matrix,mesh:layer.mesh,materialVersionId:layer.materialSpecVersionId,cuts:[]});if(e.layers.some(l=>value(l.thicknessMeasureId)===null))warnings.push(`${e.id}: Schichtstärken offen; keine erfundene Lage nachfolgender Schichten.`);
    }
    if(e.kind==='room'){
      const contour=roomContour(snapshot,e.id),level=value(e.finishedFloorLevelMeasureId),slices=layerSlices(snapshot,e);if(contour&&level!==null){if(!slices.layers.length)bodies.push({id:e.id,kind:e.kind,matrix:worldMatrix(snapshot,null),contour,depthMm:'0',zMm:level,cuts:[]});for(const layer of slices.layers)bodies.push({id:e.id+':'+layer.layerId,kind:'floor_layer',matrix:worldMatrix(snapshot,null),contour,depthMm:mm(Number(layer.topMm)-Number(layer.bottomMm)),zMm:layer.bottomMm,materialVersionId:layer.materialSpecVersionId,cuts:[]});}else warnings.push(`${e.id}: Raumfläche oder Fertigfußbodenbezug offen.`);if(slices.unresolvedIds.length)warnings.push(`${e.id}: Bodenschichtlage offen.`);
    }
    if(e.kind==='surface'){const slices=layerSlices(snapshot,e);if(!slices.layers.length)bodies.push({id:e.id,kind:e.kind,matrix:surfaceMatrix(snapshot,e.id),contour:e.contour,depthMm:'0',zMm:'0',cuts:[]});for(const layer of slices.layers)bodies.push({id:e.id+':'+layer.layerId,kind:'surface_layer',matrix:surfaceMatrix(snapshot,e.id),contour:e.contour,depthMm:mm(Number(layer.topMm)-Number(layer.bottomMm)),zMm:layer.bottomMm,materialVersionId:layer.materialSpecVersionId,cuts:[]});if(slices.unresolvedIds.length)warnings.push(`${e.id}: Flächenschichtlage offen.`);}
    if(e.kind==='catalog_object')bodies.push({id:e.id,kind:e.kind,matrix:surfaceMatrix(snapshot,e.id),contour:e.footprint,depthMm:value(e.heightMeasureId??null),zMm:'0',assetVersionId:e.assetVersionId,accuracy:e.accuracy,cuts:[]});
    if(e.kind==='slope'&&(value(e.riseMeasureId)===null||value(e.runMeasureId)===null))warnings.push(`${e.id}: Gefällewerte offen.`);
    if(e.kind==='grave_border'){warnings.push(`${e.id}: Zusammengesetzte Einfassung benötigt die einzelnen freigegebenen Steinteile für ein finales Render.`);}
    if(e.kind==='inscription'){
      const local=transformMatrix({...IDENTITY_TRANSFORM,position:{xMm:e.originUV.uMm,yMm:e.originUV.vMm,zMm:'0'},rotationDeg:{x:'0',y:'0',z:e.rotationDeg}});
      glyphs.push({id:e.id,phase:e.phase,locked:e.locked,exactText:e.exactText,renderingBasis:e.renderingBasis,requestedHeightMm:value(e.requestedHeightMeasureId),matrix:multiplyMatrix(surfaceMatrix(snapshot,e.surfaceElementId),local),placements:e.glyphPlacements});
    }
  }
  return{unit:'mm',coordinateSystem:'right_handed_z_up',tessellationChordErrorMm:'0.005',bodies,glyphs,warnings};
}
