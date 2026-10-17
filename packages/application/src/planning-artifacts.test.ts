import {describe,it,expect} from 'vitest';
import {crc32,deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {verifyPlanningRender,verifyPlanningComposite} from './planning-artifacts.js';

const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
function png(width=2,height=2){
  const chunk=(type:string,data:Buffer)=>{const name=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((width*4+1)*height))),chunk('IEND',Buffer.alloc(0))]);
}
function fixture(bytes=png()){
  const revision={id:'revision-1',content_hash:'c'.repeat(64),snapshot:{geometryEngineVersion:'geometry-test'}},job={id:'job-1',fencing_token:4};
  // Python preserves a .0 float here. The exact UTF-8 proof must survive JS parsing.
  const manifestCanonical='{"camera":{"scaleM":1.0},"contentHash":"'+revision.content_hash+'","coordinateSystem":"right_handed_z_up","generatorVersion":"schubert-blender/1.0.0","geometryEngineVersion":"geometry-test","profile":"preview","revisionId":"revision-1","unit":"mm"}';
  const result={jobId:job.id,fencingToken:'4',revisionId:revision.id,contentHash:revision.content_hash,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),imageHash:digest(bytes),manifestCanonical,manifestHash:digest(manifestCanonical),manifest:JSON.parse(manifestCanonical),accuracy:'model_based'};
  return{revision,job,result,bytes};
}
describe('archived planning render contract',()=>{
  it('accepts actual PNG bytes and a Python float manifest without rewriting its proof',()=>{const f=fixture();expect(verifyPlanningRender(f.revision,f.job,f.result,f.bytes,'preview')).toEqual({width:2,height:2});});
  it('rejects an image from an obsolete job fence or another revision',()=>{const f=fixture();expect(()=>verifyPlanningRender(f.revision,f.job,{...f.result,fencingToken:'3'},f.bytes,'preview')).toThrow();expect(()=>verifyPlanningRender(f.revision,f.job,{...f.result,revisionId:'other'},f.bytes,'preview')).toThrow();});
  it('rejects invented native resolution and truncated image pixels',()=>{const f=fixture();expect(()=>verifyPlanningRender(f.revision,f.job,{...f.result,width:3840,height:2880},f.bytes,'preview')).toThrow();const cut=f.bytes.subarray(0,f.bytes.length-12);expect(()=>verifyPlanningRender(f.revision,f.job,{...f.result,imageHash:digest(cut)},cut,'preview')).toThrow();});
  it('never accepts a preview or changed camera manifest as the final package image',()=>{const f=fixture();expect(()=>verifyPlanningRender(f.revision,f.job,f.result,f.bytes,'final')).toThrow();expect(()=>verifyPlanningRender(f.revision,f.job,{...f.result,manifest:{...f.result.manifest,camera:{scaleM:2}}},f.bytes,'preview')).toThrow();});
  it('validates actual native 4K pixel data for final output',()=>{const bytes=png(3840,2160),f=fixture(bytes);f.result.manifest.profile='final';f.result.manifestCanonical=JSON.stringify(f.result.manifest);f.result.manifestHash=digest(f.result.manifestCanonical);expect(verifyPlanningRender(f.revision,f.job,f.result,bytes,'final')).toEqual({width:3840,height:2160});});
});

describe('archived protected concept contract',()=>{
  function concept(){const f=fixture(),sources={sourceJob:{id:'source-render'},proof:{width:2,height:2,workerManifestHash:'b'.repeat(64)},image:{version:{content_hash:'1'.repeat(64)}},mask:{version:{content_hash:'2'.repeat(64)}},candidate:{version:{content_hash:'3'.repeat(64)}},workerManifest:{camera:{scaleM:1}},protectedIds:['original-inscription']};const manifest={operation:'protected-composite/v1',revisionId:f.revision.id,contentHash:f.revision.content_hash,sourceJobId:sources.sourceJob.id,sourceManifestHash:sources.proof.workerManifestHash,pixelProtection:'all_nonzero_mask_pixels_copied_from_original_rgba_without_blending',width:2,height:2,camera:sources.workerManifest.camera,sourceHashes:['1','2','3'].map(c=>c.repeat(64)),protectedElementIds:sources.protectedIds};return{...f,sources,result:{...f.result,manifest,manifestCanonical:JSON.stringify(manifest),manifestHash:digest(JSON.stringify(manifest)),sourceJobId:sources.sourceJob.id,sourceImageHash:sources.image.version.content_hash,maskHash:sources.mask.version.content_hash,candidateHash:sources.candidate.version.content_hash,accuracy:'concept_visualization_with_protected_original_pixels'}};}
  it('accepts a separate fenced concept with exact archived source hashes and protection manifest',()=>{const f=concept();expect(verifyPlanningComposite(f.revision,f.job,f.result,f.bytes,f.sources)).toEqual({width:2,height:2});});
  it('rejects changed camera, candidate, omitted protected content and obsolete fence',()=>{const f=concept();for(const result of[{...f.result,fencingToken:'3'},{...f.result,candidateHash:'9'.repeat(64)},{...f.result,manifest:{...f.result.manifest,camera:{scaleM:2}}},{...f.result,manifest:{...f.result.manifest,protectedElementIds:[]}}])expect(()=>verifyPlanningComposite(f.revision,f.job,result,f.bytes,f.sources)).toThrow();});
  it('cannot be accepted as a deterministic render or manufacturing image',()=>{const f=concept();expect(()=>verifyPlanningRender(f.revision,f.job,f.result,f.bytes,'preview')).toThrow();expect(()=>verifyPlanningRender(f.revision,f.job,f.result,f.bytes,'final')).toThrow();});
});
