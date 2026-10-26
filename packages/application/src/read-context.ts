import type {ActorContext,ModuleDefinition} from '@schubert/contracts';
import {moduleBySlug,modules} from '@schubert/contracts';
import {ident,one,rows,type DbClient} from '@schubert/db';
import {documentReadPredicate} from './document-access.js';

const has=(ctx:ActorContext,p:string)=>ctx.permissions.includes(p)||ctx.permissions.includes(p+'.read');
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** Only labels of references already visible to this reader, never extra record contents. */
export async function visibleReferenceLabels(db:DbClient,ctx:ActorContext,data:any){
 const records=[...data.records,...(data.detail?[data.detail]:[]),...Object.values(data.related).filter(Array.isArray).flat()] as any[];
 const references:Record<string,{table:string;keys:string[]}>={
  customers:{table:'parties',keys:['customer_id','party_id']},suppliers:{table:'parties',keys:['supplier_id']},
  orders:{table:'orders',keys:['order_id']},team:{table:'employees',keys:['employee_id','assigned_to']},
  stock:{table:'stock_items',keys:['stock_item_id']},products:{table:'products',keys:['product_id']},
  invoices:{table:'invoices',keys:['invoice_id']},'work-packages':{table:'work_packages',keys:['work_package_id']},
 };
 for(const [slug,ref] of Object.entries(references)){
  const ids=[...new Set(records.flatMap(record=>ref.keys.map(key=>record?.[key])).filter(uuid))].slice(0,1200);
  if(!ids.length)continue;
  const choices=await rows<any>(db,`SELECT id,COALESCE(NULLIF(concat_ws(' · ',number,COALESCE(name,title)),''),'Bezeichnung fehlt') name FROM ${ident(ref.table)} WHERE id=ANY($1::uuid[]) AND(legal_entity_id=$2 OR legal_entity_id IS NULL)`,[ids,ctx.legalEntityId]);
  data.lookups[slug]=[...new Map([...(data.lookups[slug]??[]),...choices].map((r:any)=>[r.id,r])).values()];
 }
}

/** Relations inherit the already checked parent scope and each target's read permission. */
export async function recordRelations(db:DbClient,ctx:ActorContext,m:ModuleDefinition,record:any,related:any){
 const id=record.id,slug=m.slug;
 const specs:Array<{slug:string;key:string;where:string;value?:string;columns:string}>=[];
 if(slug==='customers')specs.push(
  {slug:'inquiries',key:'inquiries',where:'customer_id',columns:'id,title,status,created_at'},
  {slug:'quotes',key:'quotes',where:'customer_id',columns:'id,number,title,status,created_at'},
  {slug:'orders',key:'orders',where:'customer_id',columns:'id,number,title,status,due_date'},
 );
 if(slug==='suppliers')specs.push(
  {slug:'purchase-orders',key:'purchase_orders',where:'supplier_id',columns:'id,number,title,status,created_at'},
  {slug:'supplier-invoices',key:'supplier_invoices',where:'supplier_id',columns:'id,number,title,status,created_at'},
 );
 if(['orders','work-packages'].includes(slug)){
  const orderId=slug==='orders'?id:record.order_id;
  specs.push({slug:'dispatch',key:'dispatch_assignments',where:'order_id',value:orderId,columns:'id,title,employee_id,starts_at,ends_at,status'});
  if(has(ctx,'orders'))related.work_reports=await rows(db,'SELECT id,order_id,work_package_id,employee_id,description,performed_on,status FROM work_reports WHERE order_id=$1 AND legal_entity_id=$2 ORDER BY created_at DESC LIMIT 50',[orderId,ctx.legalEntityId]);

 }
 if(has(ctx,'documents')){const orderId=slug==='orders'?id:record.order_id??null;related.documents=await rows(db,`SELECT d.id,d.name,d.original_name,d.current_version_id,d.status,d.mime_type,d.created_at FROM documents d WHERE(d.entity_id=$1 OR d.entity_id=$2 OR EXISTS(SELECT 1 FROM document_links dl WHERE dl.document_id=d.id AND((dl.entity_type=$3 AND dl.entity_id=$1)OR(dl.entity_type IN('orders','order') AND dl.entity_id=$2)))) AND ${documentReadPredicate(ctx,'d')} ORDER BY d.created_at DESC LIMIT 50`,[id,orderId,slug]);}
 if(['stock','orders'].includes(slug)){
  if(has(ctx,'inventory'))related.stock_reservations=await rows(db,`SELECT r.id,s.name,r.order_id,r.quantity,s.unit,r.status,r.created_at FROM stock_reservations r JOIN stock_items s ON s.id=r.stock_item_id WHERE r.${slug==='stock'?'stock_item_id':'order_id'}=$1 AND r.legal_entity_id=$2 ORDER BY r.created_at DESC LIMIT 50`,[id,ctx.legalEntityId]);
 }
 for(const spec of specs){const target=moduleBySlug(spec.slug);if(!target||!has(ctx,target.permission))continue;related[spec.key]=await rows(db,`SELECT ${spec.columns} FROM ${ident(target.table)} WHERE ${ident(spec.where)}=$1 AND legal_entity_id=$2 ORDER BY created_at DESC LIMIT 50`,[spec.value??id,ctx.legalEntityId]);}
 const actionLabels=new Map(modules.flatMap(module=>[
  [`${module.commandPrefix}.create`,`${module.singular} angelegt`],
  [`${module.commandPrefix}.update`,`${module.singular} geändert`],
  ...module.actions.map(action=>[action.name,action.label]),
 ] as string[][]).map(([key,value])=>[key,value]));
 related.audit_events=(await rows<any>(db,'SELECT a.action,a.aggregate_version,a.created_at,u.name actor_name FROM audit_events a LEFT JOIN "user" u ON u.id=a.actor_id WHERE a.aggregate_id=$1 AND(a.legal_entity_id=$2 OR a.legal_entity_id IS NULL) ORDER BY a.created_at DESC,a.audit_sequence DESC LIMIT 50',[id,ctx.legalEntityId])).map(event=>({...event,label:actionLabels.get(event.action)??'Vorgang aktualisiert'}));
}

