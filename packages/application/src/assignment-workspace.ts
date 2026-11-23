import { one, rows, type DbClient } from '@schubert/db';
import type { ActorContext, DesignSnapshot } from '@schubert/contracts';
import { requireRule } from '@schubert/domain';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const can = (ctx: ActorContext, permission: string) =>
  ctx.permissions.includes(permission) || ctx.permissions.includes(permission + '.read');

type Assignment = {
  id: string; title: string; status: string; employee_id: string; employee_name: string;
  order_id: string; order_name: string; starts_at: string; ends_at: string;
  location?: string | null; site_address?: string | null;
  cemetery_location?: string | null; grave_number?: string | null;
  contact_name?: string | null; contact_phone?: string | null;
};

async function getAssignment(db: DbClient, ctx: ActorContext, id: string) {
  requireRule(uuid.test(id), 'NOT_FOUND', 'Einsatz ist nicht verfügbar.', 404);
  const assignment = await one<Assignment>(db, `
    SELECT a.id, a.title, a.status, a.employee_id, e.name employee_name, a.order_id,
      concat_ws(' · ', o.number, o.title) order_name, a.starts_at, a.ends_at, a.location,
      nullif(concat_ws(', ', s.street, nullif(concat_ws(' ', s.postal_code, s.city), '')), '') site_address,
      nullif(concat_ws(', ', c.name, c.city), '') cemetery_location, g.grave_number,
      p.name contact_name, p.phone contact_phone
    FROM dispatch_assignments a
    JOIN orders o ON o.id = a.order_id AND o.legal_entity_id = a.legal_entity_id
    JOIN employees e ON e.id = a.employee_id
    LEFT JOIN sites s ON s.id = o.site_id AND (s.legal_entity_id = a.legal_entity_id OR s.legal_entity_id IS NULL)
    LEFT JOIN grave_plots g ON g.id = o.grave_plot_id AND (g.legal_entity_id = a.legal_entity_id OR g.legal_entity_id IS NULL)
    LEFT JOIN cemeteries c ON c.id = g.cemetery_id AND (c.legal_entity_id = a.legal_entity_id OR c.legal_entity_id IS NULL)
    LEFT JOIN parties p ON p.id = o.customer_id AND (p.legal_entity_id = a.legal_entity_id OR p.legal_entity_id IS NULL)
    WHERE a.id = $1 AND a.legal_entity_id = $2 AND a.status <> 'deleted'
      AND ($3::boolean OR ($5::boolean AND a.employee_id = $4 AND a.status <> 'cancelled'))
  `, [id, ctx.legalEntityId, can(ctx, 'dispatch'), ctx.employeeId, can(ctx, 'orders')]);
  requireRule(assignment, 'NOT_FOUND', 'Einsatz ist nicht verfügbar.', 404);
  return assignment;
}

type ApprovedPlan = { project_id: string; project_name: string; variant_id: string; variant_name: string; revision_id: string; revision_number: number; approved_at: string };

export async function assignmentWorkspace(db: DbClient, ctx: ActorContext, id: string) {
  const assignment = await getAssignment(db, ctx, id);
  const own = assignment.employee_id === ctx.employeeId;
  const active = assignment.status !== 'cancelled' && assignment.status !== 'draft';
  const plans = active && (own || can(ctx, 'planning'))
    ? await rows<ApprovedPlan>(db, `
      SELECT * FROM (
        SELECT DISTINCT ON (p.id) p.id project_id, p.name project_name,
          v.id variant_id, v.name variant_name, r.id revision_id, r.revision_number, a.created_at approved_at
        FROM planning_projects p
        JOIN design_variants v ON v.planning_project_id = p.id
        JOIN design_revisions r ON r.variant_id = v.id
        JOIN design_approvals a ON a.variant_id = v.id AND a.revision_id = r.id AND a.content_hash = r.content_hash
        WHERE p.order_id = $1 AND p.legal_entity_id = $2
          AND a.kind = 'design' AND a.status = 'approved'
        ORDER BY p.id, a.created_at DESC, r.id DESC
      ) approved ORDER BY approved_at DESC, project_id LIMIT 12
    `, [assignment.order_id, ctx.legalEntityId])
    : null;
  return { ...assignment, plans, canRecordTime: own && active && ctx.permissions.includes('time') };
}

