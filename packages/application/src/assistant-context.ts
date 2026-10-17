import {z} from 'zod';
import {withTenant,rows,one} from '@schubert/db';
import {requireRule} from '@schubert/domain';
import {privateBytes,contentHash} from '@schubert/adapters';
import type {ActorContext} from '@schubert/contracts';
import {loadPage} from './queries.js';
import {getRecord,hash} from './core.js';
import {assertDocumentAccess,personnelDocumentTypes} from './document-access.js';

export const assistantInputSchema=z.object({message:z.string().trim().min(1).max(6000),mode:z.enum(['standard','design_review']).default('standard'),path:z.string().max(300).default(''),context:z.object({path:z.string().max(300),variantId:z.uuid().optional(),search:z.string().max(1000).optional(),selected_element_ids:z.array(z.uuid()).max(20).optional()}).optional(),references:z.array(z.object({document_id:z.uuid(),page_index:z.number().int().min(0).max(999).default(0),include_image:z.boolean().default(false)})).max(2).default([])});
const take=(record:any,keys:string[])=>Object.fromEntries(keys.filter(k=>record?.[k]!==undefined).map(k=>[k,record[k]]));
const forbidden=new Set(['team','leave','cost-rates','employment-periods','work-schedules','leave-entitlements','time-openings','time-adjustments','time','settings','account','audit','users']);
export type AssistantImage={dataUrl:string;documentId:string;documentVersionId:string;sourceHash:string;previewHash:string;pageIndex:number};
export function redactAssistantText(text:string){return text.replace(/(?:postgres(?:ql)?:\/\/|Bearer\s+|(?:sk|vcp)_[a-zA-Z0-9_-]{12,})\S*/gi,'[geschützter Zugang entfernt]').slice(0,8000);}

