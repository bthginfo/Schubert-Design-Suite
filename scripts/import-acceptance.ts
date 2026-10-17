import {config} from 'dotenv';config({quiet:true});config({path:'.env.workers.local',quiet:true});
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {withTenant,rows,one,closePools} from '@schubert/db';
import {executeCommand,processPending,ingestUpload} from '@schubert/application';
import {rolePermissions} from '@schubert/domain';
import {privateBytes,contentHash} from '@schubert/adapters';
import type {ActorContext} from '@schubert/contracts';
if(process.env.APP_ENV==='production')throw new Error('Synthetic development tenant only.');
process.env.DOCUMENT_WORKER_URL='https://schubert-suite-files.vercel.app';
const saved=JSON.parse(await readFile('../../work/qa-full-finance/context.json','utf8'));
const ctx:ActorContext={...saved,employeeId:null,role:'SuperAdmin',permissions:rolePermissions.SuperAdmin,permissionVersion:1,actorType:'employee',identityAssurance:'individual_session',correlationId:randomUUID(),reauthenticatedAt:new Date()};
const path='../../work/qa-import';await mkdir(path,{recursive:true});const checks:string[]=[];
const pass=(s:string)=>{checks.push(s);console.log('PASS '+s);};
const cmd=(name:string,payload:any={},record?:any,key=randomUUID())=>{ctx.reauthenticatedAt=new Date();return executeCommand(ctx,{name,payload,id:record?.id,expectedVersion:record?.version,idempotencyKey:key});};
const get=(table:string,id:string)=>withTenant(ctx,db=>one<any>(db,'SELECT * FROM '+table+' WHERE id=$1',[id]));
async function job(type:string,key:string,id:string){const j=await withTenant(ctx,db=>one<any>(db,'SELECT * FROM job_runs WHERE job_type=$1 AND payload->>$2=$3 ORDER BY created_at DESC LIMIT 1',[type,key,id]));assert(j);await processPending(ctx,1,j.id);const done=await get('job_runs',j.id);assert.equal(done.status,'completed',type+': '+done.last_error);return done;}
async function upload(bytes:Uint8Array,name:string,mime:string){const d=await ingestUpload(ctx,bytes,name,mime);await job('document.ingest','documentId',d.id);const ready=await get('documents',d.id);assert.equal(ready.status,'available');return ready;}
try{
 const unique=randomUUID().slice(0,8),originals={'Kunden/Original A.txt':strToU8('Synthetisches Original A '+unique),'Auftraege/Original B.txt':strToU8('Synthetisches Original B '+unique),'Vorschau/leer.txt':new Uint8Array()};
 const archive=await upload(zipSync(originals),'Synthetischer Ordnerexport '+unique+'.zip','application/zip');
 let batch=await cmd('migration.import.create',{name:'Synthetische vollständige Drive-Charge '+unique,document_id:archive.id,source_system:'drive',import_kind:'historical_documents'});batch=await cmd('migration.import.stage',{},batch);await job('migration.stage','batchId',batch.id);batch=await get('import_batches',batch.id);assert.equal(batch.status,'inventory_ready');const entries=await withTenant(ctx,db=>rows<any>(db,'SELECT * FROM import_archive_entries WHERE batch_id=$1 ORDER BY path',[batch.id]));assert.equal(entries.length,3);assert.equal(batch.validation_report.ocrStarted,false);pass('Real scanned private ZIP inventoried with original paths and no premature OCR');
 await assert.rejects(()=>cmd('migration.drive.complete',{},batch));
 batch=await cmd('migration.drive.extract',{selections:entries.filter(e=>e.metadata.size).map(e=>({entry_id:e.id,target_type:null,target_id:null})),access_statement:'Nur synthetische Originale dieser isolierten Testakte; Zuordnung und Herkunft geprüft.'},batch);await job('migration.drive.extract','batchId',batch.id);batch=await get('import_batches',batch.id);
 const extracted=await withTenant(ctx,db=>rows<any>(db,'SELECT e.*,d.current_version_id,d.original_path FROM import_archive_entries e JOIN documents d ON d.id=e.document_id WHERE e.batch_id=$1',[batch.id]));assert.equal(extracted.length,2);
 for(const e of extracted){await job('document.ingest','documentId',e.document_id);const f=await withTenant(ctx,db=>one<any>(db,'SELECT v.content_hash,b.storage_key FROM document_versions v JOIN blob_objects b ON b.id=v.blob_object_id WHERE v.id=$1',[e.current_version_id])),bytes=await privateBytes(f.storage_key,40000000,ctx);assert.equal(contentHash(bytes),contentHash(originals[e.path as keyof typeof originals]));assert.equal(e.original_path,e.path);}
 pass('Selected originals imported with exact hashes, preserved paths and actual individual malware scans');
 await assert.rejects(()=>cmd('migration.drive.extract',{selections:[{entry_id:extracted[0].id,target_type:null,target_id:null}],access_statement:'Erneute Auswahl muss sicher abgewiesen werden.'},batch));
 batch=await cmd('migration.drive.exclude',{entry_ids:entries.filter(e=>!e.metadata.size).map(e=>e.id),reason:'Leere synthetische Vorschaudatei ohne fachlichen Inhalt.'},batch);batch=await cmd('migration.drive.complete',{},batch);assert.equal(batch.status,'committed');assert.equal(batch.validation_report.excluded,1);await assert.rejects(()=>cmd('migration.import.update',{name:'Unzulässige Nachänderung'},batch));pass('Checkpoint prevents duplicates; justified exclusions close immutable complete batch');
 const proof=await upload(strToU8('Synthetischer Nachweis eines ausschließlichen Test-Quellschreibstopps '+unique),'Quellschreibstopp '+unique+'.txt','text/plain');
 let cutover=await cmd('migration.cutover.create',{name:'Synthetischer kontrollierter Datenschnitt '+unique,source_system:'csv'});
 const counts={customers:1,suppliers:0,products:0,orders:0,invoices:0,payments:0,employees:0,historical_documents:0};
 cutover=await cmd('migration.cutover.fence',{source_fence_kind:'write_stop',source_fence_statement:'Nur synthetischer Testdatenschnitt; die Testquelle ist tatsächlich unveränderlich.',evidence_document_version_id:proof.current_version_id,source_totals:{counts,currencies:{EUR:{invoice_net:'0',invoice_gross:'0',payment_incoming:'0',payment_outgoing:'0',receivable_open:'0'}}}},cutover);
 const customer=await withTenant(ctx,db=>one<any>(db,"SELECT id FROM parties WHERE is_customer ORDER BY created_at LIMIT 1"));await assert.rejects(()=>cmd('billing.payment.create',{party_id:customer.id,direction:'incoming',amount:'1',currency:'EUR',booking_date:'2026-10-17'}));pass('Confirmed source fence blocks new financial postings');
 const legacy='customer-'+unique,csv='legacy_id,name,email\n'+legacy+',Synthetischer Importkunde '+unique+',synthetic-'+unique+'@example.invalid\n'+legacy+',Synthetischer Importkunde '+unique+',synthetic-'+unique+'@example.invalid\n';
 const source=await upload(strToU8(csv),'Finales Delta '+unique+'.csv','text/csv');
 let delta=await cmd('migration.import.create',{name:'Finales synthetisches Delta '+unique,document_id:source.id,source_system:'csv',import_kind:'customers'});delta=await cmd('migration.import.stage',{},delta);await job('migration.stage','batchId',delta.id);delta=await get('import_batches',delta.id);const staged=await withTenant(ctx,db=>rows<any>(db,'SELECT * FROM staging_records WHERE batch_id=$1 ORDER BY row_number',[delta.id]));assert.equal(staged.length,2);delta=await cmd('migration.import.commit',{row_ids:staged.map(x=>x.id)},delta);assert.equal(delta.validation_report.imported,1);assert.equal(delta.validation_report.duplicates,1);pass('Identical legacy IDs in same real batch create one customer and one documented duplicate');
 cutover=await cmd('migration.cutover.attach',{batch_ids:[delta.id],is_final_delta:true},cutover);cutover=await cmd('migration.cutover.reconcile',{},cutover);assert.equal(cutover.status,'reconciled');cutover=await cmd('migration.cutover.release',{statement:'Synthetischer Quellschreibstopp, finale Deltacharge und vollständiger Zahlenabgleich wurden tatsächlich geprüft.'},cutover);assert.equal(cutover.status,'released');assert.equal((await get('legal_entities',ctx.legalEntityId)).recovery_locked,false);pass('Final delta, currency-aware totals, unchanged evidence and explicit fresh release reopen number circles');
 await writeFile(path+'/result.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,driveBatchId:batch.id,cutoverId:cutover.id,productionModified:false},null,2));
}finally{await closePools();}
