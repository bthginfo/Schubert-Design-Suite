<script lang="ts">
 import StockReservations from './StockReservations.svelte';
 import TaskContext from './TaskContext.svelte';
 import JobDiagnosis from './JobDiagnosis.svelte';
 import WorkReport from './WorkReport.svelte';
  import { refreshAll, goto } from "$app/navigation";
  import { createHref } from "#lib/client/create-context.ts";
  import type { AppData, Action, Row, Field } from "#lib/client/types.ts";
  import { currencyAmount } from "#lib/client/finance.ts";
  import {
    command,
    display,
    label,
    recordName,
    permitted,
  } from "#lib/client/api.ts";
  import DriveImportPanel from "./DriveImportPanel.svelte";
  import CutoverPanel from "./CutoverPanel.svelte";
  import Icon from "./Icon.svelte";
  import Status from "./Status.svelte";
  import RecordEditor from "./RecordEditor.svelte";
  import ActionDialog from "./ActionDialog.svelte";
  import DeliverySummary from "./DeliverySummary.svelte";
  import ReceiptDeclaration from "./ReceiptDeclaration.svelte";
  import UploadPanel from "./UploadPanel.svelte";
  import Communication from "./Communication.svelte";
  import PortalManagement from "./PortalManagement.svelte";
  import InventoryCounter from "./InventoryCounter.svelte";
  import ImportReview from "./ImportReview.svelte";
  import FontReference from "./FontReference.svelte";
  import FinancialDetails from "./FinancialDetails.svelte";
  let { data }: { data: AppData } = $props();
  let tab = $state("overview");
  let editor = $state(false);
  let activeAction: Action | null = $state(null);
  let actionBusy = $state(false);
  let actionError = $state("");
  let actionNotice = $state("");
  function actionBlocked(action: Action) {
    return (
      action.name === "inventory.count.close" &&
      (Number(data.summary?.inventoryCountIncomplete ?? 0) > 0 ||
        (data.related?.inventory_count_lines || []).some(
          (line) => line.counted_quantity === null || line.status !== "counted",
        ))
    );
  }
  async function perform(action: Action) {
    if (actionBlocked(action)) {
      actionError =
        "Zählpositionen vollständig erfassen und abweichende Belege zuerst klären.";
      return;
    }
    if (action.confirmation || action.requiresReason || action.fields?.length) {
      activeAction = action;
      return;
    }
    if (actionBusy) return;
    actionBusy = true;
    actionError = "";
    actionNotice = "";
    try {
      await command(action.name, data.detail?.id, {}, data.detail?.version);
      actionNotice = "Der Arbeitsschritt wurde bestätigt.";
      await refreshAll().catch(() => {});
    } catch (e) {
      actionError =
        e instanceof Error
          ? e.message
          : "Der Arbeitsschritt konnte nicht ausgeführt werden.";
    } finally {
      actionBusy = false;
    }
  }
  async function actionSaved(results: Row[]) {
    const name = activeAction?.name || "",
      result = results[0]?.record || results[0],
      id = result?.id;
    actionNotice = "Der Arbeitsschritt wurde bestätigt.";
    if (
      id &&
      id !== data.detail?.id &&
      (name.endsWith(".revise") || name === "billing.invoice.correct")
    )
      await goto(`/${data.module!.slug}/${id}`);
  }
  const module = $derived(data.module!);
  const record = $derived(data.detail || {});
  const isOrder = $derived(module.slug === "orders");
  let shownRecordId = $state("");
  $effect(() => {
    if (record.id !== shownRecordId) {
      shownRecordId = record.id;
      tab = "overview";
      editor = false;
      activeAction = null;
      actionError = "";
      actionNotice = "";
    }
  });
  function areaAllowed(slug: string) {
    return (data.navigation || []).some(
      (item: { slug: string }) => item.slug === slug,
    );
  }
  const downstreamContext = $derived({
    customer_id: module.slug === "customers" ? record.id : record.customer_id,
    order_id: isOrder ? record.id : record.order_id,
    supplier_id: module.slug === "suppliers" ? record.id : record.supplier_id,
    purchase_order_id:
      module.slug === "purchase-orders" ? record.id : undefined,
    inquiry_id: module.slug === "inquiries" ? record.id : undefined,
  });
  const orderAreas = $derived(
    [
      {
        id: "planning",
        name: "Planung",
        slug: "studio",
        icon: "pen",
        label: "Planungen zu diesem Auftrag öffnen",
        description:
          "Bearbeitbare Entwürfe und Planstände dieses Auftrags im Planungsstudio aufrufen.",
        permission: "planning",
        create: "",
      },
      {
        id: "services",
        name: "Leistungen",
        slug: "work-packages",
        icon: "briefcase",
        label: "Arbeitspakete zu diesem Auftrag öffnen",
        description:
          "Aufmaß, Werkstatt und Montage in der gefilterten Übersicht koordinieren.",
        permission: "orders",
        create: "Arbeitspaket anlegen",
      },
      {
        id: "dispatch",
        name: "Termine & Team",
        slug: "dispatch",
        icon: "calendar",
        label: "Einsätze zu diesem Auftrag öffnen",
        description:
          "Im Einsatzplan Termine und Mitarbeiter für diesen Auftrag abstimmen.",
        permission: "dispatch",
        create: "Einsatz anlegen",
      },
      {
        id: "purchasing",
        name: "Einkauf & Material",
        slug: "purchase-orders",
        icon: "box",
        label: "Bestellungen zu diesem Auftrag öffnen",
        description:
          "Die Bestellungen dieses Auftrags prüfen oder eine neue Bestellung vorbereiten.",
        permission: "purchasing",
        create: "Bestellung anlegen",
      },
      {
        id: "billing",
        name: "Abrechnung",
        slug: "invoices",
        icon: "file",
        label: "Rechnungen zu diesem Auftrag öffnen",
        description:
          "Rechnungsstände in der gefilterten Übersicht prüfen. Neue Belege bleiben bis zur ausdrücklichen Ausstellung Entwürfe.",
        permission: "billing",
        create: "Rechnungsentwurf anlegen",
      },
    ].filter((area) =>
      area.slug === "studio"
        ? permitted(data, "planning") || permitted(data, "planning.read")
        : areaAllowed(area.slug),
    ),
  );
  const selectedOrderArea = $derived(
    isOrder ? orderAreas.find((area) => area.id === tab) : undefined,
  );
  function orderAreaHref(slug: string) {
    return slug === "studio"
      ? `/studio?order=${record.id}`
      : `/${slug}?order_id=${record.id}`;
  }
  const contextActions = $derived(
    (module.slug === "customers"
      ? [
          { slug: "inquiries", label: "Anfrage anlegen", permission: "crm" },
          { slug: "quotes", label: "Angebot anlegen", permission: "sales" },
          { slug: "orders", label: "Auftrag anlegen", permission: "orders" },
        ]
      : module.slug === "suppliers"
        ? [
            {
              slug: "purchase-orders",
              label: "Bestellung anlegen",
              permission: "purchasing",
            },
            {
              slug: "supplier-invoices",
              label: "Eingangsrechnung erfassen",
              permission: "finance",
            },
          ]
        : module.slug === "purchase-orders"
          ? [
              {
                slug: "supplier-invoices",
                label: "Eingangsrechnung zuordnen",
                permission: "finance",
              },
            ]
          : module.slug === "inquiries" && record.customer_id
            ? [
                {
                  slug: "quotes",
                  label: "Angebot aus Anfrage anlegen",
                  permission: "sales",
                },
              ]
            : []
    ).filter(
      (action) =>
        areaAllowed(action.slug) && permitted(data, action.permission),
    ),
  );
  const tabs = $derived(
    isOrder
      ? [
          { id: "overview", name: "Übersicht" },
          ...orderAreas.map((area) => ({ id: area.id, name: area.name })),
          { id: "documents", name: "Dokumente" },
          { id: "communication", name: "Kommunikation" },
          { id: "timeline", name: "Verlauf" },
        ]
      : [
          { id: "overview", name: "Übersicht" },
          { id: "linked", name: "Verknüpfte Vorgänge" },
          ...(["customers", "suppliers"].includes(module.slug)
            ? [{ id: "communication", name: "Kommunikation" }]
            : []),
          { id: "documents", name: "Dokumente" },
          { id: "timeline", name: "Verlauf" },
        ],
  );
  const protectedStand = $derived(
    (module.slug === "inventory" && record.status === "completed") ||
      (module.slug === "cutovers" && record.status !== "draft") ||
      (["bank-imports", "datev"].includes(module.slug) &&
        record.status !== "draft") ||
      [record.legal_status, record.status].some((status) =>
        [
          "issued",
          "accepted",
          "archived",
          "published",
          "exported",
          "approved",
          "confirmed",
          "under_review",
        ].includes(status),
      ),
  );
  const editable = $derived(
    permitted(data, module.permission || `${module.commandPrefix}.update`) &&
      !module.readOnly &&
      !module.readonly &&
      !protectedStand,
  );
  const statusKeys = $derived(
    [
      "status",
      "legal_status",
      "artifact_status",
      "delivery_status",
      "payment_status",
      "planning_status",
      "procurement_status",
      "execution_status",
      "acceptance_status",
      "financial_status",
    ].filter((k) => record[k]),
  );
  const visibleFields = $derived(
    (module.fields || []).filter((f) => !f.key.includes("status")).toSorted((a,b)=>{
      const priority=['completion_criteria','notes','description','due_date','order_id','name','title','kind','assigned_to'];
      return ['Employee','Workshop'].includes(data.context?.role??'')?(priority.includes(a.key)?priority.indexOf(a.key):99)-(priority.includes(b.key)?priority.indexOf(b.key):99):0;
    }),
  );
  const actionList = $derived(
    module.actions.filter(
      (a) =>
        (a.permission
          ? permitted(data, a.permission)
          : permitted(data, module.permission || "")) &&
        !["catalog.price_import.approve", "migration.import.commit"].includes(
          a.name,
        ) &&
        (!a.statuses?.length ||
          a.statuses.includes(record.status || record.legal_status)),
    ),
  );
  const related = $derived(
    Object.entries(data.related || {}).filter(
      ([key]) =>
        ![
          "mail_attachments",
          "count_observations",
          "documents",
          "threads",
          "messages",
          "outgoing_messages",
          "timeline",
          "audit_events",
          "lines",
          "price_import_rows",
          "staging_records",
          "import_rows",
          "rows",
          "inventory_count_lines",
          "count_lines",
          "portal_accesses",
          "bank_transactions",
          "candidates",
          "datev_export_items",
          "dunning_events",
          "open_items",
          "archive_entries",
          "cutover_batches",
        ].includes(key),
    ),
  );
  const documentsLoaded = $derived(Array.isArray(data.related?.documents));
  const documents = $derived(data.related?.documents || []);
  const events = $derived(
    data.related?.timeline || data.related?.audit_events || [],
  );
  const lineRows = $derived(
    module.slug === "inventory"
      ? []
      : record.lines || data.related?.lines || [],
  );
  const relationRoutes: Record<string, string> = {
    quotes: "quotes",
    orders: "orders",
    inquiries: "inquiries",
    work_packages: "work-packages",
    change_orders: "change-orders",
    delivery_notes: "deliveries",
    deliveries: "deliveries",
    acceptance_reports: "acceptances",
    defects: "defects",
    invoices: "invoices",
    payments: "payments",
    purchase_orders: "purchase-orders",
    supplier_invoices: "supplier-invoices",
    stock_items: "stock",
    stock_reservations: "stock",
    sites: "sites",
    grave_plots: "graves",
    graves: "graves",
    documents: "documents",
    tasks: "tasks",
    dispatch_assignments: "dispatch",
    employees: "team",
    notifications: "notifications",
    planning_projects: "studio",
    design_variants: "studio",
  };
  function relationUrl(key: string, item: Row) {
    if (key === "stock_reservations")
      return item.stock_item_id ? "/stock/" + item.stock_item_id : undefined;
    if (key === "design_variants")
      return item.planning_project_id
        ? `/studio/${item.planning_project_id}?variant=${item.id}`
        : undefined;
    if (key === "planning_projects") return "/studio/" + item.id;
    const route = relationRoutes[key];
    return route && item.id ? "/" + route + "/" + item.id : undefined;
  }
  function fieldHref(field: Field) {
    const target = field.reference;
    if (field.type !== "reference" || !record[field.key] || !target)
      return null;
    return (data.navigation || []).some(
      (item: { slug: string }) => item.slug === target,
    )
      ? `/${target}/${encodeURIComponent(record[field.key])}`
      : null;
  }
  function relationColumns(items: Row[]) {
    const preferred = [
      "number",
      "title",
      "name",
      "description",
      "status",
      "legal_status",
      "amount",
      "quantity",
      "activity",
      "starts_at",
      "ends_at",
      "created_at",
    ];
    const hidden = [
      "id",
      "tenant_id",
      "legal_entity_id",
      "created_by",
      "updated_by",
      "payload",
      "snapshot",
      "metadata",
      "version",
      "thread_id",
    ];
    return Object.keys(items[0] || {})
      .filter(
        (key) =>
          !hidden.includes(key) &&
          !key.endsWith("_hash") &&
          typeof items[0][key] !== "object",
      )
      .sort(
        (a, b) =>
          (preferred.includes(a) ? preferred.indexOf(a) : 99) -
          (preferred.includes(b) ? preferred.indexOf(b) : 99),
      )
      .slice(0, 6);
  }
  function relationVisible(key: string) {
    if (tab === "linked" || tab === "overview") return true;
    if (tab === "planning")
      return /planning|design|surveys|measurements/.test(key);
    if (tab === "services")
      return /work_packages|lines|change_orders/.test(key);
    if (tab === "dispatch")
      return /dispatch|team|assignment|resource/.test(key);
    if (tab === "purchasing")
      return /purchase|supplier|stock|material|goods/.test(key);
    if (tab === "billing")
      return /invoice|payment|receivable|payable/.test(key);
    if (tab === "communication")
      return /message|thread|publication|portal/.test(key);
    return false;
  }
  const relationNames: Record<string, string> = {
    portal_accesses: "Kundenzugänge",
    threads: "Gespräche",
    outgoing_messages: "E-Mail-Ausgang",
    goods_receipts: "Wareneingänge",
    receivables: "Forderungen",
    payables: "Verbindlichkeiten",
    work_packages: "Arbeitspakete",
    inquiries:"Anfragen",quotes:"Angebote",orders:"Aufträge",work_reports:"Arbeitsrückmeldungen",
    change_orders: "Nachträge",
    delivery_notes: "Lieferungen",
    acceptance_reports: "Abnahmen",
    purchase_orders: "Bestellungen",
    supplier_invoices: "Eingangsrechnungen",
    stock_items: "Lagerbestand",
    stock_reservations: "Reservierungen",
    dispatch_assignments: "Einsätze",
    planning_projects: "Planungsprojekte",
    design_variants: "Planungsvarianten",
    grave_plots: "Grabstätten",
    audit_events: "Änderungsnachweise",
    messages: "Nachrichten",
    time_segments: "Zeitintervalle",
    time_allocations: "Zeitzuordnungen",
    rows: "Importzeilen",
    price_import_rows: "Preisvergleich",
    staging_records: "Prüfdatensätze",
    portal_publications: "Portalveröffentlichungen",
  };