/** Grant the assignee access to this frozen design approval only. */
export async function approvedAssignmentPlan(db: DbClient, ctx: ActorContext, id: string, revisionId: string) {
  const assignment = await getAssignment(db, ctx, id);
  requireRule(uuid.test(revisionId) && assignment.status !== 'cancelled' && assignment.status !== 'draft' &&
    (assignment.employee_id === ctx.employeeId || can(ctx, 'planning')),
    'NOT_FOUND', 'Freigegebener Plan ist nicht verfügbar.', 404);
  const plan = await one<{
    project_name: string; revision_number: number; created_at: string; content_hash: string; snapshot: DesignSnapshot;
  }>(db, `
    SELECT p.name project_name, r.revision_number, r.created_at, r.content_hash, r.snapshot
    FROM design_revisions r
    JOIN design_variants v ON v.id = r.variant_id
    JOIN planning_projects p ON p.id = v.planning_project_id
    WHERE r.id = $1 AND p.order_id = $2 AND p.legal_entity_id = $3
      AND EXISTS (
        SELECT 1 FROM design_approvals a WHERE a.variant_id = v.id AND a.revision_id = r.id
          AND a.content_hash = r.content_hash AND a.kind = 'design' AND a.status = 'approved'
      )
  `, [revisionId, assignment.order_id, ctx.legalEntityId]);
  requireRule(plan, 'NOT_FOUND', 'Freigegebener Plan ist nicht verfügbar.', 404);
  return plan;
}

export async function timeAssignment(db: DbClient, ctx: ActorContext, id: string | null) {
  if (!id || !ctx.employeeId || !can(ctx, 'orders') || !uuid.test(id)) return null;
  return one<{ id: string; order_id: string; order_name: string; day: string }>(db, `
    SELECT a.id, a.order_id, concat_ws(' · ', o.number, o.title) order_name,
      (a.starts_at AT TIME ZONE 'Europe/Berlin')::date::text AS "day"
    FROM dispatch_assignments a JOIN orders o ON o.id = a.order_id AND o.legal_entity_id = a.legal_entity_id
    WHERE a.id = $1 AND a.legal_entity_id = $2 AND a.employee_id = $3
      AND a.status NOT IN ('draft', 'cancelled', 'deleted')
  `, [id, ctx.legalEntityId, ctx.employeeId]);
}

export async function orderHandoff(db: DbClient, ctx: ActorContext, orderId: string) {
  const plan = can(ctx, 'planning');
  const dispatch = can(ctx, 'dispatch');
  if (!plan && !dispatch && !ctx.employeeId) return null;
  return one<{
    plans: { id: string; name: string }[];
    assignment: { id: string; title: string; employee_name: string; starts_at: string; work_package_id: string | null } | null;
    owner_name: string | null;
  }>(db, `
    SELECT COALESCE((SELECT jsonb_agg(p) FROM (
      SELECT id, name FROM planning_projects WHERE $3::boolean AND order_id = $1
        AND legal_entity_id = $2 AND status NOT IN ('deleted', 'cancelled', 'archived')
      ORDER BY updated_at DESC, id LIMIT 2
    ) p), '[]'::jsonb) plans,
    (SELECT to_jsonb(d) FROM (
      SELECT a.id, a.title, a.starts_at, a.work_package_id, e.name employee_name
      FROM dispatch_assignments a JOIN employees e ON e.id = a.employee_id
      WHERE a.order_id = $1 AND a.legal_entity_id = $2
        AND a.status = 'confirmed' AND a.ends_at > now()
        AND ($4::boolean OR a.employee_id = $5)
      ORDER BY a.starts_at, a.id LIMIT 1
    ) d) assignment,
    (SELECT e.name FROM orders o JOIN employees e ON e.id = o.assigned_to
      WHERE o.id = $1 AND o.legal_entity_id = $2) owner_name
  `, [orderId, ctx.legalEntityId, plan, dispatch, ctx.employeeId]);
}
