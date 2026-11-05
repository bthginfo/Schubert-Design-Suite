import { modules, type ModuleDefinition } from "./modules.js";

/** Reversible business work. Binding releases continue through their dedicated UI. */
export const assistantRecordModules = [
  "customers",
  "suppliers",
  "contacts",
  "addresses",
  "sites",
  "graves",
  "cemeteries",
  "inquiries",
  "quotes",
  "orders",
  "work-packages",
  "change-orders",
  "deliveries",
  "acceptances",
  "defects",
  "invoices",
  "supplier-invoices",
  "purchase-orders",
  "products",
  "tasks",
  "dispatch",
  "resources",
  "stock-locations",
] as const;

type ActionField = { key: string; type?: string; required?: boolean; options?: string[]; reference?: string };
export type AssistantAction = {
  name: string;
  label: string;
  module: string;
  fields: ActionField[];
  targetId?: string;
  baseVersion?: number;
  targetLabel?: string;
  defaults?: Record<string, unknown>;
  lines?: boolean;
};

const immutable = new Set(["issued", "published", "accepted", "confirmed", "approved", "archived", "cancelled", "completed", "sent"]);
const lineModules = new Set(["quotes", "orders", "change-orders", "invoices", "purchase-orders", "supplier-invoices"]);
function editableModule(module: ModuleDefinition, permissions: readonly string[], role?: string) {
  return assistantRecordModules.includes(module.slug as (typeof assistantRecordModules)[number]) &&
    !module.readOnly && permissions.includes(module.permission) &&
    !(module.table === "orders" && ["Employee", "Workshop", "Dispatcher"].includes(role ?? ""));
}
function fieldsFor(module: ModuleDefinition): ActionField[] {
  return module.fields.filter(field => !field.internal).map(field => ({
    key: field.key,
    type: field.type,
    required: !!field.required,
    ...(field.options ? { options: field.options.map(option => option.value) } : {}),
    ...(field.reference ? { reference: field.reference } : {}),
  }));
}

export function assistantUpdateAction(
  permissions: readonly string[], role: string | undefined,
  target: { module?: string; id?: string; version?: number; status?: string; label?: string },
): AssistantAction | undefined {
  const module = modules.find(candidate => candidate.slug === target.module);
  if (!module || !editableModule(module, permissions, role) || !target.id || target.version === undefined ||
      immutable.has(target.status ?? "") || (module.slug === "dispatch" && target.status !== "draft") ||
      (module.slug === "supplier-invoices" && !["received", "needs_review"].includes(target.status ?? ""))) return;
  return {
    name: module.commandPrefix + ".update", label: module.singular + " bearbeiten", module: module.slug,
    targetId: target.id, baseVersion: target.version, targetLabel: target.label,
    fields: fieldsFor(module), lines: lineModules.has(module.slug),
  };
}
export function assistantRecordModule(
  command: string,
): ModuleDefinition | undefined {
  return modules.find(
    (module) =>
      assistantRecordModules.includes(
        module.slug as (typeof assistantRecordModules)[number],
      ) &&
      (command === module.commandPrefix + ".create" ||
        command === module.commandPrefix + ".update"),
  );
}
export function assistantCommandAllowed(command: string) {
  return (
    !!assistantRecordModule(command) ||
    [
      "planning.design.change",
      "planning.project.create",
      "communication.email.create",
    ].includes(command)
  );
}
export function assistantActionCatalog(
  permissions: string[],
  current?: Parameters<typeof assistantUpdateAction>[2],
  role?: string,
) {
  const result: AssistantAction[] = [];
  for (const module of modules) {
    if (!editableModule(module, permissions, role)) continue;
    result.push({
      name: module.commandPrefix + ".create",
      label: module.singular + " als Entwurf anlegen",
      module: module.slug,
      fields: fieldsFor(module),
      lines: lineModules.has(module.slug),
    });
  }
  const update = current && assistantUpdateAction(permissions, role, current);
  if (update) result.push(update);
  if (permissions.includes("planning"))
    result.push({
      name: "planning.project.create",
      label: "Planung aus Skizze oder Angaben anlegen",
      module: "studio",
      fields: [
        {
          key: "kind",
          type: "select",
          required: true,
          options: ["memorial", "room_plan"],
        },
        { key: "name", type: "text", required: true },
        { key: "customer_id", type: "reference", reference: "customers" },
        { key: "order_id", type: "reference", reference: "orders" },
        { key: "site_id", type: "reference", reference: "sites" },
        { key: "grave_plot_id", type: "reference", reference: "graves" },
      ],
    });
  if (permissions.some((p) => p === "sales" || p === "billing"))
    result.push({
      name: "communication.email.create",
      label: "E-Mail als Entwurf vorbereiten",
      module: "emails",
      fields: [
        { key: "recipient", required: true },
        { key: "subject", required: true },
        { key: "body", required: true },
      ],
    });
  return result;
}