</script>

<a class="text-link mb" href={`/${module.slug}`}
  ><Icon name="back" size={16} />{module.label}</a
>
<div class="page-heading">
  <div>
    <h1>{recordName(record,data)}</h1>
    <p>
      {module.singular}{record.number ? ` · ${record.number}` : ""} · {record.description ||
        module.description}
    </p>
  </div>
  <div class="page-heading-actions">
    {#if editable}<button class="btn" onclick={() => (editor = true)}
        ><Icon name="edit" size={15} />Bearbeiten</button
      >{/if}{#if actionList.length}<button
        class="btn primary"
        disabled={actionBusy || actionBlocked(actionList[0])}
        title={actionBlocked(actionList[0])
          ? "Zählpositionen vollständig erfassen und Konflikte zuerst klären."
          : undefined}
        onclick={() => perform(actionList[0])}
        >{actionList[0].label}<Icon name="arrow" size={16} /></button
      >{/if}
  </div>
</div>
{#if data.summary?.warnings?.length}{#each data.summary.warnings as warning}<div
      class="notice warning"
    >
      <Icon name="alert" />
      <div>{typeof warning === "string" ? warning : warning.message}</div>
    </div>{/each}{/if}
{#if protectedStand}<div class="notice info">
    <Icon name="lock" />
    <div>
      Dieser Stand ist geschützt. Änderungen erfolgen über eine neue Version
      oder den vorgesehenen Korrekturvorgang.
    </div>
  </div>{/if}
{#if actionError}<div class="notice error" role="alert">
    {actionError}
  </div>{/if}{#if actionNotice}<div class="notice info" role="status">
    {actionNotice}
  </div>{/if}
<nav class="tabs" aria-label="Bereiche der Akte">
  {#each tabs as item}<button
      class="tab"
      class:active={tab === item.id}
      onclick={() => (tab = item.id)}
      aria-current={tab === item.id ? "page" : undefined}
      >{item.name}{#if item.id === "documents" && documents.length}<span
          class="count">{documents.length}</span
        >{/if}</button
    >{/each}
</nav>
{#if tab === "overview" && isOrder && orderAreas.length}<nav
    class="record-context-actions inline-actions mb"
    aria-label="Mit diesem Auftrag weiterarbeiten"
  >
    {#each orderAreas as area}<a
        class="btn small"
        href={orderAreaHref(area.slug)}
        ><Icon name={area.icon} size={15} />{area.name}<Icon
          name="arrow"
          size={13}
        /></a
      >{/each}
  </nav>{:else if tab === "overview" && contextActions.length}<nav
    class="record-context-actions inline-actions mb"
    aria-label="Mit diesem Vorgang weiterarbeiten"
  >
    {#each contextActions as action}<a
        class="btn small"
        href={createHref(action.slug, downstreamContext)}
        ><Icon name="plus" size={15} />{action.label}</a
      >{/each}
  </nav>{/if}
{#if tab==='linked'&&['customers','suppliers'].includes(module.slug)&&(!areaAllowed('orders')||!areaAllowed('quotes'))}<div class="notice info"><div>Hier erscheinen nur Vorgänge Ihrer freigegebenen Fachbereiche. Für weitere Angebots- oder Auftragsakten benötigen Sie entsprechende Leserechte.{#if permitted(data,'reports')||permitted(data,'reports.read')} <a class="text-link" href="/reports">Berechtigte Finanznachweise in der Auswertung prüfen</a>{/if}</div></div>{/if}
<div class="detail-grid">
  <div class="main-column stack">
    {#if selectedOrderArea}<section class="panel">
        <header class="panel-header">
          <div>
            <h2>{selectedOrderArea.name} für diesen Auftrag</h2>
            <p>{selectedOrderArea.description}</p>
          </div>
        </header>
        <div class="panel-body">
          <div class="inline-actions">
            {#if selectedOrderArea.create && permitted(data, selectedOrderArea.permission)}<a
                class="btn primary"
                href={createHref(selectedOrderArea.slug, downstreamContext)}
                ><Icon name="plus" size={16} />{selectedOrderArea.create}</a
              >{/if}<a class="btn" href={orderAreaHref(selectedOrderArea.slug)}
              >{selectedOrderArea.label}<Icon name="arrow" size={16} /></a
            >
          </div>
          <p class="field-help mt">
            Die Übersicht ist auf {record.number || recordName(record,data)} gefiltert.
            Dort sehen Sie die tatsächlich gespeicherten Vorgänge.
          </p>
        </div>
      </section>{/if}
    {#if tab==='overview'&&module.slug==='tasks'}<TaskContext {record} {data}/>{/if}
    {#if tab==='overview'&&module.slug==='jobs'}<JobDiagnosis {record}/>{/if}

    {#if tab === "overview"}<FinancialDetails {data} />{/if}
    {#if tab === "overview" && module.slug === "fonts"}<FontReference
        {data}
      />{/if}
    {#if tab === "overview" && ["price-imports", "imports"].includes(module.slug)}<ImportReview
        {data}
      />{/if}
    {#if tab === "overview" && module.slug === "imports"}<DriveImportPanel
        {data}
      />{/if}
    {#if tab === "overview" && module.slug === "cutovers"}<CutoverPanel
        {data}
      />{/if}
    {#if tab === "overview" && module.slug === "inventory"}<InventoryCounter
        {data}
      />{/if}
    {#if tab === "overview" && visibleFields.length}<section class="panel">
        <header class="panel-header">
          <h2>Angaben im Überblick</h2>
          {#if record.version}<span class="small muted"
              >Version {record.version}</span
            >{/if}
        </header>
        <div class="panel-body">
          <dl class="definition-list">
            {#each visibleFields as field}<div
                class:full={field.type === "textarea"}
              >
                <dt>{field.label}{field.internal ? " · intern" : ""}</dt>
                <dd>
                  {#if fieldHref(field)}<a
                      class="text-link"
                      href={fieldHref(field)!}
                      >{display(record[field.key], field.key, data)}<Icon
                        name="arrow"
                        size={13}
                      /></a
                    >{:else}{field.type === "money"
                      ? currencyAmount(
                          record[field.key],
                          record.currency || "EUR",
                        )
                      : display(
                          record[field.key],
                          field.type === "date" ? "date" : field.key,
                          data,
                        )}{/if}
                </dd>
              </div>{/each}
          </dl>
          <div class="record-meta">
            <span>Erstellt {display(record.created_at, "created_at")}</span
            ><span
              >Zuletzt geändert {display(record.updated_at, "updated_at")}</span
            >
          </div>
        </div>
      </section>{/if}
    {#if tab==='overview'&&module.slug==='work-packages'&&data.context?.employeeId}<details class="panel"><summary class="panel-header">Arbeitsrückmeldung erfassen</summary><WorkReport {data} initialOrderId={record.order_id} initialWorkPackageId={record.id}/></details>{/if}
    {#if tab === "overview" && module.slug === "deliveries"}<DeliverySummary
        rows={lineRows}
      /><ReceiptDeclaration
        {record}
      />{:else if tab === "overview" && module.slug === "acceptances"}<ReceiptDeclaration
        {record}
        acceptance
      />{/if}
    {#if module.slug !== "deliveries" && ["overview", "services", "billing"].includes(tab) && lineRows.length}<section
        class="panel"
      >
        <header class="panel-header">
          <h2>Leistungsumfang</h2>
          <span class="count">{lineRows.length} Positionen</span>
        </header>
        <div class="table-scroll">
          <table class="data-table">
            <thead
              ><tr
                ><th>Leistung</th><th class="number">Menge</th><th>Einheit</th
                ><th class="number">Einzelpreis netto</th><th class="number"
                  >Steuer</th
                ><th class="number">Nettobetrag</th></tr
              ></thead
            ><tbody
              >{#each lineRows as line}{#if ["heading", "text"].includes(line.line_type)}<tr
                    ><td colspan="6"
                      >{#if line.line_type === "heading"}<strong
                          >{line.description}</strong
                        >{:else}<span style="white-space:pre-wrap"
                          >{line.description}</span
                        >{/if}</td
                    ></tr
                  >{:else if line.line_type === "subtotal"}<tr
                    ><th colspan="5" scope="row"
                      >{line.description || "Zwischensumme"}</th
                    ><td class="number"
                      ><strong
                        >{currencyAmount(
                          line.net_amount,
                          record.currency || data.settings?.currency || "EUR",
                        )}</strong
                      ></td
                    ></tr
                  >{:else}<tr
                    ><td
                      ><strong>{line.description}</strong
                      >{#if line.optional}<div class="record-subtitle">
                          Optional · {line.selected
                            ? "im Umfang enthalten"
                            : "nicht ausgewählt"}
                        </div>{/if}{#if line.price_version_id}<div
                          class="record-subtitle"
                        >
                          Konkreter freigegebener Preisstand gebunden
                        </div>{/if}{#if line.cost_review_required}<div
                          class="field-help"
                        >
                          Interne Kalkulationsgrundlage nach geänderter Position
                          neu prüfen.
                        </div>{/if}</td
                    ><td class="number">{display(line.quantity, "quantity")}</td
                    ><td>{display(line.unit)}</td><td class="number"
                      >{currencyAmount(
                        line.unit_price,
                        record.currency || data.settings?.currency || "EUR",
                      )}</td
                    ><td class="number"
                      >{line.tax_rate !== null &&
                      line.tax_rate !== undefined &&
                      line.tax_rate !== ""
                        ? Number(line.tax_rate).toLocaleString("de-DE", {
                            maximumFractionDigits: 4,
                          }) + " %"
                        : "—"}</td
                    ><td class="number"
                      >{currencyAmount(
                        line.net_amount ?? line.total_net,
                        record.currency || data.settings?.currency || "EUR",
                      )}</td
                    ></tr
                  >{/if}{/each}</tbody
            >
          </table>
        </div>
        {#if ["net_total", "gross_total", "total_net", "total_gross"].some((key) => record[key] !== null && record[key] !== undefined)}<footer
            class="panel-footer"
          >
            <span class="small muted"
              >Verbindliche Berechnung des gespeicherten Stands</span
            >
            <div>
              <span class="small muted"
                >Netto {currencyAmount(
                  record.net_total ?? record.total_net,
                  record.currency || data.settings?.currency || "EUR",
                )} ·
              </span><strong
                >{currencyAmount(
                  record.gross_total ?? record.total_gross,
                  record.currency || data.settings?.currency || "EUR",
                )} brutto</strong
              >
            </div>
          </footer>{/if}
      </section>{/if}
    {#if tab === "documents"}{#if permitted(data, "documents.upload")}<UploadPanel
          {data}
          entityType={module.slug}
          entityId={record.id}
        />{/if}
      <section class="panel">
        <header class="panel-header">
          <h2>Verknüpfte Dokumente</h2>
          {#if documentsLoaded}<span class="count">{documents.length}</span
            >{/if}
        </header>
        <div class="panel-body">
          {#each documents as document}<div class="file-row">
              <Icon name="file" />
              <div class="file-info">
                <h3>{recordName(document)}</h3>
                <p>
                  {display(
                    document.created_at,
                    "created_at",
                  )}{document.revision_id ? " · Revisionsgebunden" : ""}
                </p>
                <Status value={document.scan_status || document.status} />
              </div>
              {#if ["clean", "released", "available", "archived"].includes(document.scan_status || document.status)}<a
                  class="btn small"
                  data-sveltekit-reload
                  download
                  href={`/api/v1/documents/${document.id}/download`}
                  ><Icon name="download" size={16} />Download</a
                >{:else}{#if permitted(data, "documents")}<a
                    class="text-link"
                    href={`/documents/${document.id}`}
                    >Prüfstatus<Icon name="chevron" size={15} /></a
                  >{:else}<span class="field-help">Prüfung läuft</span
                  >{/if}{/if}
            </div>{/each}{#if !documents.length}<div
              class="empty-state compact"
            >
              <div class="empty-icon"><Icon name="file" /></div>
              <h3>
                {documentsLoaded
                  ? "Noch keine Dokumente verknüpft"
                  : "Dokumentübersicht hier nicht geladen"}
              </h3>
              <p>
                {documentsLoaded
                  ? "Fügen Sie Originale, Fotos oder Nachweise über den Upload hinzu."
                  : "Durchsuchen Sie den Dokumentbereich oder fügen Sie einen Nachweis zu diesem Vorgang hinzu."}
              </p>
              {#if !documentsLoaded && areaAllowed("documents")}<a
                  class="btn"
                  href="/documents"
                  >Dokumente durchsuchen<Icon name="arrow" size={15} /></a
                >{/if}
            </div>{/if}
        </div>
      </section>{:else if tab === "timeline"}<section class="panel">
        <header class="panel-header"><h2>Nachvollziehbarer Verlauf</h2></header>
        <div class="panel-body">
          {#each events as event}<article class="timeline-item">
              <h3>
                {event.label ||
                  event.action ||
                  event.event_type ||
                  event.command_name ||
                  event.type}
              </h3>
              <p>
                {display(event.occurred_at || event.created_at, "occurred_at")} ·
                {event.actor_name || "Berechtigter Akteur"}
              </p>
              {#if event.reason}<p>
                  {event.reason}
                </p>{/if}{#if event.aggregate_version || event.version}<p>
                  Version {event.aggregate_version || event.version}
                </p>{/if}
            </article>{/each}{#if !events.length}<div
              class="empty-state compact"
            >
              <Icon name="clock" size={28} />
              <h3>Noch kein sichtbarer Verlauf</h3>
              <p>
                Geschäftliche Änderungen und Freigaben werden mit dem jeweiligen
                Stand dokumentiert.
              </p>
            </div>{/if}
        </div>
      </section>{:else}
      {#if ['overview','linked','purchasing'].includes(tab)&&data.related?.stock_reservations}<StockReservations items={data.related.stock_reservations} {data}/>{/if}
    {#each related.filter(([key, items]) => key!=='stock_reservations'&&relationVisible(key) && (items.length || tab !== "overview")) as [key, items]}<section
          class="panel"
        >
          <header class="panel-header">
            <h2>{relationNames[key] || label(key)}</h2>
            <span class="count">{items.length}</span>
          </header>
          {#if items.length}<div class="table-scroll">
              <table class="data-table">
                <thead
                  ><tr
                    >{#each relationColumns(items) as col}<th>{label(col)}</th
                      >{/each}</tr
                  ></thead
                ><tbody
                  >{#each items as item}<tr
                      >{#each relationColumns(items) as col, index}<td
                          >{#if col.includes("status")}<Status
                              value={item[col]}
                            />{:else if index === 0 && relationUrl(key, item)}<a
                              class="text-link"
                              href={relationUrl(key, item)}
                              >{col === "id"
                                ? recordName(item)
                                : display(item[col], col, data)}</a
                            >{:else}{display(item[col], col, data)}{/if}</td
                        >{/each}</tr
                    >{/each}</tbody
                >
              </table>
            </div>{:else}<div class="empty-state compact">
              <p>Noch keine verknüpften Einträge vorhanden.</p>
            </div>{/if}
        </section>{/each}
      {#if tab === "communication"}{#key record.id}<Communication
            {data}
          />{/key}{/if}
      {#if tab !== "overview" && tab !== "communication" && !related.some( ([key]) => relationVisible(key) ) && !selectedOrderArea}<div
          class="panel"
        >
          <div class="empty-state compact">
            <div class="empty-icon"><Icon name="link" /></div>
            <h3>Verknüpfungen über die Angaben öffnen</h3>
            <p>
              In der Übersicht führen verknüpfte Angaben direkt zum Kunden,
              Auftrag oder Lieferanten. Dort finden Sie die zugehörigen
              Arbeitsbereiche.
            </p>
            <button class="btn" onclick={() => (tab = "overview")}
              >Zur Übersicht<Icon name="arrow" size={15} /></button
            >
          </div>
        </div>{/if}
    {/if}
  </div>
  <aside class="stack">
    <section class="panel">
      <header class="panel-header"><h2>Aktueller Stand</h2></header>
      <div class="panel-body">
        <dl class="definition-list" style="grid-template-columns:1fr">
          {#each statusKeys as key}<div>
              <dt>{label(key)}</dt>
              <dd><Status value={record[key]} /></dd>
            </div>{/each}{#if !statusKeys.length}<p class="small muted">
              Noch kein gesonderter Arbeitsstatus.
            </p>{/if}{#if record.due_date}<div>
              <dt>Fälligkeit / Termin</dt>
              <dd>{display(record.due_date, "due_date")}</dd>
            </div>{/if}
        </dl>
      </div>
    </section>
    {#if actionList.length > 1}<section class="panel">
        <header class="panel-header"><h2>Weitere Schritte</h2></header>
        <div class="panel-body stack action-menu" style="gap:10px">
          {#each actionList.slice(1) as action}<button
              class="btn"
              disabled={actionBusy || actionBlocked(action)}
              onclick={() => perform(action)}
              >{action.label}<Icon name="arrow" size={15} /></button
            >{/each}
        </div>
      </section>{/if}{#if module.slug === "stock"}<section class="panel">
        <header class="panel-header"><h2>Lageretikett</h2></header>
        <div class="panel-body">
          <p class="small mb">
            Das QR-Etikett öffnet diesen Bestand nach der Anmeldung. Es enthält
            keine personenbezogenen Angaben.
          </p>
          <a
            class="btn full"
            data-sveltekit-reload
            href={`/api/v1/stock/${record.id}/label`}
            target="_blank"
            rel="noreferrer"
            ><Icon name="download" size={16} />QR-Etikett öffnen</a
          >
        </div>
      </section>{/if}{#if module.slug === "documents"}<section class="panel">
        <header class="panel-header"><h2>Originaldatei</h2></header>
        <div class="panel-body">
          {#if record.status==='available'}<p class="small mb">Die Sicherheitsprüfung ist abgeschlossen. Das Original wird mit Ihrer bestehenden Leseberechtigung ausgeliefert.</p>
          <a class="btn full" data-sveltekit-reload download href={`/api/v1/documents/${record.id}/download`}><Icon name="download" size={16} />Original herunterladen</a>
          {:else}<p class="small">{['quarantine','scanning','pending'].includes(record.status)?'Die Sicherheitsprüfung ist noch offen. Das Original bleibt bis zur bestätigten Prüfung gesperrt.':'Das Original ist in diesem Status nicht zum Download freigegeben.'}</p><button class="btn full mt" onclick={()=>refreshAll()}>Prüfstatus aktualisieren</button>{/if}
        </div>
      </section>{/if}{#if permitted(data, "portal.publish") && ["customers", "quotes", "invoices", "orders", "documents", "deliveries", "acceptances", "change-orders"].includes(module.slug)}<PortalManagement
        {data}
      />{/if}
  </aside>
</div>
{#if editor}<RecordEditor
    {data}
    {record}
    onclose={() => (editor = false)}
  />{/if}{#if activeAction}<ActionDialog
    {data}
    action={activeAction}
    records={[record]}
    onclose={() => (activeAction = null)}
    onsaved={actionSaved}
  />{/if}
