import type { ActorContext, CustomerNextAction } from "@schubert/contracts";
import { rows, type DbClient } from "@schubert/db";
const has = (ctx: ActorContext, key: string) =>
  ctx.permissions.some((p) => p === "*" || p === key || p === key + ".read");
const open =
  "NOT IN ('completed','done','cancelled','closed','archived','deleted')";
/** Only explicit source relationships produce an action; missing data is never a guessed task. */
export async function customerNextActions(
  db: DbClient,
  ctx: ActorContext,
  customerId: string,
  now = new Date(),
): Promise<CustomerNextAction[]> {
  const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Berlin",
    }).format(now),
    items: CustomerNextAction[] = [];
  const operational = ["Employee", "Workshop"].includes(ctx.role);
  const params = operational
    ? [customerId, ctx.legalEntityId, ctx.employeeId]
    : [customerId, ctx.legalEntityId];
  const orderScope = operational
    ? " AND EXISTS(SELECT 1 FROM dispatch_assignments da WHERE da.order_id=o.id AND da.employee_id=$3 AND da.status NOT IN ('cancelled','deleted'))"
    : "";
  if (has(ctx, "tasks") && has(ctx, "orders")) {
    const tasks = await rows<any>(
      db,
      `SELECT t.id,coalesce(t.title,t.name,'Offene Aufgabe') title,t.due_date,e.name owner_name,o.title order_title FROM tasks t JOIN orders o ON o.id=t.order_id AND o.legal_entity_id=$2 LEFT JOIN employees e ON e.id=t.assigned_to AND e.legal_entity_id=$2 WHERE t.legal_entity_id=$2 AND o.customer_id=$1 AND t.status ${open}${orderScope}${operational ? " AND t.assigned_to=$3" : ""} ORDER BY t.due_date NULLS LAST,t.updated_at DESC,t.id LIMIT 8`,
      params,
    );
    items.push(
      ...tasks.map((t) => ({
        id: "task:" + t.id,
        kind: "task" as const,
        title: t.title,
        detail: t.order_title ?? "Aufgabe zum Auftrag",
        dueDate: t.due_date,
        owner: t.owner_name ?? null,
        href: "/tasks/" + t.id,
        action: "Aufgabe öffnen",
        overdue: !!t.due_date && t.due_date < today,
      })),
    );
  }
  if (has(ctx, "orders")) {
    const work = await rows<any>(
      db,
      `SELECT w.id,coalesce(w.title,w.name,'Offenes Arbeitspaket') title,w.kind,w.due_date,e.name owner_name,o.title order_title FROM work_packages w JOIN orders o ON o.id=w.order_id AND o.legal_entity_id=$2 LEFT JOIN employees e ON e.id=w.assigned_to AND e.legal_entity_id=$2 WHERE w.legal_entity_id=$2 AND o.customer_id=$1 AND w.status ${open}${orderScope} ORDER BY w.due_date NULLS LAST,w.updated_at DESC,w.id LIMIT 8`,
      params,
    );
    items.push(
      ...work.map((w) => ({
        id: "work:" + w.id,
        kind: "work" as const,
        title: ["survey", "measurement", "aufmass"].includes(w.kind)
          ? "Aufmaß bearbeiten: " + w.title
          : w.title,
        detail: w.order_title ?? "Arbeitspaket zum Auftrag",
        dueDate: w.due_date,
        owner: w.owner_name ?? null,
        href: "/work-packages/" + w.id,
        action: "Arbeitspaket öffnen",
        overdue: !!w.due_date && w.due_date < today,
      })),
    );
  }
  if (has(ctx, "sales") && !operational) {
    const quotes = await rows<any>(
      db,
      "SELECT id,coalesce(title,name,number,'Angebot') title,valid_until FROM quotes WHERE customer_id=$1 AND legal_entity_id=$2 AND status='published' AND accepted_version_id IS NULL ORDER BY valid_until NULLS LAST,updated_at DESC,id LIMIT 5",
      [customerId, ctx.legalEntityId],
    );
    items.push(
      ...quotes.map((q) => ({
        id: "quote:" + q.id,
        kind: "quote" as const,
        title:
          q.valid_until && q.valid_until < today
            ? "Abgelaufenes Angebot prüfen"
            : "Kundenrückmeldung einholen",
        detail: q.title,
        dueDate: q.valid_until,
        owner: null,
        href: "/quotes/" + q.id,
        action: "Angebot öffnen",
        overdue: !!q.valid_until && q.valid_until < today,
      })),
    );
  }
  if (has(ctx, "finance") && has(ctx, "billing") && !operational) {
    const debts = await rows<any>(
      db,
      "SELECT r.id,r.due_date,r.disputed,i.id invoice_id,coalesce(i.number,i.title,i.name,'Rechnung') title FROM receivables r JOIN invoices i ON i.id=r.invoice_id AND i.legal_entity_id=$2 AND i.customer_id=$1 WHERE r.legal_entity_id=$2 AND r.party_id=$1 AND r.open_amount>0 AND r.transferred_to_id IS NULL AND r.due_date<$3 AND i.status='issued' ORDER BY r.due_date,r.id LIMIT 5",
      [customerId, ctx.legalEntityId, today],
    );
    items.push(
      ...debts.map((r) => ({
        id: "receivable:" + r.id,
        kind: "payment" as const,
        title: r.disputed
          ? "Strittige Forderung klären"
          : "Überfällige Zahlung prüfen",
        detail: r.title,
        dueDate: r.due_date,
        owner: null,
        href: "/invoices/" + r.invoice_id,
        action: "Rechnung öffnen",
        overdue: true,
      })),
    );
  }
  return items
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 6);
}
