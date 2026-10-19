import{randomUUID}from'node:crypto';
import{rows,insertMany}from'@schubert/db';
import{register,baseData,hash}from'./core.js';
import{stoneCatalog,STONE_CATALOG_VERSION}from'./stone-catalog-data.js';

register('catalog.stones.import','catalog',async r=>{
 await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['stone-catalog:'+r.ctx.tenantId+':'+r.ctx.legalEntityId]);
 const existing=await rows<any>(r.db,"SELECT id,properties->>'sourceKey' key FROM material_spec_versions WHERE properties->>'sourceCatalog'=$1",[STONE_CATALOG_VERSION]),present=new Set(existing.map(x=>x.key)),pending=stoneCatalog.filter(x=>!present.has(x.key));
 if(!pending.length)return{id:existing[0]?.id,version:1,added:0,total:stoneCatalog.length,command_noop:true};
 const common=baseData(r.ctx),materials:any[]=[],versions:any[]=[];
 for(const item of pending){const materialId=randomUUID(),versionId=randomUUID();materials.push({...common,id:materialId,name:item.name,status:'active',notes:'Öffentliche Handelsbezeichnung · '+item.stoneType+' · '+(item.origin??'Herkunft offen')});versions.push({...common,id:versionId,material_spec_id:materialId,name:item.name+' · Katalogreferenz',revision:1,status:'source_reference',content_hash:hash(item),approved_at:null,notes:'Quelle: '+item.sourceUrl+'. Verfügbarkeit, Plattenbild, Oberfläche, Maße und technische Eignung vor Bestellung prüfen.',properties:{sourceCatalog:STONE_CATALOG_VERSION,sourceKey:item.key,sourceUrl:item.sourceUrl,listingUrl:item.listingUrl,sourceHash:item.sourceHash,checkedOn:item.checkedOn,supplier:item.supplier,stoneType:item.stoneType,family:item.family,origin:item.origin,visualReference:'representative',technicalApproval:false}});}
 await insertMany(r.db,'material_specs',materials);await insertMany(r.db,'material_spec_versions',versions);
 return{id:versions[0].id,version:1,added:versions.length,total:stoneCatalog.length,sourceVersion:STONE_CATALOG_VERSION};
});
