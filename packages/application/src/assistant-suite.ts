import {
  assistantSuiteAreas, assistantUpdateAction, moduleBySlug, suiteLookupSchema,
  type ActorContext, type AssistantPlanBinding, type AssistantRecordLink, type AssistantSuiteArea,
} from "@schubert/contracts";
import { ident, one, rows, type DbClient } from "@schubert/db";
import { requireRule, rolePermissions } from "@schubert/domain";
import { compactContext } from "../../ai/src/model-routing.js";
import { inspectPlanningSnapshot } from "../../ai/src/planning-facts.js";
import { assistantDocumentPredicate } from "./document-access.js";
import { assertOrderScope } from "./core.js";
import { reportDetails } from "./report-data.js";

const limit = 6;
const orderScoped = new Set(["Employee", "Workshop"]);
const ownTasks = new Set(["Employee", "Workshop", "Dispatcher"]);
const financialRestricted = new Set(["Employee", "Workshop", "Dispatcher", "HR", "TechAdmin"]);
const inactive = "('deleted','erased','archived','inactive')";
const entity = (alias: string) => `(${alias}.legal_entity_id=$1 OR ${alias}.legal_entity_id IS NULL)`;
const has = (actor: ActorContext, permission: string) =>
  actor.permissions.includes(permission) || actor.permissions.includes(permission + ".read");

type Area = {
  fields?: string[];
  details?: string[];
  money?: string[];
  order?: boolean;
  party?: "customer_id" | "supplier_id" | "party_id";
  date?: string;
  search?: string[];
  lines?: string;
};
const areas: Record<Exclude<AssistantSuiteArea, "studio" | "reports">, Area> = {
  customers: { fields: ["city"], details: ["email", "phone", "street", "postal_code", "country"] },
  suppliers: { fields: ["city"], details: ["email", "phone", "street", "postal_code", "country"] },
  contacts: { party: "party_id", details: ["email", "phone"] },
  addresses: { party: "party_id", fields: ["city"], details: ["street", "postal_code", "country"] },
  sites: { party: "customer_id", fields: ["city"], details: ["street", "postal_code"] },
  cemeteries: { fields: ["city", "rules_valid_until"], details: ["source_url"] },
  graves: { party: "customer_id", fields: ["cemetery_id", "grave_number", "grave_type", "usage_until"], search: ["grave_number"] },
  inquiries: { party: "customer_id", fields: ["requested_date", "business_unit", "next_contact"], details: ["description"] },
  quotes: { party: "customer_id", order: true, fields: ["valid_until"], money: ["net_total", "gross_total", "currency"], lines: "quote_lines" },
  orders: { party: "customer_id", fields: ["due_date", "business_unit", "planning_status", "execution_status", "billing_status"], money: ["currency", "budget_net"], lines: "order_lines" },
  "work-packages": { order: true, fields: ["kind", "due_date"], details: ["planned_hours", "completion_criteria"] },
  "change-orders": { order: true, fields: ["days_effect"], money: ["amount_net", "currency"], lines: "change_order_lines" },
  deliveries: { order: true, fields: ["delivery_date"], date: "delivery_date" },
  acceptances: { order: true, fields: ["acceptance_date"], date: "acceptance_date" },
  defects: { order: true, fields: ["due_date"], details: ["description"] },
  invoices: { party: "customer_id", order: true, fields: ["kind", "due_date", "service_date", "issued_at"], money: ["net_total", "tax_total", "gross_total", "payable_total", "currency"], lines: "invoice_lines" },
  "supplier-invoices": { party: "supplier_id", order: true, fields: ["supplier_number", "invoice_date", "due_date"], search: ["supplier_number"], date: "invoice_date", money: ["net_total", "tax_total", "gross_total", "currency"], lines: "supplier_invoice_lines" },
  receivables: { party: "party_id", fields: ["invoice_id", "due_date"], money: ["original_amount", "open_amount", "currency"] },
  payables: { party: "party_id", fields: ["invoice_id", "due_date"], money: ["original_amount", "open_amount", "currency"] },
  payments: { party: "party_id", fields: ["direction", "booking_date"], date: "booking_date", money: ["amount", "currency"] },
  "purchase-orders": { party: "supplier_id", order: true, fields: ["delivery_date"], money: ["net_total", "gross_total", "currency"], lines: "purchase_order_lines" },
  products: { fields: ["sku", "kind", "unit", "width_mm", "depth_mm", "height_mm"], search: ["sku"], details: ["description", "surface"] },
  manufacturers: {},
  stock: { fields: ["kind", "quantity", "reserved_quantity", "unit", "product_id", "location_id"], details: ["width_mm", "height_mm", "thickness_mm"] },
  "stock-locations": {},
  tasks: { order: true, fields: ["assigned_to", "priority", "due_date"], details: ["description"] },
  dispatch: { order: true, fields: ["employee_id", "equipment_id", "work_package_id", "starts_at", "ends_at", "location", "required_skill"] },
  team: {},
  resources: { fields: ["kind", "inspection_due"] },
  documents: { fields: ["document_kind", "mime_type"] },
};

