import { modules, type ModuleDefinition } from "./modules.js";

/** Reversible business work. Binding releases continue through their dedicated UI. */
export const assistantRecordModules = [
  "customers",
  "suppliers",
  "contacts",
  "addresses",
  "sites",
  "graves",
  "inquiries",
  "quotes",
  "orders",
  "work-packages",
  "change-orders",
  "deliveries",
  "acceptances",
  "defects",
  "invoices",
  "purchase-orders",
  "products",
  "tasks",
] as const;
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
  current?: { module?: string; id?: string; version?: number; status?: string },
  role?: string,
) {
  const result: any[] = [];
  for (const module of modules) {
    if (
      !assistantRecordModules.includes(
        module.slug as (typeof assistantRecordModules)[number],
      ) ||
      !permissions.includes(module.permission) ||
      (module.permission === "orders" &&
        ["Employee", "Workshop", "Dispatcher"].includes(role ?? ""))
    )
      continue;
    const fields = module.fields.map((field) => ({
      key: field.key,
      type: field.type,
      required: !!field.required,
      ...(field.options
        ? { options: field.options.map((option) => option.value) }
        : {}),
      ...(field.reference ? { reference: field.reference } : {}),
    }));
    result.push({
      name: module.commandPrefix + ".create",
      label: module.singular + " als Entwurf anlegen",
      module: module.slug,
      fields,
    });
    if (
      current?.module === module.slug &&
      current.id &&
      ![
        "issued",
        "published",
        "accepted",
        "confirmed",
        "approved",
        "archived",
      ].includes(current.status ?? "")
    )
      result.push({
        name: module.commandPrefix + ".update",
        label: module.singular + " bearbeiten",
        module: module.slug,
        targetId: current.id,
        baseVersion: current.version,
        fields,
      });
  }
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