export async function prepareAssistantContext(ctx:ActorContext,input:z.infer<typeof assistantInputSchema>,origin:string){
 const path=(input.context?.path??input.path).replace(/^\/+|\/+$/g,'');requireRule(/^[a-z0-9/-]*$/.test(path)&&!forbidden.has(path.split('/')[0]),'AI_CONTEXT','Personal- und Administrationsakten bleiben außerhalb der KI. Die lokale Feldhilfe erklärt die Eingaben.',403);
 const url=new URL('/'+path,origin),search=new URLSearchParams(input.context?.search??'');for(const key of ['from','to','business_unit','currency','as_of'])if(search.has(key))url.searchParams.set(key,search.get(key)!);if(input.context?.variantId)url.searchParams.set('variant',input.context.variantId);
 const page=await loadPage(ctx,path,url);requireRule(!page.module?.hr&&page.module?.permission!=='hr','AI_PERSONNEL_CONTEXT','Personalakten werden nicht an KI übermittelt.',403);
 const allowedCommands=[...(ctx.permissions.includes('crm')?['crm.inquiry.create']:[]),...(ctx.permissions.includes('sales')?['sales.quote.create','communication.email.create']:[]),...(ctx.permissions.includes('tasks')?['communication.task.create']:[])];
 let context:any={entityType:page.module?.slug??page.view,allowedCommands,record:take(page.detail,['id','number','title','name','version','status','business_unit','description','customer_id','order_id','due_date','requested_date','valid_until','currency','net_total','tax_total','gross_total','payable_total','prepaid_total','commercial_status','planning_status','execution_status','acceptance_status','billing_status','payment_status'])};
 if(page.detail&&Array.isArray(page.related.lines))context.lines=page.related.lines.slice(0,35).map((line:any)=>take(line,['id','position','description','quantity','unit','unit_price','tax_rate','net_amount','line_type','selected','optional','product_id','price_version_id']));
 const customerId=page.detail?.customer_id??(['customers','suppliers'].includes(page.module?.slug??'')?page.detail?.id:null);if(customerId){const party=await withTenant(ctx,db=>one<any>(db,'SELECT email FROM parties WHERE id=$1',[customerId]));context.allowedRecipients=party?.email?[party.email.toLowerCase()]:[];}
 if(page.view==='reports')context={entityType:'reports',allowedCommands:[],filters:take(page.summary.reportContext,['from','to','currency','businessUnit','business_unit','legalEntityName']),dataAsOf:page.summary.dataAsOf,metrics:page.summary.metrics,series:page.related.report_series,definitions:page.related.metric_definitions,limitations:'Direkte Kosten sind kein Hauptbuchgewinn. Unbekannte Werte bleiben unbekannt; Währungen getrennt.',recommendations:(page.related.recommendations??[]).slice(0,5).map((r:any)=>take(r,['id','title','reason','evidence','severity']))};
 if(page.view==='studio'){
  const variant=page.related.variants?.find((v:any)=>v.id===(input.context?.variantId??page.related.variants[0]?.id)),revision=page.related.revisions?.find((r:any)=>r.id===variant?.head_revision_id);requireRule(variant&&revision,'AI_DESIGN_CONTEXT','Zuerst ein Planungsprojekt und einen gespeicherten Entwurf auswählen.');
  const ids=input.context?.selected_element_ids??[];requireRule(ids.every(id=>revision.snapshot.elements.some((e:any)=>e.id===id)),'AI_ELEMENT_SCOPE','Eine ausgewählte Komponente gehört nicht zur aktuellen Revision.');
  context={entityType:'planning',allowedCommands:ctx.permissions.includes('planning')?['planning.design.change']:[],designKind:page.detail.kind,variantId:variant.id,baseVersion:variant.version,revisionId:revision.id,contentHash:revision.content_hash,selectedElementIds:ids,snapshot:revision.snapshot};
 }
 const references=[...input.references];if(page.module?.slug==='documents'&&page.detail&&!references.some(r=>r.document_id===page.detail.id))references.unshift({document_id:page.detail.id,page_index:0,include_image:false});
 const images:AssistantImage[]=[],sources:any[]=[];
 for(const reference of references.slice(0,2)){
  const source=await withTenant(ctx,async db=>{
   const doc=await getRecord(db,'documents',reference.document_id);await assertDocumentAccess(db,ctx,doc);requireRule(!personnelDocumentTypes.includes(doc.entity_type),'AI_PERSONNEL_CONTEXT','Personaldokumente bleiben außerhalb der KI.',403);const version=await getRecord(db,'document_versions',doc.current_version_id);requireRule(doc.status==='available'&&version.status==='available','AI_SOURCE_UNAVAILABLE','Nur geprüfte verfügbare Originale als KI-Quelle verwenden.');
   const snippets=await rows<any>(db,"SELECT field_name,value,source_locator,source_kind,reviewed_by FROM document_extractions WHERE document_version_id=$1 AND(source_locator LIKE $2||';%' OR source_locator=$2) ORDER BY field_name LIMIT 40",[version.id,'pageStart='+reference.page_index]);
   const preview=reference.include_image?await one<any>(db,"SELECT result FROM job_runs WHERE job_type='document.preview' AND payload->>'documentVersionId'=$1 AND(payload->>'pageIndex')::int=$2 AND(payload->>'aiPreview')::boolean AND status='completed' ORDER BY created_at DESC LIMIT 1",[version.id,reference.page_index]):null;
   let previewFile:any=null;if(preview){const v=await getRecord(db,'document_versions',preview.result.document_version_id),d=await getRecord(db,'documents',v.document_id);await assertDocumentAccess(db,ctx,d);previewFile={version:v,blob:await getRecord(db,'blob_objects',v.blob_object_id),result:preview.result};requireRule(d.status==='available'&&v.status==='available','AI_SOURCE_UNAVAILABLE','Die vorbereitete Bildseite ist nicht mehr verfügbar.');}
   requireRule(!reference.include_image||previewFile,'AI_PREVIEW_REQUIRED','Diese Bild- oder PDF-Seite zuerst über „Bild vorbereiten“ verkleinern und prüfen. Anschließend den Status aktualisieren.',409);
   return{doc,version,snippets,previewFile};
  });
  const text=redactAssistantText(source.snippets.map(s=>s.field_name.startsWith('__page_text')?s.value:s.field_name+': '+s.value+' [Fundstelle '+s.source_locator+']').join('\n'));
  sources.push({documentId:source.doc.id,documentVersionId:source.version.id,name:source.doc.name,sourceHash:source.version.content_hash,pageIndex:reference.page_index,text,sourceStatus:'untrusted_source',extractionReviewed:source.snippets.length>0&&source.snippets.every(s=>s.source_kind!=='ocr_candidate'||s.reviewed_by),textAvailable:!!text});
  if(source.previewFile){const {version,blob,result}=source.previewFile,bytes=await privateBytes(blob.storage_key,900000,ctx);requireRule(bytes.length<=900000&&contentHash(bytes)===version.content_hash&&version.content_hash===result.previewHash&&result.sourceHash===source.version.content_hash&&result.width<=512&&result.height<=512,'AI_PREVIEW_BINDING','Die kostensparende Vorschau stimmt nicht mit der ausgewählten Originalseite überein.');images.push({dataUrl:'data:image/png;base64,'+Buffer.from(bytes).toString('base64'),documentId:source.doc.id,documentVersionId:source.version.id,sourceHash:source.version.content_hash,previewHash:version.content_hash,pageIndex:reference.page_index});}
 }
 if(sources.length){context.sources=sources;context.sourceKind='selected_document';}
 context=JSON.parse(JSON.stringify(context));return{context,images,contextHash:hash(context)};
}