export function suiteAreaAllowed(actor: ActorContext, area: AssistantSuiteArea) {
  if (area === "studio") return has(actor, "planning");
  if (area === "reports") return has(actor, "reports");
  if (area === "team") return has(actor, "dispatch");
  if (area === "contacts" || area === "addresses") return has(actor, "crm");
  if (area === "manufacturers") return has(actor, "catalog") || has(actor, "planning");
  if (area === "resources" && has(actor, "dispatch")) return true;
  if (area === "orders" && (has(actor, "billing") || has(actor, "dispatch"))) return true;
  const module = moduleBySlug(area);
  return !!module && has(actor, module.permission);
}

export async function authorizeAssistantRead(db: DbClient, actor: ActorContext) {
  const member = await one<{ role: string; permissions: string[]; permission_version: number; employee_id: string | null; legal_entity_id: string }>(db,
    "SELECT role,permissions,permission_version,employee_id,legal_entity_id FROM memberships WHERE user_id=$1 AND active FOR SHARE",
    [actor.actorId]);
  requireRule(member && member.legal_entity_id === actor.legalEntityId, "SESSION_REVOKED", "Der Zugang ist nicht mehr freigegeben.", 401);
  requireRule(member.permission_version === actor.permissionVersion, "AI_STALE_CONTEXT", "Ihre Berechtigungen haben sich geändert. Laden Sie die Seite neu.", 409);
  return { ...actor, role: member.role, employeeId: member.employee_id,
    permissions: [...new Set([...(rolePermissions[member.role] ?? []), ...(member.permissions ?? [])])] };
}

export async function assistantAreaEnabled(db: DbClient, area: AssistantSuiteArea, actor: ActorContext) {
  const permission = area === "studio" ? "planning" :
    area === "reports" ? "reports" : (area === "contacts" || area === "addresses") ? "crm" :
    area === "manufacturers" ? (has(actor, "catalog") ? "catalog" : "planning") :
    (area === "team" || (area === "resources" && !has(actor, "inventory"))) ? "dispatch" :
    (area === "orders" && !has(actor, "orders")) ? (has(actor, "dispatch") ? "dispatch" : "billing") :
    moduleBySlug(area)?.permission;
  return !await one(db, "SELECT 1 FROM module_settings WHERE module=$1 AND enabled=false", [permission]);
}

const scrub = (value: string, max = 160) =>
  value.replace(/(?:postgres(?:ql)?:\/\/|Bearer\s+|(?:sk|vcp)[-_][a-zA-Z0-9_-]{12,})\S*/gi, "[geschützter Zugang entfernt]").slice(0, max);
const sqlMatch = (query: string) => "%" + query.replace(/[\\%_]/g, "\\$&") + "%";
function explicitlyNamed(name: unknown, message: string) {
  if (typeof name !== "string" || name.length < 3 || !message) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])", "iu").test(message);
}
const label = (row: Record<string, unknown>) =>
  [row.number, row.name ?? row.title].filter(Boolean).map(value => scrub(String(value))).join(" · ") || "Vorgang";
const clean = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).filter(([, value]) => value != null).map(([key, value]) =>
    [key, typeof value === "string" ? scrub(value, key === "description" ? 360 : 180) : value]));

