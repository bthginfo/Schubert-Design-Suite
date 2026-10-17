import {one,type DbClient} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {modules,moduleBySlug} from '@schubert/contracts';
import {assertPermission,requireRule} from '@schubert/domain';
import {assertOrderScope,getRecord} from './core.js';
export const personnelDocumentTypes=['employee','employees','hr','team','employment_period','employment_periods','leave_request','leave_requests','employee_cost_rate','time_correction','workforce.employee','workforce.leave','employee-cost-rates','cost-rates','employment-periods','work-schedules','leave-entitlements','time-openings','time-adjustments'];
export const financialDocumentTypes=['report_snapshot','invoice','invoices','supplier-invoices','billing.invoice','purchasing.invoice','dunning','datev','bank-imports','bank-transactions','receivables','payables','credit-offsets'];
export function normalizeDocumentType(type?:string|null){if(!type)return null;return modules.find(m=>m.commandPrefix===type)?.slug??({employee:'team',employees:'team',planning_project:'studio',planning_projects:'studio',design_revision:'design_revision',order:'orders',customer:'customers',supplier:'suppliers',invoice:'invoices'} as Record<string,string>)[type]??type;}
export async function assertDocumentTarget(db:DbClient,ctx:ActorContext,type:string|null,id:string|null){
 requireRule(!!type===!!id,'DOCUMENT_TARGET','Art und Datensatz gemeinsam auswählen.');
 if(!type){assertPermission(ctx.permissions,'documents');return;}
 if(personnelDocumentTypes.includes(type)){assertPermission(ctx.permissions,'hr');}
 const module=moduleBySlug(type),table=module?.table??({studio:'planning_projects',design_revision:'design_revisions',quote_version:'quote_versions'} as Record<string,string>)[type];
 requireRule(table,'DOCUMENT_TARGET','Diesen Dokumentbezug über einen bekannten Fachbereich auswählen.');
 const record=await getRecord(db,table,id);
 if(module)assertPermission(ctx.permissions,module.permission);else assertPermission(ctx.permissions,'planning');
 if(type==='orders')await assertOrderScope(db,ctx,record.id);else if(record.order_id)await assertOrderScope(db,ctx,record.order_id);
}
export async function assertDocumentAccess(db:DbClient,ctx:ActorContext,doc:any){
 const type=normalizeDocumentType(doc.entity_type);
 if(personnelDocumentTypes.includes(doc.entity_type)||type&&personnelDocumentTypes.includes(type))assertPermission(ctx.permissions,'hr');else assertPermission(ctx.permissions,'documents');
 if(financialDocumentTypes.includes(type??''))requireRule(ctx.permissions.some(p=>['billing','finance','finance.read'].includes(p)),'NOT_FOUND','Unterlage ist nicht verfügbar.',404);
 if(['Employee','Workshop','Dispatcher'].includes(ctx.role)){const allowed=await one(db,`SELECT 1 FROM documents d WHERE d.id=$1 AND ${documentReadPredicate(ctx,'d')}`,[doc.id]);requireRule(allowed,'NOT_FOUND','Unterlage ist nicht verfügbar.',404);}
}
/** A SQL predicate shared by file lists and full-text snippets, before any content leaves the server. */
export function documentReadPredicate(ctx:ActorContext,alias='documents'){
 const hr=ctx.permissions.includes('hr'),finance=ctx.permissions.some(p=>['billing','finance','finance.read'].includes(p));
 const terms=[hr?'TRUE':`COALESCE(${alias}.entity_type,'') <> ALL(ARRAY[${personnelDocumentTypes.map(t=>"'"+t+"'").join(',')}])`];
 if(!finance)terms.push(`COALESCE(${alias}.entity_type,'') <> ALL(ARRAY[${financialDocumentTypes.map(t=>"'"+t+"'").join(',')}])`);
 if(['Employee','Workshop','Dispatcher'].includes(ctx.role))terms.push(`(${alias}.created_by=current_setting('app.actor_id',true) OR EXISTS(SELECT 1 FROM dispatch_assignments da WHERE da.employee_id=(SELECT employee_id FROM memberships WHERE user_id=current_setting('app.actor_id',true) AND active LIMIT 1) AND da.status NOT IN('cancelled','deleted') AND ((COALESCE(${alias}.entity_type,'') IN('order','orders','sales.order') AND da.order_id=${alias}.entity_id) OR EXISTS(SELECT 1 FROM document_links dl WHERE dl.document_id=${alias}.id AND dl.entity_type IN('order','orders') AND dl.entity_id=da.order_id))))`);
 return terms.join(' AND ');
}
export async function assertCustomerDocument(db:DbClient,doc:any,customerId:string){
 requireRule(doc.status==='available'&&doc.visibility==='customer'&&!personnelDocumentTypes.includes(doc.entity_type),'DOCUMENT_AUDIENCE','Eine eigene geprüfte Kundenfassung verwenden.');
 const owner=await one(db,`SELECT 1 WHERE
  ($1::text IN('customer','customers','party','parties') AND $2::uuid=$3::uuid)
  OR ($1 IN('order','orders') AND EXISTS(SELECT 1 FROM orders WHERE id=$2 AND customer_id=$3))
  OR ($1 IN('quote','quotes') AND EXISTS(SELECT 1 FROM quotes WHERE id=$2 AND customer_id=$3))
  OR ($1 IN('quote_version','quote_versions') AND EXISTS(SELECT 1 FROM quote_versions v JOIN quotes q ON q.id=v.quote_id WHERE v.id=$2 AND q.customer_id=$3))
  OR ($1 IN('deliveries','acceptances') AND EXISTS(SELECT 1 FROM orders o WHERE o.customer_id=$3 AND(o.id=(SELECT order_id FROM delivery_notes WHERE id=$2 AND $1='deliveries') OR o.id=(SELECT order_id FROM acceptance_reports WHERE id=$2 AND $1='acceptances'))))
  OR ($1 IN('invoice','invoices') AND EXISTS(SELECT 1 FROM invoices WHERE id=$2 AND customer_id=$3))
  OR ($1 IN('design_revision','design_revisions') AND EXISTS(SELECT 1 FROM design_revisions r JOIN design_variants v ON v.id=r.variant_id JOIN planning_projects p ON p.id=v.planning_project_id JOIN orders o ON o.id=p.order_id WHERE r.id=$2 AND o.customer_id=$3))
  OR EXISTS(SELECT 1 FROM document_links WHERE document_id=$4 AND entity_type IN('customer','customers') AND entity_id=$3)`,[normalizeDocumentType(doc.entity_type)??'',doc.entity_id??null,customerId,doc.id]);
 requireRule(owner,'DOCUMENT_CUSTOMER_SCOPE','Die Kundenfassung gehört nicht zu diesem Kunden.',404);
}
