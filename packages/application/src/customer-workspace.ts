import {customerNextActions} from './customer-actions.js';
import {customerPlanningScope,customerDocumentScope} from './customer-scope.js';
import type {ActorContext, CustomerWorkspace, CustomerWorkspaceSection} from '@schubert/contracts';
import {rows, ident, type DbClient} from '@schubert/db';
import {documentReadPredicate} from './document-access.js';

const has = (ctx: ActorContext, permission: string) => ctx.permissions.includes(permission) || ctx.permissions.includes(permission + '.read');

/** The parent customer has already passed its record/role/entity access checks.
 * Counts cover all matching records; the preview is deliberately bounded. */
export async function customerWorkspace(db: DbClient, ctx: ActorContext, customerId: string): Promise<CustomerWorkspace> {
  const sections: CustomerWorkspaceSection[] = [];
  const specs = [
    {key:'orders', label:'Aufträge', icon:'briefcase', table:'orders', permission:'orders', active:"status NOT IN('completed','cancelled','closed','archived')"},
    {key:'inquiries', label:'Anfragen', icon:'chat', table:'inquiries', permission:'crm', active:"status NOT IN('won','lost','closed','archived')"},
    {key:'quotes', label:'Angebote', icon:'file', table:'quotes', permission:'sales', active:"status IN('draft','under_review','approved','published')"},
    {key:'studio', label:'Planungen', icon:'pen', table:'planning_projects', permission:'planning', active:"status NOT IN('archived','cancelled','completed')"},
    {key:'documents', label:'Unterlagen', icon:'file', table:'documents', permission:'documents', active:"status<>'archived'"},
    {key:'invoices', label:'Rechnungen', icon:'file', table:'invoices', permission:'billing', active:"status IN('draft','review','under_review','approved')"},
  ];
  for (const spec of specs) {
    if (!has(ctx, spec.permission)) continue;
    let scope = 'customer_id=$1';
    if (spec.key === 'studio') scope = customerPlanningScope('planning_projects','$1','$2');
    if (spec.key === 'documents') scope = customerDocumentScope('documents','$1','$2')+' AND '+documentReadPredicate(ctx);
    // Operational roles never gain a wider order scope through this read view.
    if (['Employee','Workshop'].includes(ctx.role) && spec.key === 'orders') scope += ' AND EXISTS(SELECT 1 FROM dispatch_assignments da WHERE da.order_id=orders.id AND da.employee_id=$3 AND da.status NOT IN(\'cancelled\',\'deleted\'))';
    if (['Employee','Workshop'].includes(ctx.role) && spec.key === 'studio') scope += ' AND (order_id IS NULL OR EXISTS(SELECT 1 FROM dispatch_assignments da WHERE da.order_id=planning_projects.order_id AND da.employee_id=$3 AND da.status NOT IN(\'cancelled\',\'deleted\')))';
    const result = await rows<any>(db, `SELECT id,name,title,number,status,updated_at${spec.key==='orders'?',due_date':''},
      count(*) OVER()::int total_count, count(*) FILTER(WHERE ${spec.active}) OVER()::int active_count
      FROM ${ident(spec.table)} WHERE legal_entity_id=$2 AND (${scope})
      ORDER BY (${spec.active}) DESC,updated_at DESC,id DESC LIMIT 8`,
      ['Employee','Workshop'].includes(ctx.role) && ['orders','studio'].includes(spec.key) ? [customerId,ctx.legalEntityId,ctx.employeeId] : [customerId,ctx.legalEntityId]);
    const params = new URLSearchParams({customer_id:customerId});
    sections.push({key:spec.key,label:spec.label,icon:spec.icon,slug:spec.key,total:Number(result[0]?.total_count??0),active:Number(result[0]?.active_count??0),
      items:result.map(({total_count,active_count,...item})=>item),href:`/${spec.key}?${params}`});
  }
  return {sections,nextActions:await customerNextActions(db,ctx,customerId)};
}
