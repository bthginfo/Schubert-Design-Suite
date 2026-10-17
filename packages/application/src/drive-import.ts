import {z} from 'zod';
import {withTenant,rows,one,insertMany,update} from '@schubert/db';
import {requireRule,assertVersion,assertPermission} from '@schubert/domain';
import {privateBytes,contentHash} from '@schubert/adapters';
import type {ActorContext} from '@schubert/contracts';
import {register,getRecord,baseData,hash} from './core.js';
import {assertDocumentTarget,assertDocumentAccess} from './document-access.js';
import {ingestUpload} from './documents.js';
import {inspectZip,extractZipEntry} from './zip-inventory.js';

async function archive(ctx:ActorContext,batch:any){return withTenant(ctx,async db=>{
 const doc=await getRecord(db,'documents',batch.document_id);await assertDocumentAccess(db,ctx,doc);requireRule(doc.status==='available','IMPORT_ORIGINAL','Geprüftes ZIP-Original ist nicht verfügbar.');
 const version=await getRecord(db,'document_versions',doc.current_version_id);requireRule(!batch.source_document_version_id||batch.source_document_version_id===version.id,'IMPORT_ORIGINAL_CHANGED','Die Originalversion wurde inzwischen geändert. Eine neue Charge erstellen.',409);
 return{doc,version,blob:await getRecord(db,'blob_objects',version.blob_object_id)};
});}
async function fence(db:any,job:any){const live=await getRecord(db,'job_runs',job.id,true);requireRule(live.status==='running'&&String(live.fencing_token)===String(job.fencing_token)&&new Date(live.lease_until)>new Date(),'STALE_JOB_FENCE','Ein neuer Jobversuch hat diese Charge übernommen.',409);}
export async function runDriveInventory(ctx:ActorContext,job:any,batch:any){
 const source=await archive(ctx,batch),bytes=await privateBytes(source.blob.storage_key,40*1024*1024,ctx);requireRule(contentHash(bytes)===source.version.content_hash,'IMPORT_SOURCE_HASH','Originaldatei stimmt nicht mit dem Quellnachweis überein.');
 const entries=inspectZip(bytes),inventoryHash=hash(entries);requireRule(entries.length,'ZIP_EMPTY','Der Export enthält keine Dateien.');
 return withTenant(ctx,async db=>{await fence(db,job);const current=await getRecord(db,'import_batches',batch.id,true);requireRule(current.status==='processing','IMPORT_STATE','Inventarisierung wurde inzwischen beendet.');
  const old=await rows<any>(db,'SELECT path FROM import_archive_entries WHERE batch_id=$1',[batch.id]);const known=new Set(old.map(x=>x.path));
  requireRule(!current.inventory_hash||current.inventory_hash===inventoryHash,'IMPORT_INVENTORY_CHANGED','Der Inhalt dieser Charge darf nach der ersten Übernahme nicht geändert werden.');
  await insertMany(db,'import_archive_entries',entries.filter(e=>!known.has(e.path)).map(entry=>({...baseData(ctx),batch_id:batch.id,path:entry.path,name:entry.path.split('/').at(-1),metadata:entry,status:'inventoried'})));
  return update(db,'import_batches',batch.id,{status:'inventory_ready',source_system:'drive',source_document_version_id:source.version.id,inventory_hash:inventoryHash,content_hash:source.version.content_hash,checkpoint:old.length,validation_report:{mode:'archive_inventory',entries:entries.length,expandedBytes:entries.reduce((n,e)=>n+e.size,0),sourceHash:source.version.content_hash,inventoryHash,ocrStarted:false,limits:{entries:2000,expandedBytes:128*1024*1024,batchSelection:20}}},current.version);
 });
}
const selection=z.object({entry_id:z.uuid(),target_type:z.string().max(100).nullable(),target_id:z.uuid().nullable()});
register('migration.drive.exclude','imports',async r=>{
 const batch=await getRecord(r.db,'import_batches',r.command.id,true);assertVersion(batch.version,r.command.expectedVersion);requireRule(batch.status==='inventory_ready','IMPORT_STATE','Zuerst die laufende Übernahme beenden.');
 const p=z.object({entry_ids:z.array(z.uuid()).min(1).max(100),reason:z.string().trim().min(10).max(2000)}).parse(r.payload);
 const entries=await rows<any>(r.db,'SELECT * FROM import_archive_entries WHERE batch_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE',[batch.id,p.entry_ids]);requireRule(entries.length===new Set(p.entry_ids).size&&entries.every(e=>!e.document_id),'IMPORT_SELECTION','Nur noch nicht übernommene Originale dieser Charge ausschließen.');
 await r.db.query("UPDATE import_archive_entries SET status='excluded',last_error=$1,version=version+1,updated_at=now(),updated_by=$2 WHERE batch_id=$3 AND id=ANY($4::uuid[])",[p.reason,r.ctx.actorId,batch.id,p.entry_ids]);return r.update('import_batches',batch.id,{notes:'Begründeter Ausschluss: '+p.reason},batch.version);
});
register('migration.drive.complete','imports',async r=>{
 const batch=await getRecord(r.db,'import_batches',r.command.id,true);assertVersion(batch.version,r.command.expectedVersion);requireRule(batch.status==='inventory_ready','IMPORT_STATE','Zuerst die laufende Übernahme beenden.');
 const entries=await rows<any>(r.db,'SELECT e.*,d.status document_status FROM import_archive_entries e LEFT JOIN documents d ON d.id=e.document_id WHERE e.batch_id=$1 ORDER BY e.path FOR UPDATE OF e',[batch.id]);requireRule(entries.length&&entries.every(e=>e.status==='excluded'||e.document_id&&e.document_status==='available'),'IMPORT_INCOMPLETE','Jede Datei zuerst übernehmen und prüfen lassen oder mit nachvollziehbarem Grund ausschließen.');
 await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[['legacy-import',r.ctx.tenantId,r.ctx.legalEntityId,'drive'].join(':')]);
 const imported=entries.filter(e=>e.document_id),keys=imported.map(e=>e.path),known=await rows<any>(r.db,"SELECT legacy_id,entity_id,source_hash FROM legacy_id_map WHERE source_system='drive' AND entity_type='historical_documents' AND legacy_id=ANY($1::text[])",[keys]);
 for(const entry of imported){const old=known.find(k=>k.legacy_id===entry.path);requireRule(!old||old.source_hash===entry.content_hash&&old.entity_id===entry.document_id,'IMPORT_LEGACY_CONFLICT','Ein bereits übernommener Originalpfad gehört zu einer anderen Dokumentversion. Die Herkunft zuerst klären.',409);}
 await insertMany(r.db,'legacy_id_map',imported.filter(e=>!known.some(k=>k.legacy_id===e.path)).map(e=>({...baseData(r.ctx),source_system:'drive',entity_type:'historical_documents',legacy_id:e.path,entity_id:e.document_id,source_hash:e.content_hash,batch_id:batch.id,status:'committed'})));
 return r.update('import_batches',batch.id,{status:'committed',committed_at:new Date(),validation_report:{...batch.validation_report,imported:imported.length,excluded:entries.length-imported.length,complete:true}},batch.version);
});
register('migration.drive.extract','imports',async r=>{
 assertPermission(r.ctx.permissions,'documents.upload');const batch=await getRecord(r.db,'import_batches',r.command.id,true);assertVersion(batch.version,r.command.expectedVersion);requireRule(batch.status==='inventory_ready','IMPORT_STATE','Zuerst das ZIP-Inventar erstellen beziehungsweise die laufende Charge beenden.');
 const p=z.object({selections:z.array(selection).min(1).max(20),access_statement:z.string().min(15).max(2000)}).parse(r.payload);requireRule(new Set(p.selections.map(s=>s.entry_id)).size===p.selections.length,'IMPORT_SELECTION','Eine Datei nur einmal je Charge auswählen.');
 const selected=await rows<any>(r.db,'SELECT * FROM import_archive_entries WHERE batch_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE',[batch.id,p.selections.map(s=>s.entry_id)]);requireRule(selected.length===p.selections.length,'IMPORT_SELECTION','Auswahl enthält fremde oder fehlende Dateien.');
 for(const s of p.selections){await assertDocumentTarget(r.db,r.ctx,s.target_type,s.target_id);const row=selected.find(x=>x.id===s.entry_id);requireRule(row&&!row.document_id&&row.status!=='excluded'&&row.metadata.size>0,'IMPORT_ENTRY_DONE','Bereits übernommene, ausgeschlossene oder leere Datei nicht erneut auswählen.');requireRule(!/\.(zip|7z|rar|tar|gz|bz2|xz|exe|dll|bat|cmd|ps1|com|scr|msi|js|html?)$/i.test(row.path),'ZIP_NESTED_ARCHIVE','Verschachtelte Archive und ausführbare Dateien sind nicht zulässig.');await r.update('import_archive_entries',s.entry_id,{target_type:s.target_type,target_id:s.target_id,status:'selected',last_error:null});}
 await r.insert('job_runs',{name:'Ausgewählte Originaldateien privat übernehmen und prüfen',job_type:'migration.drive.extract',payload:{batchId:batch.id,inventoryHash:batch.inventory_hash,entryIds:p.selections.map(s=>s.entry_id),accessStatement:p.access_statement},status:'pending'});return r.update('import_batches',batch.id,{status:'extracting'},batch.version);
});
export async function runDriveExtract(ctx:ActorContext,job:any){
 const batch=await withTenant(ctx,db=>getRecord(db,'import_batches',job.payload.batchId)),source=await archive(ctx,batch),bytes=await privateBytes(source.blob.storage_key,40*1024*1024,ctx),entries=inspectZip(bytes);
 requireRule(contentHash(bytes)===batch.content_hash&&hash(entries)===job.payload.inventoryHash,'IMPORT_SOURCE_HASH','Quellinhalt wurde geändert.');
 const selected=await withTenant(ctx,db=>rows<any>(db,'SELECT * FROM import_archive_entries WHERE batch_id=$1 AND id=ANY($2::uuid[]) ORDER BY path',[batch.id,job.payload.entryIds]));let imported=0;const errors:string[]=[];
 for(const row of selected){if(row.document_id)continue;await withTenant(ctx,db=>fence(db,job));
  try{const entry=entries.find(e=>e.path===row.path);requireRule(entry&&hash(entry)===hash(row.metadata),'IMPORT_INVENTORY_CHANGED','Dateieintrag wurde geändert.');const extracted=extractZipEntry(bytes,entry),name=row.path.split('/').at(-1)!;requireRule(name.length<=250,'FILE_NAME','Dateiname auf höchstens250Zeichen kürzen und neu exportieren.');
   const doc=await ingestUpload(ctx,extracted.bytes,name,'application/octet-stream',row.target_type??undefined,row.target_id??undefined);
   await withTenant(ctx,async db=>{await fence(db,job);const current=await getRecord(db,'import_archive_entries',row.id,true);if(!current.document_id){await update(db,'import_archive_entries',row.id,{document_id:doc.id,content_hash:extracted.hash,status:'imported',last_error:null},current.version);await db.query('UPDATE documents SET original_path=COALESCE(original_path,$1),import_batch_id=COALESCE(import_batch_id,$2) WHERE id=$3',[row.path,batch.id,doc.id]);}});imported++;
  }catch(error:any){if(error.code==='STALE_JOB_FENCE')throw error;errors.push(row.path);await withTenant(ctx,async db=>{await fence(db,job);await update(db,'import_archive_entries',row.id,{status:'needs_review',last_error:String(error.message??'Datei konnte nicht übernommen werden.').slice(0,500)});});}
 }
 return withTenant(ctx,async db=>{await fence(db,job);const current=await getRecord(db,'import_batches',batch.id,true),count=await one<any>(db,'SELECT count(*) FILTER(WHERE document_id IS NOT NULL)::int imported,count(*)::int total FROM import_archive_entries WHERE batch_id=$1',[batch.id]);await update(db,'import_batches',batch.id,{status:'inventory_ready',checkpoint:count.imported,validation_report:{...current.validation_report,imported:count.imported,total:count.total,lastErrors:errors}},current.version);return{imported,failed:errors.length,checkpoint:count.imported,total:count.total,originalPathsPreserved:true};});
}
