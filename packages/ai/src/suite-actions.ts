import { calendarDate, moduleBySlug, type AssistantAction, type AssistantReadToolAccess } from "@schubert/contracts";
import { requireRule } from "@schubert/domain";

type Command = { name: string; targetId?: string | null; baseVersion?: number | null };
type Suite = NonNullable<AssistantReadToolAccess["suite"]>;
const officeClock = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short",
});

export function assistantDispatchTime(value: unknown) {
  requireRule(typeof value === "string", "AI_DISPATCH_TIME", "Für den Einsatz Beginn und Ende mit Datum und Uhrzeit angeben.");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      calendarDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  requireRule(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && calendarDate(value.slice(0, 10)),
    "AI_DISPATCH_TIME", "Für den Einsatz Datum und Uhrzeit angeben.");
  const candidates = [1, 2].map(hours => new Date(Date.parse(value + "Z") - hours * 3600000))
    .filter(date => officeClock.format(date).replace(" ", "T") === value);
  requireRule(candidates.length === 1, "AI_DISPATCH_TIME", "Diese Uhrzeit ist wegen der Zeitumstellung uneindeutig. Bitte eine eindeutige Uhrzeit angeben.");
  return candidates[0].toISOString();
}

export function suiteActionFor(command: Command, actions: AssistantAction[]) {
  const candidates = actions.filter(action => action.name === command.name);
  if (!command.name.endsWith(".update")) return candidates[0];
  const action = command.targetId ? candidates.find(item => item.targetId === command.targetId) :
    candidates.length === 1 ? candidates[0] : undefined;
  requireRule(action?.targetId && (command.baseVersion == null || command.baseVersion === action.baseVersion),
    "AI_RECORD_SCOPE", "Bitte den genauen Vorgang und seinen aktuellen Stand auswählen.", 409);
  return action;
}

const emailRefs: Record<string, string> = { order_id: "orders", customer_id: "customers", supplier_id: "suppliers" };
const createdRef = /^\$created:(\d+)(?:\.(project|variant|revision))?$/;

export function bindSuiteAction(
  action: AssistantAction, payload: Record<string, any>, context: Record<string, any>,
  suite: Suite, earlier: Command[], labels: Record<string, string>,
) {
  const input = { ...action.defaults, ...payload };
  const fields = [...action.fields];
  if (action.name === "communication.email.create")
    fields.push(...Object.entries(emailRefs).map(([key, reference]) => ({ key, reference })));
  const order: Record<string, unknown> | undefined = typeof input.order_id === "string" ? suite.reference("orders", input.order_id) ??
    (input.order_id === context.currentReferences?.orders ? { customer_id: context.currentReferences?.customers } : undefined) : undefined;
  // An explicitly selected off-page order or customer overrides the ambient page defaults.
  if (payload.order_id && payload.order_id !== action.defaults?.order_id) {
    if (!Object.hasOwn(payload, "customer_id")) delete input.customer_id;
    if (!Object.hasOwn(payload, "currency") && typeof order?.currency === "string") input.currency = order.currency;
  }
  if (payload.customer_id && payload.customer_id !== action.defaults?.customer_id && !Object.hasOwn(payload, "order_id"))
    delete input.order_id;
  if (order?.customer_id && fields.some(field => field.key === "customer_id")) {
    requireRule(!input.customer_id || input.customer_id === order.customer_id, "AI_PARTY_SCOPE", "Der ausgewählte Auftrag gehört zu einem anderen Kunden.");
    input.customer_id = order.customer_id;
  }
  const proof = (area: string, value: unknown): boolean => {
    if (typeof value !== "string") return false;
    const created = createdRef.exec(value);
    if (created) {
      const source = earlier[Number(created[1])];
      return !!source && (source.name === "planning.project.create" ?
        area === "studio" && (!created[2] || created[2] === "project") :
        !created[2] && context.actionCatalog?.some((a: AssistantAction) => a.name === source.name && a.module === area && a.name.endsWith(".create")));
    }
    const row = suite.reference(area, value) ??
      (area === "parties" ? suite.reference("customers", value) ?? suite.reference("suppliers", value) : undefined);
    if (row) {
      const name = [row.number, row.name ?? row.title].filter(Boolean).join(" · ");
      if (name) labels[value] = name;
      return true;
    }
    return context.currentReferences?.[area] === value ||
      (area === "documents" && context.sources?.some((source: any) => source.documentId === value));
  };
  const module = moduleBySlug(action.module);
  for (const field of fields) {
    if (field.reference && input[field.key] != null)
      requireRule(proof(field.reference, input[field.key]), "AI_REFERENCE_SCOPE",
        "Bitte die eindeutige Bezeichnung oder Nummer für „" + (module?.fields.find(item => item.key === field.key)?.label ??
          moduleBySlug(field.reference)?.singular ?? "Verknüpfung") +
          "“ nennen, damit der Bezug geprüft werden kann.");
  }
  if (action.lines && input.lines !== undefined) {
    requireRule(Array.isArray(input.lines), "AI_LINE_FORMAT", "Die Belegpositionen konnten nicht gelesen werden.");
    if (action.targetId) {
      const offPage = suite.reference(action.module, action.targetId);
      const onPage = context.record?.id === action.targetId && context.entityType === action.module && context.allLinesIncluded;
      requireRule(offPage?.fullLines === true || onPage, "AI_LINE_SCOPE",
        "Für diese Positionsänderung zuerst die vollständige Liste im Beleg öffnen.");
    }
    for (const line of input.lines) {
      requireRule(line && typeof line === "object" && !Array.isArray(line), "AI_LINE_FORMAT", "Die Belegpositionen konnten nicht gelesen werden.");
      if (!action.targetId) delete line.id;
      delete line.cost_unit;
      delete line.clipped;
      for (const [key, area] of [["product_id", "products"], ["price_version_id", "sales-prices"]])
        if (line[key] != null)
          requireRule(proof(area, line[key]) || context.lines?.some((current: any) => current[key] === line[key]),
            "AI_LINE_SCOPE", "Den Produkt- oder Preisbezug im Beleg prüfen.");
    }
  }
  if (action.name === "communication.email.create" && input.attachment_version_ids !== undefined)
    requireRule(Array.isArray(input.attachment_version_ids) && input.attachment_version_ids.every((id: unknown) =>
      context.sources?.some((source: any) => source.explicit && source.documentVersionId === id)),
      "AI_ATTACHMENT_SCOPE", "Anlagen für die E-Mail zuerst im Chat auswählen.");
  if (action.name === "workforce.dispatch.create" || action.name === "workforce.dispatch.update") {
    for (const key of ["starts_at", "ends_at"]) if (input[key] != null) input[key] = assistantDispatchTime(input[key]);
  }
  return input;
}
