import type {AppData,Row} from './types.ts';
/** A bounded transcript keeps each answer's original record distinct from the live screen. */
export function assistantHistory(messages:Row[]){
 return messages.filter(row=>['user','assistant'].includes(row.role)&&typeof row.text==='string'&&!['pending','failed','cancelled'].includes(row.status)).slice(-6).map(row=>{
  const origin=typeof row.origin?.label==='string'?`[Bezug ${JSON.stringify(row.origin.label.slice(0,120))}${typeof row.origin.href==='string'&&/^\/(?!\/)/.test(row.origin.href)?' '+row.origin.href.slice(0,400):''}]\n`:'';
  const applied=row.applied&&!row.undone&&row.records?.length?'\nÜbernommen: '+row.records.map((item:Row)=>item.record.number??item.record.title??item.record.name??item.module).join(', '):'';
  return{role:row.role as 'user'|'assistant',text:(origin+row.text+applied).slice(0,1800)};
 });
}
/** Page data has already been resolved by the server; never infer upload targets from URL text. */
export function assistantUploadTarget(data:AppData){
 const has=(permission:string)=>data.context?.permissions.some(value=>value==='*'||value===permission||value===permission.split('.')[0]+'.*');
 const slug=data.module?.slug,record=data.detail;
 if(record?.id&&['customers','orders'].includes(slug??'')&&has(data.module?.permission??(slug==='customers'?'crm':'sales')))
  return{entityType:slug!,entityId:record.id as string,entityName:String(record.name??record.title??record.number??'Geöffneter Vorgang')};
 if(data.view==='studio'&&record?.id&&has('planning'))return{entityType:'studio',entityId:record.id as string,entityName:String(record.name??'Geöffnete Planung')};
 const customer=data.summary?.customerContext;
 if(customer?.id&&has('crm'))return{entityType:'customers',entityId:customer.id as string,entityName:String(customer.name)};
 return undefined;
}
export function selectedPlanningElements(value:unknown):string[]{return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&id.length>0&&id.length<=200))].slice(0,20):[];}
export type AssistantSource={key:string;documentId:string;name:string;pageNumber:number|undefined;includeImage:boolean;preview?:Row;working?:boolean;error?:string;stage?:'uploading'|'checking'|'preparing'|'ready'|'paused'|'blocked';uploaded?:boolean};
export function sourceReady(row:AssistantSource,maxDimension=1440){return !!row.documentId&&Number.isInteger(row.pageNumber)&&Number(row.pageNumber)>=1&&Number(row.pageNumber)<=1000&&!row.working&&row.stage!=='blocked'&&(!row.uploaded||row.stage==='ready')&&(!row.includeImage||row.preview?.status==='completed'&&Number(row.preview.width)>0&&Number(row.preview.width)<=maxDimension&&Number(row.preview.height)>0&&Number(row.preview.height)<=maxDimension);}
export function sourceReferences(rows:AssistantSource[]){if(rows.length>2||rows.some(row=>!sourceReady(row)))throw new Error('Wählen Sie höchstens zwei konkrete Quellen. Für Bilder und PDF-Seiten zuerst die kleine Bildreferenz vorbereiten und ihren Abschluss bestätigen.');return rows.map(row=>({document_id:row.documentId,page_index:Number(row.pageNumber)-1,include_image:row.includeImage}));}
