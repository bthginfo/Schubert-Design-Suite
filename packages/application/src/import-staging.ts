import type {ActorContext} from '@schubert/contracts';
import {withTenant,rows,insertMany,update} from '@schubert/db';
import {dec,requireRule} from '@schubert/domain';
import {getRecord,hash,baseData} from './core.js';
import {importKind,importKinds} from './migration.js';
const units=new Set(['piece','mm','m','m2','m3','kg','h','day','package']);
export async function stageImportRows(ctx:ActorContext,job:any,batch:any,table:string,raw:any[],sourceHash:string){
 let mapping:any=job.payload.mapping??batch.mapping??{};if(typeof mapping==='string')mapping=JSON.parse(mapping||'{}');const fields=mapping.fields??mapping;
 const mapped=raw.map(source=>{const data:Record<string,any>={};if(Object.keys(fields).length){for(const [key,path]of Object.entries(fields)){if(['record_path','entity_type'].includes(key))continue;if(typeof path==='string')data[key]=source[path]??path.split('.').reduce((object:any,part)=>object&&Object.prototype.hasOwnProperty.call(object,part)?object[part]:undefined,source);}}else Object.assign(data,source);return{source,data};});
 return withTenant(ctx,async db=>{
  const live=await getRecord(db,'job_runs',job.id,true);requireRule(live.status==='running'&&String(live.fencing_token)===String(job.fencing_token)&&new Date(live.lease_until)>new Date(),'STALE_JOB_FENCE','Ein neuer Versuch hat dieses Staging übernommen.',409);
  const current=await getRecord(db,table,batch.id,true);requireRule(current.status==='processing','IMPORT_STATE','Prüfkorb wurde inzwischen geändert.');const childTable=table==='price_import_batches'?'price_import_rows':'staging_records';
  await db.query(`DELETE FROM ${childTable} WHERE batch_id=$1 AND status NOT IN('approved','committed','duplicate')`,[batch.id]);
  const skuList=[...new Set(mapped.map(x=>x.data.sku).filter(Boolean).map(String))];
  const products=table==='price_import_batches'?await rows<any>(db,'SELECT id,sku FROM products WHERE sku=ANY($1::text[])',[skuList]):[],oldPrices=products.length?await rows<any>(db,'SELECT product_id,amount,basis_quantity,unit,currency FROM supplier_price_versions WHERE supplier_id=$1 AND product_id=ANY($2::uuid[]) AND active',[batch.supplier_id,products.map(x=>x.id)]):[];
  const result=mapped.map(({source,data},index)=>{
   const errors:string[]=[],base={...baseData(ctx),batch_id:batch.id,row_number:index+2};
   if(table==='price_import_batches'){
    let amount=null,basis=null;try{amount=dec(String(data.amount??data.price).replace(',','.')).toString();requireRule(dec(amount).gte(0),'PRICE','Preis prüfen.');}catch{errors.push('Preis fehlt oder ist ungültig.');}
    try{requireRule(data.basis_quantity!==undefined&&data.basis_quantity!=='','PRICE_BASIS','Preisbasismenge fehlt.');basis=dec(String(data.basis_quantity).replace(',','.')).toString();requireRule(dec(basis).gt(0),'PRICE_BASIS','Positive Preisbasismenge angeben.');}catch{errors.push('Preisbasismenge aus der Quelle bestätigen; zum Beispiel1Stück oder1000mm.');}
    const currency=String(data.currency??'').toUpperCase(),unit=String(data.unit??'');if(!/^[A-Z]{3}$/.test(currency))errors.push('Währung aus Quelle bestätigen.');if(!units.has(unit))errors.push('Quelleneinheit eindeutig zuordnen.');const matches=products.filter(x=>x.sku===String(data.sku)),product=matches.length===1?matches[0]:null;if(!product)errors.push(matches.length?'Artikelnummer ist mehrdeutig; exakte Variante zuordnen.':'Exakte Artikelvariante zuordnen.');
    const prior=oldPrices.filter(x=>x.product_id===product?.id&&x.currency===currency&&x.unit===unit);if(prior.length>1)errors.push('Mehrere aktive Preisstände müssen vor dem Import geklärt werden.');
    return{...base,product_id:product?.id??null,sku:data.sku?String(data.sku):null,description:String(data.description??data.name??''),amount,basis_quantity:basis,unit:unit||null,currency:currency||null,previous_amount:prior[0]?.amount??null,source_locator:'Zeile '+(index+2),errors,raw:source,status:errors.length?'needs_review':'matched'};
   }
   const kind=importKind(data.entity_type??mapping.entity_type??batch.import_kind??'customers');if(!importKinds.includes(kind as any))errors.push('Importart ist nicht freigegeben.');
   if(['customers','suppliers','products','employees'].includes(kind)&&!data.name)errors.push('Name oder Bezeichnung zuordnen.');
   if(kind==='orders'&&(!data.title||!data.customer_id&&!data.customer_legacy_id))errors.push('Auftragstitel und Kundenbezug zuordnen.');
   if(kind==='invoices')for(const key of ['number','document_id','net_total','tax_total','gross_total','currency'])if(data[key]===undefined||data[key]==='')errors.push('Originalfeld fehlt: '+key);
   if(kind==='payments')for(const key of ['direction','amount','currency','booking_date'])if(!data[key])errors.push('Zahlungsfeld fehlt: '+key);
   if(kind==='historical_documents'&&!data.document_id)errors.push('Tatsächliche private Originaldatei zuordnen.');
   if(kind==='products'&&!units.has(String(data.unit??'')))errors.push('Artikeleinheit zuordnen.');
   return{...base,entity_type:kind,legacy_id:String(data.legacy_id??data.id??'')||null,data,errors,status:errors.length?'needs_review':'matched'};
  });
  await insertMany(db,childTable,result);await update(db,table,batch.id,{status:'needs_review',...(table==='import_batches'?{checkpoint:raw.length,content_hash:sourceHash,validation_report:{rows:raw.length,sourceHash,mappingHash:hash(mapping),parserVersion:'bounded-import/1.0'}}:{})},current.version);return{batchId:batch.id,rows:raw.length};
 });
}
