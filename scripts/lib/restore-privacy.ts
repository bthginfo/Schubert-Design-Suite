import assert from 'node:assert/strict';
/** Replay the independent latest journal before exposing or copying any restored data. Identity, not file hash, defines an erased permission scope. */
export function replayPrivacy(snapshot:any,entries:any[]){
 const uuid=/^[a-f0-9-]{36}$/i,documents=new Set<string>(),parties=new Set<string>();
 for(const entry of entries){assert(['document','party'].includes(entry.entityType)&&uuid.test(entry.entityId)&&uuid.test(entry.deletionJobId)&&/^[a-f0-9]{64}$/.test(entry.objectHash)&&Array.isArray(entry.relatedIds)&&entry.relatedIds.every((id:any)=>uuid.test(id)),'Invalid independent deletion journal');if(entry.entityType==='document'){documents.add(entry.entityId);for(const id of entry.relatedIds)documents.add(id);}else parties.add(entry.entityId);}
 const t=snapshot.tables,versions=new Set<string>(),erasedBlobs=new Set<string>();
 for(const d of t.documents??[])if(documents.has(d.id)){d.name='Entferntes Dokument';d.original_name='Entferntes Original';d.current_version_id=null;d.notes=null;d.title=null;d.status='erased';}
 for(const v of t.document_versions??[])if(documents.has(v.document_id)){versions.add(v.id);erasedBlobs.add(v.blob_object_id);v.status='erased';}
 const survivingDocuments=new Set((t.documents??[]).filter((d:any)=>!documents.has(d.id)&&!['erased','deleted'].includes(d.status)).map((d:any)=>d.id));
 const survivingBlobs=new Set((t.document_versions??[]).filter((v:any)=>survivingDocuments.has(v.document_id)).map((v:any)=>v.blob_object_id));
 const excludedStorage=new Set<string>();for(const b of t.blob_objects??[])if(erasedBlobs.has(b.id)&&!survivingBlobs.has(b.id)){excludedStorage.add(b.storage_key);b.status='deleted';}
 t.document_extractions=(t.document_extractions??[]).filter((x:any)=>!versions.has(x.document_version_id));t.search_documents=(t.search_documents??[]).filter((x:any)=>!documents.has(x.document_id));
 for(const p of t.portal_publications??[])if(versions.has(p.document_version_id)){p.status='revoked';p.revoked_at=new Date().toISOString();}
 for(const a of t.archive_objects??[])if(excludedStorage.has(a.object_key))a.status='deleted';
 const runs=new Set<string>();for(const a of t.ai_runs??[])if((a.source_document_ids??[]).some((id:string)=>documents.has(id))){runs.add(a.id);a.result=null;a.status='source_erased';}
 for(const p of t.ai_proposals??[])if(runs.has(p.ai_run_id)){p.commands=[];p.missing_inputs={};p.status='source_erased';}
 for(const p of t.parties??[])if(parties.has(p.id)){p.name='Entferntes Geschäftspartnerprofil';for(const key of ['email','phone','street','postal_code','city','country','vat_id','notes'])p[key]=null;p.active=false;p.status='erased';}
 t.contacts=(t.contacts??[]).filter((p:any)=>!parties.has(p.party_id));t.addresses=(t.addresses??[]).filter((p:any)=>!parties.has(p.party_id));
 const all=new Set([...documents,...parties]);for(const r of t.command_receipts??[])if(all.has(r.result?.id)&&!r.command_name.startsWith('privacy.'))r.result={id:r.result.id,status:'source_erased'};
 return{documents,parties,excludedStorage,matchedDocuments:(t.documents??[]).filter((d:any)=>documents.has(d.id)).length};
}