type Candidate = Record<string, any>;
type Lookup = ReturnType<typeof suiteLookupSchema.parse>;
type LookupResult = {
  area: AssistantSuiteArea;
  items: Candidate[];
  resolvedId?: string | null;
  ambiguous?: boolean;
  lines?: Record<string, unknown>[];
  [key: string]: unknown;
};
export async function readAssistantPlan(db: DbClient, actor: ActorContext, variantId: string) {
  requireRule(suiteAreaAllowed(actor, "studio") && await assistantAreaEnabled(db, "studio", actor),
    "FORBIDDEN", "Dieser Plan ist nicht verfügbar.", 403);
  const row = await one<Candidate>(db, `SELECT p.id project_id,p.name project_name,p.order_id,p.kind,p.workflow_preset,
    v.id,v.name variant_name,v.version,r.id revision_id,r.snapshot,r.content_hash
    FROM design_variants v JOIN planning_projects p ON p.id=v.planning_project_id
    JOIN design_revisions r ON r.id=v.head_revision_id AND r.variant_id=v.id
    WHERE ${entity("p")} AND v.id=$2 AND p.status NOT IN ${inactive}`, [actor.legalEntityId, variantId]);
  requireRule(row, "NOT_FOUND", "Dieser Plan ist nicht verfügbar.", 404);
  if (row.order_id) await assertOrderScope(db, actor, row.order_id);
  const binding: AssistantPlanBinding = {
    variantId: row.id, projectId: row.project_id, revisionId: row.revision_id, baseVersion: row.version,
    contentHash: row.content_hash, label: [row.project_name, row.variant_name].filter(Boolean).map(value => scrub(value)).join(" · "),
    href: "/studio/" + row.project_id + "?variant=" + row.id,
  };
  const context = {
    entityType: "planning", designKind: row.kind, snapshot: row.snapshot, variantId: row.id,
    revisionId: row.revision_id, baseVersion: row.version, contentHash: row.content_hash,
    project: { id: row.project_id, name: row.project_name, kind: row.kind, workflow_preset: row.workflow_preset },
    selectedElementIds: [],
  };
  return { binding, context };
}