export async function currentTimeSession(db:DbClient,ctx:ActorContext){
 if(!ctx.employeeId||!has(ctx,'time'))return null;
 return one(db,'SELECT id,version,active,started_at,ended_at,status FROM time_sessions WHERE employee_id=$1 AND active ORDER BY started_at DESC LIMIT 1',[ctx.employeeId]);
}

export async function taskContexts(db:DbClient,ctx:ActorContext,data:any){
 const tasks=[...(data.module?.slug==='tasks'?data.records:[]),...(data.module?.slug==='tasks'&&data.detail?[data.detail]:[]),...(data.related.tasks??[])];
 if(!tasks.length)return;
 const ids=[...new Set(tasks.map((task:any)=>task.id).filter(uuid))];
 const contexts=await rows<any>(db,`SELECT t.id,t.assigned_to,t.action_link,t.due_date,t.priority,e.aggregate_type,e.aggregate_id,
 i.id source_inquiry_exists,q.id source_quote_exists,o.id source_order_exists,COALESCE(i.title,q.title,o.title) source_title,COALESCE(q.number,o.number) source_number,
 COALESCE(t.order_id,qa.order_id) source_order_id
 FROM tasks t LEFT JOIN outbox_events e ON e.id=t.source_event_id
 LEFT JOIN inquiries i ON e.aggregate_type='inquiries' AND i.id=e.aggregate_id
 LEFT JOIN quotes q ON e.aggregate_type='quotes' AND q.id=e.aggregate_id
 LEFT JOIN LATERAL(SELECT order_id FROM quote_acceptances a WHERE a.quote_id=q.id AND a.status='accepted' ORDER BY a.created_at DESC LIMIT 1)qa ON TRUE
 LEFT JOIN orders o ON o.id=COALESCE(t.order_id,qa.order_id)
 WHERE t.id=ANY($1::uuid[]) AND t.legal_entity_id=$2`,[ids,ctx.legalEntityId]);
 const byId=new Map(contexts.map(row=>[row.id,row]));
 const candidate=(context:any)=>context.source_order_exists?'/orders/'+context.source_order_id:context.aggregate_type==='inquiries'?(context.source_inquiry_exists?'/inquiries/'+context.aggregate_id:null):context.aggregate_type==='quotes'?(context.source_quote_exists?'/quotes/'+context.aggregate_id:null):context.action_link;
 const groups=new Map<string,Set<string>>(),validLinks=new Map<string,string>();
 for(const context of contexts){const target=candidate(context);if(typeof target!=='string')continue;const [empty,slug,id,...rest]=target.split('/'),module=moduleBySlug(slug);if(empty||rest.length||!uuid(id)||!module||!has(ctx,module.permission))continue;const ids=groups.get(slug)??new Set<string>();ids.add(id);groups.set(slug,ids);}
 for(const [slug,ids]of groups){const module=moduleBySlug(slug)!;let scope='';const params:any[]=[];params.push([...ids],ctx.legalEntityId);if(['Employee','Workshop'].includes(ctx.role)&&(slug==='orders'||module.fields.some(field=>field.key==='order_id'))){params.push(ctx.employeeId);scope=` AND EXISTS(SELECT 1 FROM dispatch_assignments da WHERE da.order_id=${slug==='orders'?ident(module.table)+'.id':ident(module.table)+'.order_id'} AND da.employee_id=$3 AND da.status NOT IN('cancelled','deleted'))`;}
  for(const record of await rows<any>(db,`SELECT id,COALESCE(name,title,number) name FROM ${ident(module.table)} WHERE id=ANY($1::uuid[]) AND legal_entity_id=$2${scope}` ,params))validLinks.set('/'+slug+'/'+record.id,record.name);
 }
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date());
 for(const task of tasks){const context=byId.get(task.id);if(!context)continue;
  const target=candidate(context);
  const module=typeof target==='string'?moduleBySlug(target.split('/')[1]):null;
  task.assigned_to=context.assigned_to;
  task.source_label=[context.source_number,context.source_title||validLinks.get(target)].filter(Boolean).join(' · ')||'Konkreter Vorgangsbezug fehlt – ursprüngliche Mitteilung prüfen';
  task.source_href=target&&module&&has(ctx,module.permission)&&validLinks.has(target)?target:null;
  task.urgency=context.due_date?(context.due_date<today?'Überfällig seit ':context.due_date===today?'Heute fällig · ':'Fällig am ')+new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(context.due_date+'T12:00:00Z')):context.priority==='urgent'?'Als dringend markiert':context.priority==='high'?'Hohe Priorität':'Kein Termin festgelegt';
 }
}
