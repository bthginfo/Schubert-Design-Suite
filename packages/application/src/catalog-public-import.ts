import {randomUUID} from 'node:crypto';
import {rows,insertMany} from '@schubert/db';
import {register,baseData,hash} from './core.js';
import {publicProducts,PUBLIC_CATALOG_VERSION} from './catalog-public-data.js';

register('catalog.reference.import','catalog',async r=>{
 await r.db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['public-catalog:'+r.ctx.tenantId+':'+r.ctx.legalEntityId]);
 const known=await rows<any>(r.db,"SELECT id,validation_report->>'publicSourceKey' key FROM product_variant_versions WHERE status='source_reference'"),present=new Set(known.map(row=>row.key));
 const pending=publicProducts.filter(p=>!present.has(PUBLIC_CATALOG_VERSION+':'+p.key));
 if(!pending.length)return{id:known[0]?.id,version:1,added:0,total:publicProducts.length,command_noop:true};
 const manufacturers=await rows<any>(r.db,'SELECT id,name FROM manufacturers');
 const manufacturerIds=new Map(manufacturers.map(m=>[String(m.name).toLowerCase(),m.id]));
 for(const name of new Set(pending.map(p=>p.manufacturer)))if(!manufacturerIds.has(name.toLowerCase())){const manufacturer=await r.insert('manufacturers',{name,status:'active'});manufacturerIds.set(name.toLowerCase(),manufacturer.id);}
 const base=baseData(r.ctx),products:any[]=[],variants:any[]=[],versions:any[]=[];
 for(const item of pending){
  const productId=randomUUID(),variantId=randomUUID(),versionId=randomUUID(),title=item.manufacturer+' '+item.name;
  products.push({...base,id:productId,name:title,sku:item.article,manufacturer_id:manufacturerIds.get(item.manufacturer.toLowerCase()),kind:'merchandise',unit:'piece',active:true,status:'active',description:item.notes,width_mm:item.width,depth_mm:item.depth,height_mm:item.height});
  variants.push({...base,id:variantId,product_id:productId,name:'Kataloggrundmodell '+item.article,status:'active',active_version_id:versionId});
  versions.push({...base,id:versionId,product_variant_id:variantId,name:title,manufacturer_sku:item.article,width_mm:item.width,depth_mm:item.depth,height_mm:item.height,installation_type:item.installation,source_url:item.sourceUrl,notes:item.notes,revision:1,status:'source_reference',content_hash:hash(item),approved_at:null,approved_by:null,validation_report:{kind:'manufacturer_public_reference',publicSourceKey:PUBLIC_CATALOG_VERSION+':'+item.key,sourceHash:item.sourceHash,checkedOn:'2026-10-18',locator:item.locator,catalogVersion:PUBLIC_CATALOG_VERSION,geometry:'rectangular_envelope',orderingDetailsPending:true}});
 }
 await insertMany(r.db,'products',products);await insertMany(r.db,'product_variants',variants);await insertMany(r.db,'product_variant_versions',versions);
 return{id:versions[0].id,version:1,added:versions.length,total:publicProducts.length,sourceVersion:PUBLIC_CATALOG_VERSION};
});
