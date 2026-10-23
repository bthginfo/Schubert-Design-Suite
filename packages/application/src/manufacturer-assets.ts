import {z} from 'zod';
import {manufacturerAssetSchema,type ActorContext} from '@schubert/contracts';
import {withTenant,rows,one,type DbClient} from '@schubert/db';
import {requireRule,assertPermission,assertVersion} from '@schubert/domain';
import {register,getRecord} from './core.js';
import {catalogEvidence} from './catalog.js';

register('manufacturer.asset.create','manufacturer_assets',async r=>r.insert('manufacturer_assets',{...manufacturerAssetSchema.parse(r.payload),status:'draft'}));
register('manufacturer.asset.update','manufacturer_assets',async r=>{
 const asset=await getRecord(r.db,'manufacturer_assets',r.command.id,true);assertVersion(asset.version,r.command.expectedVersion);
 requireRule(asset.status==='draft'&&!asset.published_at,'ASSET_FROZEN','Eine verwendete Herstellerfassung bleibt unverändert. Eine neue Unterlage hinzufügen.');
 return r.update('manufacturer_assets',asset.id,manufacturerAssetSchema.parse(r.payload),asset.version);
});
register('manufacturer.asset.attach','manufacturer_assets',async r=>{
 const asset=await getRecord(r.db,'manufacturer_assets',r.command.id,true);assertVersion(asset.version,r.command.expectedVersion);
 requireRule(asset.status==='draft'&&!asset.published_at,'ASSET_FROZEN','Die verwendete Originalfassung bleibt erhalten. Eine neue Unterlage hinzufügen.');
 const {document_id}=z.strictObject({document_id:z.uuid()}).parse(r.payload),doc=await getRecord(r.db,'documents',document_id);
 requireRule(doc.entity_type==='manufacturer-assets'&&doc.entity_id===asset.id&&doc.visibility==='internal','ASSET_DOCUMENT_SCOPE','Die Datei muss privat zu genau dieser Herstellerunterlage hochgeladen werden.');
 const version=await getRecord(r.db,'document_versions',doc.current_version_id);
 return r.update('manufacturer_assets',asset.id,{document_version_id:version.id,source_hash:version.content_hash},asset.version);
});
register('manufacturer.asset.publish','manufacturer_assets',async r=>{
 const asset=await getRecord(r.db,'manufacturer_assets',r.command.id,true);assertVersion(asset.version,r.command.expectedVersion);
 const p=z.strictObject({use_planning:z.boolean(),use_ai:z.boolean(),rights_statement:z.string().trim().min(20).max(2000),rights_confirmed:z.literal(true)}).parse(r.payload);
 requireRule(asset.status==='draft'&&!asset.published_at&&asset.document_version_id,'ASSET_SOURCE','Eine Originaldatei hochladen und ihre Dateiprüfung abwarten.');
 requireRule(p.use_planning||p.use_ai,'ASSET_USE','Mindestens einen erlaubten Verwendungszweck auswählen.');
 const source=await catalogEvidence(r,asset.document_version_id);
 const mime=source.document.mime_type;
 if(p.use_ai)requireRule(['application/pdf','image/png','image/jpeg','image/webp','image/tiff'].includes(mime),'ASSET_AI_TYPE','Für KI-Referenzen eine PDF-Unterlage oder ein Bild verwenden. SVG, DXF und GLB bleiben technische Dateien.');
 if(asset.kind==='plan'&&['image/svg+xml','application/dxf','image/vnd.dxf','application/x-dxf'].includes(mime))requireRule(asset.source_unit,'ASSET_UNIT','Die tatsächliche Originaleinheit der Kontur angeben.');
 return r.update('manufacturer_assets',asset.id,{use_planning:p.use_planning,use_ai:p.use_ai,rights_statement:p.rights_statement,published_at:new Date(),published_by:r.ctx.actorId,source_hash:source.version.content_hash,status:'available'},asset.version);
});
register('manufacturer.asset.archive','manufacturer_assets',async r=>{
 const asset=await getRecord(r.db,'manufacturer_assets',r.command.id,true);assertVersion(asset.version,r.command.expectedVersion);
 requireRule(asset.status!=='archived','ASSET_ARCHIVED','Diese Unterlage ist bereits ausgeblendet.');
 return r.update('manufacturer_assets',asset.id,{status:'archived'},asset.version);
});

export async function manufacturerAssetsIn(db:DbClient,ctx:ActorContext,input:{q?:string;studio?:string;kind?:string;cursor?:string;manage?:boolean}){
 const manage=input.manage===true;
 assertPermission(ctx.permissions,manage?'manufacturer_assets':'planning');
 const parsed=z.object({q:z.string().max(150).default(''),studio:z.enum(['both','memorial','room_plan']).optional(),kind:z.enum(['plan','reference','datasheet','model']).optional(),cursor:z.uuid().optional()}).parse(input);
 const items=await rows<any>(db,`SELECT a.*,d.id document_id,d.name file_name,d.mime_type,d.status file_status,v.status version_status,d.size_bytes FROM manufacturer_assets a
 LEFT JOIN document_versions v ON v.id=a.document_version_id LEFT JOIN documents d ON d.id=v.document_id
 WHERE ${manage?"a.status<>'archived'":"a.status='available' AND d.status='available' AND v.status='available'"}
 AND($1='' OR concat_ws(' ',a.name,a.manufacturer_name,a.article_reference) ILIKE $2)
 AND($3::text IS NULL OR a.studio_scope='both' OR a.studio_scope=$3)
 AND($4::text IS NULL OR a.kind=$4)
 AND($5::uuid IS NULL OR (a.created_at,a.id)<(SELECT created_at,id FROM manufacturer_assets WHERE id=$5)) ORDER BY a.created_at DESC,a.id DESC LIMIT 25`,[parsed.q,'%'+parsed.q+'%',parsed.studio??null,parsed.kind??null,parsed.cursor??null]);
 return{items:items.slice(0,24),hasMore:items.length>24,nextCursor:items.length>24?items[23].id:null};
}
export async function searchManufacturerAssets(ctx:ActorContext,input:{q?:string;studio?:string;kind?:string;cursor?:string;manage?:boolean}){
 return withTenant(ctx,db=>manufacturerAssetsIn(db,ctx,input));
}
