import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {executeCommand,loadPage} from '@schubert/application';
import {withTenant,insert,one} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {searchManufacturerAssets} from '../packages/application/src/manufacturer-assets.js';
import {assertDocumentAccess,assertDocumentTarget,assertManufacturerUse,documentReadPredicate} from '../packages/application/src/document-access.js';

export async function manufacturerAssetsIntegration(actor:(role:string)=>ActorContext,test:(name:string,run:()=>Promise<void>)=>Promise<void>){
 const admin=actor('SuperAdmin'),owner=actor('Owner'),planner=actor('Planner');
 const command=(ctx:ActorContext,name:string,payload:Record<string,unknown>,record?:any)=>executeCommand(ctx,{name,id:record?.id,expectedVersion:record?.version,idempotencyKey:randomUUID(),payload});
 const metadata={name:'TEST Herstellergrundriss '+randomUUID().slice(0,6),manufacturer_name:'Synthetischer Hersteller',article_reference:'TEST-001',kind:'plan',studio_scope:'room_plan',source_url:'',source_unit:'mm',notes:'Nur synthetische Prüfdaten.'};
 let asset:any,document:any,version:any;
 await test('Manufacturer library defaults to SuperAdmin; ordinary planning and office rights cannot manage sources or grant access',async()=>{
  for(const ctx of [owner,planner,actor('Office')])await assert.rejects(()=>command(ctx,'manufacturer.asset.create',metadata),(error:any)=>error.status===403);
  const membership=await withTenant(admin,db=>one<any>(db,'SELECT * FROM memberships WHERE user_id=$1',[planner.actorId]));
  await assert.rejects(()=>command(owner,'administration.membership.update',{permissions:[...(membership.permissions??[]),'manufacturer_assets'],reason:'Unzulässige Delegation'},membership),(error:any)=>error.code==='SUPERADMIN_REQUIRED');
  asset=await command(admin,'manufacturer.asset.create',metadata);assert.equal(asset.status,'draft');
  await assert.rejects(()=>loadPage(owner,'manufacturer-assets',new URL('http://localhost/manufacturer-assets')),(error:any)=>error.status===403);
 });
 await test('Explicit delegation grants only the manufacturer area and can be revoked by SuperAdmin',async()=>{
  let membership=await withTenant(admin,db=>one<any>(db,'SELECT * FROM memberships WHERE user_id=$1',[actor('TechAdmin').actorId]));const original=[...(membership.permissions??[])];
  try{
   membership=await command(admin,'administration.membership.update',{permissions:[...original,'manufacturer_assets'],reason:'Synthetische ausdrückliche Bibliotheksdelegation'},membership);
   const delegate=actor('TechAdmin');
   const created=await command(delegate,'manufacturer.asset.create',{...metadata,name:'TEST delegierte Quelle'});assert.equal(created.status,'draft');
   await assert.rejects(()=>command(delegate,'manufacturer.asset.upload.intent',{entity_type:'customers',entity_id:randomUUID(),name:'synthetic.pdf',mime_type:'application/pdf',size_bytes:20,content_hash:'a'.repeat(64)}),(error:any)=>error.code==='UPLOAD_SCOPE');
   membership=await command(admin,'administration.membership.update',{permissions:original,reason:'Synthetischen Bibliothekszugriff wieder entziehen'},membership);
   await assert.rejects(()=>command(delegate,'manufacturer.asset.create',metadata),(error:any)=>error.status===403);
  }finally{
   const current=await withTenant(admin,db=>one<any>(db,'SELECT * FROM memberships WHERE id=$1',[membership.id]));
   if(JSON.stringify(current.permissions)!==JSON.stringify(original))await command(admin,'administration.membership.update',{permissions:original,reason:'Synthetische Rechteprüfung abschließen'},current);
  }
 });
 await test('Private manufacturer originals stay quarantined until the scan passes; attachment and use remain source bound',async()=>{
  // Synthetic SQL fixtures exercise gates, not a live scanner or object upload.
  const hash=createHash('sha256').update('synthetic manufacturer PDF').digest('hex');
  const fixture=await withTenant(admin,async db=>{
   const base={tenant_id:admin.tenantId,legal_entity_id:admin.legalEntityId,created_by:admin.actorId};
   const blob=await insert(db,'blob_objects',{...base,storage_key:admin.tenantId+'/synthetic/manufacturer/'+randomUUID(),provider:'vercel_blob',content_hash:hash,mime_type:'application/pdf',size_bytes:26,scan_status:'quarantine',status:'quarantine'});
   const doc=await insert(db,'documents',{...base,name:'TEST Herstelleroriginal.pdf',original_name:'TEST Herstelleroriginal.pdf',mime_type:'application/pdf',size_bytes:26,content_hash:hash,entity_type:'manufacturer-assets',entity_id:asset.id,visibility:'internal',status:'quarantine'});
   const v=await insert(db,'document_versions',{...base,document_id:doc.id,blob_object_id:blob.id,content_hash:hash,revision:1,status:'quarantine'});
   await db.query('UPDATE documents SET current_version_id=$1 WHERE id=$2',[v.id,doc.id]);return{doc:{...doc,current_version_id:v.id},v,blob};
  });document=fixture.doc;version=fixture.v;
  asset=await command(admin,'manufacturer.asset.attach',{document_id:document.id},asset);
  const uses={use_planning:true,use_ai:false,rights_statement:'Synthetische Nutzungserlaubnis für interne Planung; kein echter Hersteller.',rights_confirmed:true};
  await assert.rejects(()=>command(admin,'manufacturer.asset.publish',uses,asset),(error:any)=>error.code==='EVIDENCE_QUARANTINE');
  await assert.rejects(()=>withTenant(planner,db=>assertDocumentAccess(db,planner,document)),(error:any)=>error.status===404);
  await withTenant(admin,async db=>{await db.query("UPDATE documents SET status='available' WHERE id=$1",[document.id]);await db.query("UPDATE document_versions SET status='available' WHERE id=$1",[version.id]);await db.query("UPDATE blob_objects SET status='available',scan_status='clean' WHERE id=$1",[fixture.blob.id]);});
  asset=await command(admin,'manufacturer.asset.publish',uses,asset);assert.equal(asset.status,'available');assert.equal(asset.source_hash,hash);
  const unattached=await withTenant(admin,db=>insert(db,'documents',{tenant_id:admin.tenantId,legal_entity_id:admin.legalEntityId,name:'TEST nicht bereitgestellte weitere Datei.pdf',original_name:'TEST weitere Datei.pdf',size_bytes:26,content_hash:hash,mime_type:'application/pdf',entity_type:'manufacturer-assets',entity_id:asset.id,visibility:'internal',status:'available'}));
  await withTenant(planner,async db=>{
   await assertDocumentAccess(db,planner,document,version.id);await assertManufacturerUse(db,document,version.id,'planning');
   await assert.rejects(()=>assertManufacturerUse(db,document,version.id,'ai'),(error:any)=>error.code==='MANUFACTURER_USAGE');
   await assert.rejects(()=>assertDocumentAccess(db,planner,document,randomUUID()),(error:any)=>error.status===404);
   await assert.rejects(()=>assertDocumentAccess(db,planner,unattached),(error:any)=>error.status===404);
   assert.equal(await one(db,`SELECT id FROM documents d WHERE d.id=$1 AND ${documentReadPredicate(planner,'d')}`,[unattached.id]),null);
  });
  await withTenant(admin,async db=>{await assertDocumentAccess(db,admin,unattached);await assert.rejects(()=>assertDocumentTarget(db,admin,'manufacturer-assets',asset.id),(error:any)=>error.code==='ASSET_FROZEN');});
 });
 await test('Studio scope, immutable originals and tenant boundaries survive hiding a manufacturer source',async()=>{
  const rooms=await searchManufacturerAssets(planner,{studio:'room_plan',q:metadata.name});assert(rooms.items.some((row:any)=>row.id===asset.id));
  const memorial=await searchManufacturerAssets(planner,{studio:'memorial',q:metadata.name});assert(!memorial.items.some((row:any)=>row.id===asset.id));
  const foreign=await searchManufacturerAssets({...planner,tenantId:randomUUID()},{studio:'room_plan',q:metadata.name});assert.equal(foreign.items.length,0);
  await assert.rejects(()=>command(admin,'manufacturer.asset.update',{...metadata,name:'Veränderte Originalfassung'},asset),(error:any)=>error.code==='ASSET_FROZEN');
  await assert.rejects(()=>withTenant(admin,db=>db.query("UPDATE manufacturer_assets SET source_hash=$1 WHERE id=$2",['b'.repeat(64),asset.id])));
  asset=await command(admin,'manufacturer.asset.archive',{},asset);assert.equal(asset.status,'archived');
  const hidden=await searchManufacturerAssets(planner,{studio:'room_plan',q:metadata.name});assert.equal(hidden.items.length,0);
  await withTenant(planner,db=>assertDocumentAccess(db,planner,document));
 });
}
