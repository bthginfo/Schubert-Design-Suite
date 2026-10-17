import type {ActorContext} from '@schubert/contracts';
import {withTenant,one,type DbClient} from '@schubert/db';
import {requireRule} from '@schubert/domain';

export const blobDefaults={provider:'vercel_blob',storageLimitMb:800,monthlyTransferLimitMb:800,monthlyAdvancedOps:1500,monthlySimpleOps:5000,providerDeletionLock:false};
export async function blobUsageIn(db:DbClient){
 const period=new Date().toISOString().slice(0,7);
 const data=await one<any>(db,`SELECT (SELECT COALESCE(sum(size_bytes),0) FROM blob_storage_objects WHERE status<>'deleted') bytes,(SELECT row_to_json(u) FROM blob_usage_months u WHERE period=$1) monthly,now() as_of`,[period]);
 return {storedMb:Number(data.bytes)/1000000,monthlyTransferMb:Number(data.monthly?.transfer_bytes??0)/1000000,monthlyAdvancedOps:Number(data.monthly?.advanced_operations??0),monthlySimpleOps:Number(data.monthly?.simple_operations??0),month:period,asOf:data.as_of,scope:'Nur durch die Anwendung erfasste Vorgänge; Vercel-Kontozugriffe und andere Projekte sind nicht enthalten.'};
}
/** Reservations are conservative: failed provider calls still consume the reserved operation budget. */
export async function reserveBlobIn(db:DbClient,ctx:ActorContext,input:{key?:string;size?:number;transfer?:number;simple?:number;advanced?:number}){
 await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[ctx.tenantId+':'+ctx.legalEntityId+':blob-budget']);
 const settings=await one<any>(db,"SELECT configuration FROM integration_connections WHERE provider='archive' AND status='configured' LIMIT 1"),p={...blobDefaults,...settings?.configuration},period=new Date().toISOString().slice(0,7);
 const usage=await one<any>(db,`INSERT INTO blob_usage_months(tenant_id,legal_entity_id,period,status)VALUES($1,$2,$3,'active')ON CONFLICT(tenant_id,legal_entity_id,period)DO UPDATE SET period=EXCLUDED.period RETURNING *`,[ctx.tenantId,ctx.legalEntityId,period]);
 const transfer=Math.max(0,input.transfer??0),simple=Math.max(0,input.simple??0),advanced=Math.max(0,input.advanced??0);
 requireRule(Number(usage.transfer_bytes)+transfer<=Number(p.monthlyTransferLimitMb)*1000000&&Number(usage.simple_operations)+simple<=Number(p.monthlySimpleOps)&&Number(usage.advanced_operations)+advanced<=Number(p.monthlyAdvancedOps),'BLOB_MONTHLY_LIMIT','Die eingestellte monatliche Speicher-Nutzungsgrenze ist erreicht. Der Superadmin sieht den erfassten Verbrauch in den Einstellungen.',429);
 if(input.key){requireRule(input.key.startsWith(ctx.tenantId+'/')&&Number.isSafeInteger(input.size)&&input.size!>=0,'BLOB_SCOPE','Ungültige Speicherreservierung.');const old=await one<any>(db,'SELECT size_bytes,status FROM blob_storage_objects WHERE storage_key=$1',[input.key]);
  if(old&&old.status!=='deleted')requireRule(Number(old.size_bytes)===input.size,'BLOB_RESERVATION','Speicherpfad ist bereits für eine andere Größe reserviert.',409);
  else {const size=await one<any>(db,"SELECT COALESCE(sum(size_bytes),0)::text bytes FROM blob_storage_objects WHERE status<>'deleted'");requireRule(Number(size.bytes)+input.size!<=Number(p.storageLimitMb)*1000000,'BLOB_STORAGE_LIMIT','Die eingestellte Speichergrenze ist erreicht. Originale werden nicht automatisch gelöscht oder kostenpflichtig erweitert.',409);await db.query("INSERT INTO blob_storage_objects(tenant_id,legal_entity_id,storage_key,size_bytes,status,reserved_until)VALUES($1,$2,$3,$4,'reserved',now()+interval '20 minutes')ON CONFLICT(tenant_id,storage_key)DO UPDATE SET size_bytes=EXCLUDED.size_bytes,status='reserved',reserved_until=EXCLUDED.reserved_until",[ctx.tenantId,ctx.legalEntityId,input.key,input.size]);}
 }
 await db.query('UPDATE blob_usage_months SET transfer_bytes=transfer_bytes+$1,simple_operations=simple_operations+$2,advanced_operations=advanced_operations+$3,updated_at=now(),version=version+1 WHERE id=$4',[transfer,simple,advanced,usage.id]);
}
export async function reserveBlob(ctx:ActorContext,input:Parameters<typeof reserveBlobIn>[2]){return withTenant(ctx,db=>reserveBlobIn(db,ctx,input));}
export async function storedBlob(ctx:ActorContext,key:string,size:number,hash?:string){return withTenant(ctx,db=>db.query("UPDATE blob_storage_objects SET status='stored',size_bytes=$1,content_hash=$2,reserved_until=NULL,updated_at=now(),version=version+1 WHERE storage_key=$3",[size,hash??null,key]));}
export async function deletedBlob(ctx:ActorContext,key:string){return withTenant(ctx,db=>db.query("UPDATE blob_storage_objects SET status='deleted',updated_at=now(),version=version+1 WHERE storage_key=$1",[key]));}
export async function blobReadBudget(ctx:ActorContext,key:string,range?:string){
 return withTenant(ctx,async db=>{let size:number;const matched=range?.match(/^bytes=(\d+)-(\d+)$/);if(matched)size=Number(matched[2])-Number(matched[1])+1;else{const record=await one<any>(db,'SELECT size_bytes FROM blob_storage_objects WHERE storage_key=$1 UNION ALL SELECT size_bytes FROM blob_objects WHERE storage_key=$1 LIMIT 1',[key]);requireRule(record,'BLOB_METADATA','Die Größe des privaten Originals ist nicht registriert.',404);size=Number(record.size_bytes);}
 requireRule(size>0&&size<=100*1024*1024,'BLOB_READ_LIMIT','Dateibereich überschreitet die zulässige Größe.');await reserveBlobIn(db,ctx,{transfer:size,simple:1});});
}