export function createSuiteReadScope(message = "") {
  const matched = new Map<string, Record<string, unknown>>();
  const links = new Map<string, AssistantRecordLink>();
  const actions = new Map<string, NonNullable<ReturnType<typeof assistantUpdateAction>>>();
  const plans = new Map<string, Awaited<ReturnType<typeof readAssistantPlan>>>();

  function remember(actor: ActorContext, area: AssistantSuiteArea, row: Candidate) {
    matched.set(area + ":" + row.id, clean(row));
    if (row.customer_id && (has(actor, "crm") || has(actor, "billing") || has(actor, "sales")))
      matched.set("customers:" + row.customer_id, { id: row.customer_id, name: row.party_name });
    const action = assistantUpdateAction(actor.permissions, actor.role, { module: area, id: row.id, version: row.version, status: row.status, label: label(row) });
    if (action) actions.set(action.name + ":" + row.id, action);
    return action;
  }

  return {
    actions: () => [...actions.values()],
    links: () => [...links.values()].slice(0, 8),
    reference: (area: string, id: string) => matched.get(area + ":" + id),
    recipients: () => [...matched.entries()].flatMap(([key, row]) =>
      /^(customers|suppliers|contacts):/.test(key) && typeof row.email === "string" ? [row.email.toLowerCase()] : []),
    plans: () => [...plans.values()],
    async lookup(db: DbClient, actor: ActorContext, args: Lookup): Promise<LookupResult> {
      const { area, query, status, from, to, details } = args;
      const empty = { area, items: [], source: "suite_records" };
      if (!suiteAreaAllowed(actor, area) || !await assistantAreaEnabled(db, area, actor))
        return { ...empty, unavailable: true };
      if (area === "reports") {
        const url = new URL("https://suite.invalid/reports");
        if (from) url.searchParams.set("from", from);
        if (to) url.searchParams.set("to", to);
        const report = await reportDetails(db, actor, url);
        links.set("/reports" + url.search, { area, href: "/reports" + url.search, label: "Auswertungen" });
        return { ...empty, items: (Array.isArray(report.metrics) ? report.metrics : Object.entries(report.metrics ?? {}).map(([key, value]) => ({ key, value }))).slice(0, 12),
          asOf: report.as_of, context: report.context, meaning: "Kennzahlen aus dem gleichen Bericht. Währungen, Zeitraum und unbekannte Werte getrennt behandeln." };
      }
      // References used for writing require a real search term and a unique match.
      const params: unknown[] = [actor.legalEntityId, query, query && sqlMatch(query), status, from, to, actor.employeeId];
      const searchable = (columns: string[]) => `($2::text IS NULL OR concat_ws(' ',${columns.join(",")}) ILIKE $3 ESCAPE '\\')`;
      const assignScope = (order: string) => `EXISTS(SELECT 1 FROM dispatch_assignments da
        WHERE da.order_id=${order} AND da.employee_id=$7::uuid AND da.status NOT IN('cancelled','deleted'))`;
      if (area === "studio") {
        const found = await rows<Candidate>(db, `SELECT v.id,p.id project_id,p.name,v.name variant_name,p.kind,p.status,o.number order_number
          FROM planning_projects p JOIN design_variants v ON v.planning_project_id=p.id
          LEFT JOIN orders o ON o.id=p.order_id AND ${entity("o")}
          WHERE ${entity("p")} AND p.status NOT IN ${inactive} AND v.head_revision_id IS NOT NULL
          AND ${searchable(["p.name", "v.name", "v.id::text", "p.id::text", "o.number", "o.title"])}
          AND ($4::text IS NULL OR p.status=$4) AND ($5::date IS NULL OR p.created_at >= $5::date)
          AND ($6::date IS NULL OR p.created_at < ($6::date + 1)) AND ($7::uuid IS NULL OR $7::uuid IS NOT NULL)
          ${orderScoped.has(actor.role) ? "AND (p.order_id IS NULL OR " + assignScope("p.order_id") + ")" : ""}
          ORDER BY (lower(v.id::text)=lower($2)) DESC NULLS LAST,p.updated_at DESC,v.name,v.id LIMIT ${limit + 1}`, params);
        for (const row of found.slice(0, limit)) {
          const href = "/studio/" + row.project_id + "?variant=" + row.id;
          links.set(href, { href, area, label: [row.name, row.variant_name].filter(Boolean).map(value => scrub(value)).join(" · ") });
        }
        const exact = found.find(row => row.id === query);
        const chosen = exact ?? (query && found.length === 1 ? found[0] : null);
        if (!chosen || !details) return { ...empty, items: found.slice(0, limit).map(clean), possiblyMore: found.length > limit, ambiguous: !!query && !chosen && found.length > 1 };
        const plan = await readAssistantPlan(db, actor, chosen.id);
        plans.set(chosen.id, plan);
        let compact;
        for (const count of [8, 4, 2, 1]) {
          const candidate = compactContext(plan.context, count);
          if (Buffer.byteLength(JSON.stringify(candidate)) < 2800) { compact = candidate; break; }
        }
        const facts = inspectPlanningSnapshot(plan.context.snapshot, []);
        return { ...empty, items: [clean(chosen)], planningTarget: plan.binding, editable: actor.permissions.includes("planning"),
          planningContext: compact ?? null, lines: facts.lines.slice(0, 3), planSummary: { elementCount: plan.context.snapshot.elements.length, release: facts.release },
          meaning: "Ausschnitt der tatsächlich gespeicherten Variante. Nur sichtbare Element-IDs für Änderungen verwenden." };
      }

      const module = moduleBySlug(area)!;
      const config = areas[area];
      const permittedFinancial = !financialRestricted.has(actor.role);
      const referenceOnly = !module || !has(actor, module.permission) || area === "team";
      const scope = [entity("r"), `r.status NOT IN ${inactive}`, "($4::text IS NULL OR r.status=$4)"];
      const join: string[] = [];
      const select = ["r.id", "r.name", "r.title", "r.number", "r.status", "r.version"];
      const search = ["r.id::text", "r.name", "r.title", "r.number", ...(config.search ?? []).map(column => "r." + column)];
      if (config.party) {
        join.push(`LEFT JOIN parties p ON p.id=r.${config.party} AND ${entity("p")} AND p.status NOT IN ${inactive}`);
        search.push("p.name", "p.number");
        select.push(`p.id AS ${config.party}`, "p.name party_name");
      }
      if (area === "contacts" || area === "addresses") scope.push("p.is_customer");
      if (config.order) {
        join.push(`LEFT JOIN orders o ON o.id=r.order_id AND ${entity("o")}`);
        search.push("o.number", "o.title");
        select.push("o.id order_id", "o.number order_number");
      }
      if (area === "team") {
        scope.push("r.active");
        if (from || to) select.push(`NOT (
          EXISTS(SELECT 1 FROM leave_requests l WHERE l.employee_id=r.id AND l.status='approved'
            AND l.starts_on<=COALESCE($6::date,$5::date) AND l.ends_on>=COALESCE($5::date,$6::date))
          OR EXISTS(SELECT 1 FROM dispatch_assignments da WHERE da.employee_id=r.id AND da.status NOT IN('cancelled','deleted')
            AND da.ends_at>(COALESCE($5::date,$6::date)::timestamp AT TIME ZONE 'Europe/Berlin')
            AND da.starts_at<((COALESCE($6::date,$5::date)+1)::timestamp AT TIME ZONE 'Europe/Berlin'))
          ) no_registered_conflict`);
        scope.push("($5::date IS NULL OR $5::date IS NOT NULL)", "($6::date IS NULL OR $6::date IS NOT NULL)");
      }
      if (area === "customers" || area === "suppliers") scope.push("r.active IS DISTINCT FROM false", area === "customers" ? "r.is_customer" : "r.is_supplier");
      if (area === "products") scope.push("r.active IS DISTINCT FROM false");
      if (area === "documents") scope.push("r.status='available'", assistantDocumentPredicate(actor, "r"));
      if (area === "dispatch") {
        join.push(`LEFT JOIN employees e ON e.id=r.employee_id AND ${entity("e")}`);
        search.push("e.name");
        select.push("e.name employee_name");
        scope.push("r.status<>'cancelled'", "($5::date IS NULL OR r.ends_at > ($5::timestamp AT TIME ZONE 'Europe/Berlin'))",
          "($6::date IS NULL OR r.starts_at < (($6::date + 1)::timestamp AT TIME ZONE 'Europe/Berlin'))");
      } else if (area !== "team") {
        const date = "r." + (config.date ?? "created_at");
        scope.push(`($5::date IS NULL OR ${date} >= $5::date)`, `($6::date IS NULL OR ${date} < ($6::date + 1))`);
      }
      if (area === "tasks" && ownTasks.has(actor.role)) scope.push("r.assigned_to=$7::uuid");
      if (orderScoped.has(actor.role) && (area === "orders" || config.order))
        scope.push(assignScope(area === "orders" ? "r.id" : "r.order_id"));
      scope.push("($7::uuid IS NULL OR $7::uuid IS NOT NULL)", searchable(search));
      const customerDirectory = area === "contacts" || area === "addresses";
      const publicFields = referenceOnly && !customerDirectory ? [] : [...(config.fields ?? []), ...(permittedFinancial ? config.money ?? [] : [])];
      const detailFields = (!referenceOnly || customerDirectory) && details ? config.details ?? [] : [];
      select.push(...[...publicFields, ...detailFields].map(column => "r." + ident(column)));
      const found = await rows<Candidate>(db, `SELECT ${select.join(",")} FROM ${ident(module?.table ?? area)} r
        ${join.join(" ")} WHERE ${scope.join(" AND ")}
        ORDER BY (lower(r.number)=lower($2) OR r.id::text=$2) DESC NULLS LAST,
          (length(COALESCE(r.name,r.title,''))>=3 AND strpos(lower($8::text),lower(COALESCE(r.name,r.title,'')))>0) DESC,
          ${area === "dispatch" ? "r.starts_at" : "r.updated_at DESC"},r.id LIMIT ${limit + 1}`, [...params, message]);
      const exact = query && found.find(row => row.id === query || String(row.number ?? "").toLowerCase() === query.toLowerCase());
      const named = query ? found.filter(row => explicitlyNamed(row.name ?? row.title, message)) : [];
      const chosen = exact || (named.length === 1 ? named[0] : query && found.length === 1 ? found[0] : null);
      const action = chosen && remember(actor, area, chosen);
      const items = (chosen ? [chosen] : found.slice(0, limit)).map(row => {
        if (!referenceOnly) {
          const href = "/" + area + "/" + row.id;
          links.set(href, { href, area, label: label(row) });
        } else if (customerDirectory && row.party_id) {
          const href = "/customers/" + row.party_id;
          links.set(href, { href, area: "customers", label: scrub(row.party_name) });
        }
        return clean(Object.fromEntries(Object.entries(row).filter(([key]) =>
          area === "team" ? ["id", "name", "no_registered_conflict"].includes(key) : row === chosen || !detailFields.includes(key))));
      });
      const lineRead = !!(details && chosen && permittedFinancial && config.lines &&
        (has(actor, "billing") || has(actor, "sales") || has(actor, "purchasing") || has(actor, "finance")));
      const lines = lineRead
        ? await rows<Record<string, unknown>>(db, `SELECT id,left(description,220) description,quantity,unit,unit_price,tax_rate,
            tax_category,line_type,optional,selected,discount_percent,length(description)>220 clipped FROM ${ident(config.lines!)}
            WHERE parent_id=$1 ORDER BY position LIMIT 7`, [chosen.id]) : [];
      const fullLines = lineRead && lines.length <= 6 && lines.every(line => !line.clipped);
      if (chosen) matched.get(area + ":" + chosen.id)!.fullLines = fullLines;
      return { ...empty, items, possiblyMore: found.length > limit, ambiguous: !!query && !chosen && found.length > 1,
        resolvedId: chosen?.id ?? null, update: action || undefined,
        ...(lines.length ? { lines: lines.slice(0, 6).map(clean), moreLines: !fullLines } : {}),
      };
    },
  };
}

export const suiteAreasFor = (actor: ActorContext) => assistantSuiteAreas.filter(area => suiteAreaAllowed(actor, area));
