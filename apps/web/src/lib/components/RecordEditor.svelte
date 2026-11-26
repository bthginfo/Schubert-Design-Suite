<script lang="ts">
 import QuickCustomer from './QuickCustomer.svelte';
 import InlineOriginal from './InlineOriginal.svelte';
  import {
    searchableSelect,
    visibleFieldControl,
  } from "#lib/client/searchable-select.ts";
  import { page } from "$app/state";
  import DraftReview from "./DraftReview.svelte";
  import DocumentTotals from "./DocumentTotals.svelte";
  import { assistantDraftModules } from "@schubert/contracts";
  import { dec } from "@schubert/domain";
  import { formSections } from "#lib/client/form-sections.ts";
  import { createContext } from "#lib/client/create-context.ts";
  import { focusTrap } from "#lib/client/focus-trap.ts";
  import { onMount, onDestroy, tick, untrack } from "svelte";
  import { refreshAll, beforeNavigate, goto, preloadData } from "$app/navigation";
  import {
    canonicalNumber,
    formatNumberInput,
    lineNumberKinds,
    lineNumberProblem,
    lineProblems,
    parseNumberInput,
    payloadNumber,
    weekdaysBetween,
    type LineNumberKey,
  } from "#lib/client/number-input.ts";
  import {
    command,
    RequestError,
    permitted,
    display,
  } from "#lib/client/api.ts";
  import type { AppData, Row } from "#lib/client/types.ts";
  import {
    deliveryLinePayload,
    deliveryLineProblem,
  } from "#lib/client/delivery-lines.ts";
  import DeliveryLines from "./DeliveryLines.svelte";
  import ReferencePicker from "./ReferencePicker.svelte";
  import SalesPricePicker from "./SalesPricePicker.svelte";
  import FieldInput from "./FieldInput.svelte";
  import Icon from "./Icon.svelte";
  import { showSavedToast } from "#lib/client/saved-toast.ts";
  let {
    data,
    record = null,
    initialValues = {},
    onclose,
    onsaved,
  }: {
    data: AppData;
    record?: Row | null;
    initialValues?: Row;
    onclose: () => void;
    onsaved?: (result: any) => void;
  } = $props();
  let values: Row = $state({});
  let addedChoices:Record<string,{id:string;name:string}[]>=$state({});
  const editorLookups=$derived.by(()=>Object.fromEntries([...new Set([...Object.keys(data.lookups),...Object.keys(addedChoices)])].map(key=>[key,[...new Map([...(data.lookups[key]??[]),...(addedChoices[key]??[])].map(choice=>[choice.id,choice])).values()]])));
  let lines: Row[] = $state([]);
  let busy = $state(false);
  let error = $state("");
  let fieldErrors: Record<string, string> = $state({});
  function lineFieldError(index:number,key:string){return fieldErrors[`lines.${index}.${key}`]||'';}
  function removeLine(index:number){
    lines=lines.filter((_,i)=>i!==index);
    fieldErrors=Object.fromEntries(Object.entries(fieldErrors).flatMap(([key,value])=>{const match=key.match(/^lines\.(\d+)\.(.+)$/);if(!match)return [[key,value]];const old=Number(match[1]);return old===index?[]:[[`lines.${old>index?old-1:old}.${match[2]}`,value]];}));
    if(!Object.keys(fieldErrors).length)error='';
  }
  let form: HTMLFormElement;
  let activeSection = $state('0');
  function trackSections(node: HTMLElement) {
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = node.getBoundingClientRect().top + 80;
        const sections = [...node.querySelectorAll<HTMLElement>('[data-editor-section],[data-editor-lines]')]
          .filter(section => section.getBoundingClientRect().height > 0);
        const current = sections.filter(section => section.getBoundingClientRect().top <= top).at(-1) ?? sections[0];
        if (current) activeSection = current.dataset.editorSection ?? 'lines';
      });
    };
    node.addEventListener('scroll', refresh, { passive: true });
    refresh();
    return { destroy() { cancelAnimationFrame(frame); node.removeEventListener('scroll', refresh); } };
  }
  let initialized = $state(false);
  let localVersion: number | undefined = $state();
  let savedFingerprint = $state("");
  let autosavePaused = $state(false);
  // A server-confirmed save in this dialog; closing then shows the save receipt.
  let savedInSession = false;
  let saveLabel = $state("");
  let previousInputs: { input: Row; lineRevisionId?: string }[] = $state([]);
  let lastSavedInput: Row = {};
  let debounce: ReturnType<typeof setTimeout>;
  let closingSave = $state(false);
  let discardRequested = $state(false);
  let discardPanel = $state<HTMLElement>();
  let pendingNavigation: string | null = null;
  let leaving = false;
  const isDelivery = $derived(data.module?.slug === "deliveries");
  const frozenOrder = $derived(
    data.module?.slug === "orders" && !!record?.quote_version_id,
  );
  // Own leave requests: the command always uses the signed-in employee.
  const ownLeaveOnly = $derived(
    data.module?.slug === "leave" &&
      ["Employee", "Workshop"].includes(data.context?.role || ""),
  );
  type EditorSection = ReturnType<typeof formSections>[number];
  const advancedInvoiceTitle = "Erweitert (Steuerberatung / E-Rechnung)";
  const advancedInvoiceKeys = [
    "corrects_invoice_id",
    "planned_transmission_date",
    "recipient_regime",
    "tax_category",
    "tax_exemption_reason",
    "rule_version_id",
    "recipient_profile_version_id",
    "settlement_rule_version_id",
  ];
  /** Tax-advisor and e-invoice details stay in one closed disclosure unless the invoice type needs them. */
  function arrangeInvoiceSections(base: EditorSection[]): EditorSection[] {
    const kind = String(values.kind || "");
    const promoted = new Set([
      ...(kind === "final" ? ["settlement_rule_version_id"] : []),
      ...(["correction", "credit"].includes(kind) ? ["corrects_invoice_id"] : []),
    ]);
    const all = base.flatMap((section) => section.fields);
    const advanced = advancedInvoiceKeys
      .filter((key) => !promoted.has(key))
      .flatMap((key) => all.filter((field) => field.key === key));
    const moved = new Set(advanced.map((field) => field.key));
    const settlement = all.filter(
      (field) => promoted.has(field.key) && field.key === "settlement_rule_version_id",
    );
    for (const field of settlement) moved.add(field.key);
    const arranged = base
      .map((section, index) => ({
        ...section,
        fields: [
          ...section.fields.filter((field) => !moved.has(field.key)),
          ...(index === 0 ? settlement : []),
        ],
      }))
      .filter((section) => section.fields.length);
    if (!advanced.length) return arranged;
    const disclosure: EditorSection = {
      title: advancedInvoiceTitle,
      description:
        "Nur bei Bedarf, meist nach Rücksprache mit der Steuerberatung. Ohne Angaben gelten die aktuell freigegebene Rechnungsregel und der Kundentyp. Für öffentliche Auftraggeber (XRechnung) hier das Empfängerprofil wählen.",
      keys: advanced.map((field) => field.key),
      fields: advanced,
      optional: true,
    };
    const notes = arranged.findIndex((section) => section.optional);
    return notes < 0
      ? [...arranged, disclosure]
      : [...arranged.slice(0, notes), disclosure, ...arranged.slice(notes)];
  }
  const sections = $derived.by(() => {
    const base = formSections(
      data.module?.slug || "",
      (data.module?.fields || []).filter(
        (field) =>
          !(data.module?.slug === "orders" && field.key === "budget_net") &&
          !(frozenOrder && ["currency", "customer_id"].includes(field.key)) &&
          !(ownLeaveOnly && field.key === "employee_id"),
      ),
    );
    return data.module?.slug === "invoices" ? arrangeInvoiceSections(base) : base;
  });
  // Disclosures open for values and errors but never close while the person clears a value.
  function openWhen(node: HTMLDetailsElement, open: boolean) {
    if (open) node.open = true;
    return {
      update(next: boolean) {
        if (next) node.open = true;
      },
    };
  }
  function sectionOpen(section: EditorSection) {
    return section.fields.some(
      (field) =>
        !!fieldErrors[field.key] ||
        (!!values[field.key] &&
          !(
            data.module?.slug === "quotes" &&
            field.key === "currency" &&
            values.currency === (data.settings?.currency || "EUR")
          )),
    );
  }
  const quoteHelp: Record<string, string> = {
    order_id:
      "Optional mit einem bestehenden Auftrag dieses Kunden verbinden. Für ein neues Vorhaben leer lassen.",
    service_date:
      "Nur einen bereits vereinbarten Leistungstermin eintragen. Ist er noch offen, lassen Sie das Feld leer.",
    due_date:
      "Nur einen bereits vereinbarten Zahlungstermin eintragen. Für den ersten Entwurf kann er offen bleiben.",
    valid_until:
      "Für „Zur Prüfung“ erforderlich. Vorgeschlagen sind 30 Tage ab heute; bei Bedarf anpassen.",
  };
  function editorHelp(field: import("#lib/client/types.ts").Field) {
    const slug = data.module?.slug;
    if (slug === "quotes") return quoteHelp[field.key];
    if (slug === "invoices" && field.key === "rule_version_id")
      return "Meist leer lassen. Ohne Auswahl verwendet die Prüfung automatisch die aktuell freigegebene Rechnungsregel.";
    if (slug === "invoices" && field.key === "tax_category")
      return "Für normale Rechnungen mit 19 % oder 7 % leer lassen. Einen besonderen Steuerfall wie Reverse Charge nur nach Rücksprache mit der Steuerberatung wählen.";
    if (slug === "leave" && field.key === "days")
      return "Vorgeschlagen aus den Tagen Montag bis Freitag im Zeitraum. Feiertage ggf. abziehen. Einen halben Urlaubstag als eigenen eintägigen Antrag mit 0,5 Tagen erfassen.";
    return undefined;
  }
  /** Default VAT for new selling positions; a small business keeps the rate as a conscious entry. */
  const defaultTaxRate = $derived(
    data.settings?.tax_profile === "small_business" ? "" : "19",
  );
  function berlinDate(offsetDays = 0) {
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Berlin",
    }).format(new Date());
    const date = new Date(today + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return date.toISOString().slice(0, 10);
  }
  const missingRequired = $derived(
    sections
      .flatMap((section) => section.fields)
      .filter(
        (field) =>
          field.required &&
          !(
            field.key === "settlement_rule_version_id" &&
            values.kind !== "final"
          ) &&
          (values[field.key] === undefined ||
            values[field.key] === null ||
            String(values[field.key]).trim() === ""),
      ),
  );
  function jumpToSection(index: number) {
    const node = form?.querySelector<HTMLElement>(
      `[data-editor-section="${index}"]`,
    );
    if (!node) return;
    if (node instanceof HTMLDetailsElement) node.open = true;
    node.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    visibleFieldControl(
      node.querySelector<HTMLElement>("input,select,textarea"),
    )?.focus({ preventScroll: true });
  }
  function jumpToLines() {
    const node = form?.querySelector<HTMLElement>("[data-editor-lines]");
    if (!node) return;
    node.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    (
      visibleFieldControl(
        node.querySelector<HTMLElement>("textarea,input,select"),
      ) ?? node.querySelector<HTMLButtonElement>("button")
    )?.focus({ preventScroll: true });
  }
  function focusMissing() {
    const field = missingRequired[0];
    if (!field) return;
    const input = document.getElementById("field-" + field.key);
    revealField(input);
    visibleFieldControl(input)?.focus();
  }
  function revealField(element: HTMLElement | null) {
    const section = element?.closest("details");
    if (section) section.open = true;
  }
  const hasLines = $derived(
    [
      "quotes",
      "invoices",
      "purchase-orders",
      "supplier-invoices",
      "change-orders",
      "deliveries",
      "orders",
    ].includes(data.module?.slug || ""),
  );
  const selling = $derived(
    ["quotes", "invoices", "change-orders", "orders"].includes(
      data.module?.slug || "",
    ),
  );
  const contextReferences = $derived(
    !record
      ? (data.module?.fields || [])
          .filter((field) => field.type === "reference" && values[field.key])
          .flatMap((field) => {
            const selected = (data.lookups[field.reference || ""] || []).find(
              (item) => item.id === values[field.key],
            );
            return selected
              ? [{ label: field.label, name: selected.name }]
              : [];
          })
      : [],
  );
  function applyPrice(line: Row, price: Row) {
    line.price_version_id = price.id;
    line.unit = price.unit;
    line.unit_price = decimalInput(
      dec(price.amount).div(price.basis_quantity).toFixed(6),
    );
    line.tax_rate = decimalInput(price.tax_rate);
  }
  const autosave = $derived(
    !!record &&
      ["draft", "new"].includes(record.status) &&
      ["quotes", "invoices", "orders", "purchase-orders", "inquiries"].includes(
        data.module?.slug || "",
      ),
  );
  function dateInput(value: unknown) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
      return value;
    const parsed = new Date(value as string);
    return Number.isFinite(parsed.getTime())
      ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(
          parsed,
        )
      : "";
  }
  function localDateTime(value: string) {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  function cloneInputs<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }
  function decimalInput(value: unknown) {
    return String(value ?? "")
      .replace(/(\.\d*?)0+$/, "$1")
      .replace(/\.$/, "")
      .replace(".", ",");
  }
  function payload() {
    const result = Object.fromEntries(
      Object.entries(values).filter(
        ([key, value]) =>
          value !== "" ||
          !!record ||
          !!data.module?.fields.find((f) => f.key === key)?.required,
      ),
    );
    for (const field of data.module?.fields || []) {
      if (field.type === "datetime-local" && result[field.key])
        result[field.key] = new Date(String(result[field.key])).toISOString();
      // German entry ("2.400,00", "2,5") becomes the canonical decimal string.
      if (
        (field.type === "money" || field.type === "number") &&
        typeof result[field.key] === "string" &&
        result[field.key].trim()
      )
        result[field.key] =
          canonicalNumber(result[field.key], numberKind(field)) ??
          result[field.key];
    }
    if (frozenOrder)
      for (const key of ["customer_id", "currency", "budget_net"])
        delete result[key];
    if (isDelivery) result.lines = deliveryLinePayload(lines);
    else if (hasLines && lines.length && !frozenOrder)
      result.lines = lines.map((l) => {
        // Hidden values of headings, texts and subtotals never block saving.
        const item = (l.line_type ?? "item") === "item";
        const number = (key: LineNumberKey, value: unknown, fallback: string) =>
          item
            ? payloadNumber(value, lineNumberKinds[key], fallback)
            : (canonicalNumber(value, lineNumberKinds[key]) ?? "0");
        return {
        ...(l.id ? { id: l.id } : {}),
        description: l.description,
        quantity: number("quantity", l.quantity ?? "0", ""),
        unit: l.unit || "piece",
        unit_price: number("unit_price", l.unit_price, "0"),
        tax_rate: number("tax_rate", l.tax_rate, "0"),
        discount_percent: number("discount_percent", l.discount_percent, "0"),
        line_type: l.line_type,
        optional: !!l.optional,
        selected: !!l.selected,
        ...(l.product_id ? { product_id: l.product_id } : {}),
        ...(l.price_version_id ? { price_version_id: l.price_version_id } : {}),
        ...(permitted(data, "finance") && l.cost_unit !== undefined
          ? {
              cost_unit:
                l.cost_unit === null || String(l.cost_unit).trim() === ""
                  ? null
                  : payloadNumber(l.cost_unit, "money", ""),
            }
          : {}),
        ...(l.tax_category ? { tax_category: l.tax_category } : {}),
        ...(l.tax_exemption_reason
          ? { tax_exemption_reason: l.tax_exemption_reason }
          : {}),
      };
      });
    return result;
  }
  function numberKind(field: { type: string }) {
    return field.type === "money" ? ("money" as const) : ("decimal" as const);
  }
  /** Numeric problems the editor can explain before sending anything. */
  function inputProblems() {
    const problems: { key: string; message: string; summary: string }[] = [];
    for (const section of sections)
      for (const field of section.fields) {
        if (field.type !== "money" && field.type !== "number") continue;
        const value = String(values[field.key] ?? "").trim();
        if (value && !parseNumberInput(value, numberKind(field)).ok)
          problems.push({
            key: field.key,
            message: headerNumberMessage(field),
            summary: `${field.label} prüfen`,
          });
      }
    if (hasLines && !isDelivery && !frozenOrder)
      for (const problem of lineProblems(
        lines,
        permitted(data, "finance")
          ? undefined
          : ["quantity", "unit_price", "tax_rate", "discount_percent"],
      ))
        problems.push({
          key: `lines.${problem.index}.${problem.key}`,
          message: problem.message,
          summary: problem.summary,
        });
    return problems;
  }
  function headerNumberMessage(field: { type: string }) {
    return field.type === "money"
      ? "Einen eindeutigen Betrag eingeben, zum Beispiel 2.400,00 oder 2400,50."
      : "Eine eindeutige Zahl eingeben, zum Beispiel 12,5.";
  }
  // Inline messages from blur checks; server messages stay until the person edits the field.
  let clientErrorKeys = new Set<string>();
  function setClientError(key: string, message: string) {
    if (message) {
      clientErrorKeys.add(key);
      if (fieldErrors[key] !== message)
        fieldErrors = { ...fieldErrors, [key]: message };
    } else if (clientErrorKeys.has(key) && fieldErrors[key]) {
      clientErrorKeys.delete(key);
      const next = { ...fieldErrors };
      delete next[key];
      fieldErrors = next;
    }
  }
  const lineInputKeys: Record<string, LineNumberKey> = {
    quantity: "quantity",
    price: "unit_price",
    tax: "tax_rate",
    discount: "discount_percent",
    cost: "cost_unit",
  };
  function validateOnBlur(event: FocusEvent) {
    const target = event.target as HTMLElement | null;
    const id = target?.id || "";
    const line = id.match(/^line-(quantity|price|tax|discount|cost)-(\d+)$/);
    if (line) {
      const index = Number(line[2]),
        key = lineInputKeys[line[1]],
        current = lines[index];
      if (!current) return;
      // An empty required value is reported by the form itself when saving.
      setClientError(
        `lines.${index}.${key}`,
        String(current[key] ?? "").trim() ? lineNumberProblem(current, key) : "",
      );
      return;
    }
    const field = data.module?.fields.find((item) => "field-" + item.key === id);
    if (field && (field.type === "money" || field.type === "number")) {
      const value = String(values[field.key] ?? "").trim();
      setClientError(
        field.key,
        value && !parseNumberInput(value, numberKind(field)).ok
          ? headerNumberMessage(field)
          : "",
      );
    }
  }
  /** "1.000" as a quantity means 1; say so instead of silently guessing. */
  function quantityHint(value: unknown) {
    const parsed = parseNumberInput(value, "decimal");
    return parsed.ok && parsed.ambiguous
      ? `Verstanden als ${formatNumberInput(parsed.value)}. Tausender bitte ohne Punkt eingeben, zum Beispiel 1000.`
      : "";
  }
  async function focusFirstInvalid() {
    await tick();
    const invalid = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    revealField(invalid || null);
    await tick();
    if (invalid) {
      const visible = visibleFieldControl(invalid);
      visible?.focus();
      visible?.scrollIntoView({ block: "nearest" });
    } else
      form?.querySelector(".notice.error")?.scrollIntoView({ block: "nearest" });
  }
  onMount(() => {
    values = Object.fromEntries(
      (data.module?.fields || []).map((f) => [
        f.key,
        f.type === "datetime-local" && record?.[f.key]
          ? localDateTime(record[f.key])
          : record?.[f.key] !== undefined && record?.[f.key] !== null
            ? f.type === "date"
              ? dateInput(record[f.key])
              : ["number", "money"].includes(f.type)
                ? decimalInput(record[f.key])
                : record[f.key]
            : f.type === "checkbox"
              ? f.key === "active"
              : "",
      ]),
    );
    lines = (record?.lines || data.related?.lines || []).map((line: Row) => ({
      ...line,
      client_key: crypto.randomUUID(),
      quantity: decimalInput(line.quantity),
      unit_price: decimalInput(line.unit_price),
      tax_rate: decimalInput(line.tax_rate),
      discount_percent: decimalInput(line.discount_percent),
      ...(line.cost_unit !== undefined && line.cost_unit !== null
        ? { cost_unit: decimalInput(line.cost_unit) }
        : {}),
    }));
    if (!record) {
      lines = [];
      const has = (key: string) =>
        !!data.module?.fields.some((field) => field.key === key);
      if (has("currency")) values.currency = data.settings?.currency || "EUR";
      const proposed = new URLSearchParams(page.url.search);
      if (data.module?.slug === "datev") {
        if (proposed.has("from"))
          proposed.set("starts_on", proposed.get("from")!);
        if (proposed.has("to")) proposed.set("ends_on", proposed.get("to")!);
      }
      Object.assign(
        values,
        createContext(
          data.module?.fields || [],
          data.lookups,
          proposed,
          initialValues,
        ),
      );
      // Editable proposals for a new record; nothing is saved without "Speichern".
      if (data.module?.slug === "quotes" && has("valid_until") && !values.valid_until)
        values.valid_until = berlinDate(30);
      if (data.module?.slug === "customers" && has("country") && !values.country)
        values.country = "DE";
      if (data.module?.slug === "leave" && has("kind") && !values.kind)
        values.kind = "vacation";
    }
    leaveRange = `${values.starts_on || ""}|${values.ends_on || ""}`;
    leaveDaysManual = !!record && !!String(values.days ?? "").trim();
    localVersion = record?.version;
    lastSavedInput = cloneInputs(payload());
    savedFingerprint = JSON.stringify(lastSavedInput);
    initialized = true;
    visibleFieldControl(
      form?.querySelector<HTMLElement>("input,select,textarea"),
    )?.focus();
    if (
      !record &&
      data.module?.slug === "invoices" &&
      values.order_id &&
      !lines.length
    )
      void prefillFromOrder(String(values.order_id), true);
  });
  // Leave: propose Mon–Fri days for the chosen range until the person types their own value.
  let leaveRange = "";
  let leaveDaysManual = false;
  $effect(() => {
    if (data.module?.slug !== "leave" || !initialized) return;
    const range = `${values.starts_on || ""}|${values.ends_on || ""}`;
    if (range === leaveRange) return;
    leaveRange = range;
    if (leaveDaysManual) return;
    const count = weekdaysBetween(values.starts_on, values.ends_on);
    if (count !== null) values.days = count > 0 ? String(count) : "";
  });
  // Invoice from an order: copy title and positions from the order as an editable proposal.
  let orderPrefill: {
    number: string;
    href: string;
    count: number;
  } | null = $state(null);
  let orderPrefillBusy = $state(false);
  let orderPrefillError = $state("");
  async function prefillFromOrder(orderId: string, automatic = false) {
    if (orderPrefillBusy || !/^[0-9a-f-]{36}$/i.test(orderId)) return;
    orderPrefillBusy = true;
    orderPrefillError = "";
    const before = JSON.stringify(payload());
    try {
      // Billing reads the agreed positions through the invoice workspace, also without access to the order page.
      const result = await preloadData(`/invoices?source=order&order_id=${encodeURIComponent(orderId)}`);
      const page = result.type === "loaded" ? result.data : null;
      const orderSource = page?.summary?.orderSource as { order: Row; lines: Row[] } | undefined;
      const order = orderSource?.order ?? null;
      if (!page || !order || order.id !== orderId)
        throw new Error("Auftrag nicht lesbar");
      // The person may have chosen another order or started positions meanwhile.
      if (values.order_id !== orderId || lines.length) return;
      const untouched =
        before === savedFingerprint && JSON.stringify(payload()) === before;
      const source = orderSource?.lines ?? [];
      if (!String(values.title ?? "").trim() && order.title)
        values.title = String(order.title);
      if (typeof order.currency === "string" && /^[A-Z]{3}$/.test(order.currency))
        values.currency = order.currency;
      if (
        !values.customer_id &&
        order.customer_id &&
        editorLookups.customers?.some((item) => item.id === order.customer_id)
      )
        values.customer_id = order.customer_id;
      lines = source.map((line) => ({
        client_key: crypto.randomUUID(),
        description: String(line.description ?? ""),
        quantity: decimalInput(line.quantity),
        unit: line.unit || "piece",
        unit_price: decimalInput(line.unit_price),
        tax_rate: decimalInput(line.tax_rate),
        discount_percent: decimalInput(line.discount_percent) || "0",
        line_type: line.line_type || "item",
        optional: !!line.optional,
        selected: line.selected !== false,
        // The agreed order price is kept; a price-list binding is not carried over.
        ...(line.product_id ? { product_id: line.product_id } : {}),
        ...(line.tax_category ? { tax_category: line.tax_category } : {}),
        ...(line.tax_exemption_reason
          ? { tax_exemption_reason: line.tax_exemption_reason }
          : {}),
      }));
      orderPrefill = {
        number: String(order.number || order.title || "ohne Nummer"),
        href: "/orders/" + order.id,
        count: lines.length,
      };
      if (untouched) {
        lastSavedInput = cloneInputs(payload());
        savedFingerprint = JSON.stringify(lastSavedInput);
      }
    } catch {
      orderPrefillError = automatic
        ? "Die Positionen des Auftrags konnten nicht automatisch übernommen werden. Bitte die Leistungen selbst erfassen oder es über „Positionen aus Auftrag übernehmen“ erneut versuchen."
        : "Die Positionen des Auftrags konnten nicht geladen werden. Bitte später erneut versuchen oder die Leistungen selbst erfassen.";
    } finally {
      orderPrefillBusy = false;
    }
  }
  beforeNavigate((navigation) => {
    if (
      leaving ||
      !initialized ||
      (!busy && JSON.stringify(payload()) === savedFingerprint)
    )
      return;
    navigation.cancel();
    if (navigation.type === "leave" || busy) return;
    pendingNavigation = navigation.to?.url.href || null;
    clearTimeout(debounce);
    discardRequested = true;
    tick().then(() => discardPanel?.focus());
  });
  onDestroy(() => clearTimeout(debounce));
  $effect(() => {
    const fingerprint = JSON.stringify(payload());
    if (
      initialized &&
      autosave &&
      !busy &&
      !autosavePaused &&
      !discardRequested &&
      fingerprint !== savedFingerprint
    ) {
      saveLabel = "Änderungen ausstehend";
      debounce = setTimeout(() => {
        if (form?.checkValidity()) persist(false);
      }, 1400);
    } else if (
      initialized &&
      autosave &&
      fingerprint === savedFingerprint &&
      untrack(() => saveLabel.startsWith("Noch nicht gespeichert"))
    )
      // A corrected value equal to the saved draft leaves nothing to save.
      saveLabel = "Vom Server bestätigt gespeichert";
    return () => clearTimeout(debounce);
  });
  function addLine() {
    lines = [
      ...lines,
      {
        client_key: crypto.randomUUID(),
        description: "",
        quantity: "1",
        unit: "piece",
        unit_price: "",
        tax_rate: selling ? defaultTaxRate : "",
        discount_percent: "0",
        line_type: "item",
        optional: false,
        selected: true,
      },
    ];
  }
  function serverIdentities(result: Row, input: Row, submittedKeys: string[]) {
    const identities = new Map<number, string>(
      (result.line_identities || result.record?.line_identities || []).map(
        (item: Row) => [Number(item.position), item.id],
      ),
    );
    const saved = cloneInputs(input);
    for (const [index, key] of submittedKeys.entries()) {
      const id = identities.get(index + 1);
      if (!id) continue;
      const current = lines.find((line) => line.client_key === key);
      if (current) current.id = id;
      if (saved.lines?.[index]) saved.lines[index].id = id;
    }
    return saved;
  }
  async function persist(close: boolean) {
    if (busy || !data.module) return;
    discardRequested = false;
    if (isDelivery) {
      const problem = deliveryLineProblem(lines);
      if (problem) {
        error = problem;
        return;
      }
    }
    const problems = inputProblems();
    if (problems.length) {
      const first = problems[0];
      if (!close) {
        // Autosave never interrupts typing; the status names the value to check.
        saveLabel = `Noch nicht gespeichert · ${first.summary}`;
        return;
      }
      for (const problem of problems) setClientError(problem.key, problem.message);
      error =
        `${first.summary}: ${first.message}` +
        (problems.length > 1 ? " Weitere markierte Felder ebenfalls prüfen." : "");
      await focusFirstInvalid();
      return;
    }
    const input = payload();
    const submittedKeys = lines.map((line) => line.client_key);
    const fingerprint = JSON.stringify(input);
    if (close && record && fingerprint === savedFingerprint) {
      onclose();
      if (savedInSession) showSavedToast("Gespeichert.");
      await refreshAll().catch(() => {});
      return;
    }
    busy = true;
    closingSave = close;
    error = "";
    fieldErrors = {};
    saveLabel = "Wird gespeichert …";
    try {
      const result = await command(
        data.module.commandPrefix + "." + (record ? "update" : "create"),
        record?.id,
        input,
        localVersion ?? record?.version,
      );
      localVersion = result.version ?? result.record?.version ?? localVersion;
      if (!close)
        previousInputs = [
          ...previousInputs.slice(-9),
          {
            input: cloneInputs(lastSavedInput),
            lineRevisionId:
              result.line_undo_revision_id ||
              result.record?.line_undo_revision_id,
          },
        ];
      lastSavedInput = serverIdentities(result, input, submittedKeys);
      savedFingerprint = JSON.stringify(lastSavedInput);
      saveLabel = "Vom Server bestätigt gespeichert";
      autosavePaused = false;
      savedInSession = true;
      onsaved?.(result);
      if (close) {
        onclose();
        const number = result.number ?? result.record?.number;
        showSavedToast(record ? "Gespeichert." : `Gespeichert. ${data.module.singular}${number ? " " + number : ""} angelegt.`);
        await refreshAll().catch(() => {});
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
      if (e instanceof RequestError) fieldErrors = e.fields;
      saveLabel = "Speichern fehlgeschlagen · Eingaben erhalten";
      autosavePaused = true;
    } finally {
      busy = false;
      closingSave = false;
      if (error) await focusFirstInvalid();
    }
  }
  async function undoAutosave() {
    const previous = previousInputs.at(-1);
    if (!previous || busy || !record || !data.module) return;
    busy = true;
    closingSave = true;
    error = "";
    try {
      const input = cloneInputs(previous.input),
        knownIds = new Set(lines.map((line) => line.id).filter(Boolean));
      let restored = false;
      if (input.lines)
        input.lines = input.lines.map((line: Row) => {
          if (line.id && !knownIds.has(line.id)) {
            restored = true;
            if (!previous.lineRevisionId) {
              const { id, ...newLine } = line;
              return newLine;
            }
          }
          return line;
        });
      const result = await command(
        data.module.commandPrefix + ".update",
        record.id,
        {
          ...input,
          ...(previous.lineRevisionId
            ? { restore_line_revision_id: previous.lineRevisionId }
            : {}),
        },
        localVersion ?? record.version,
      );
      localVersion = result.version ?? localVersion;
      // Canonical saved numbers are shown in German again and parse back to the same value.
      const display = (value: unknown, kind: "money" | "decimal" | "percent") =>
        typeof value === "string" && canonicalNumber(value, "decimal") === value
          ? formatNumberInput(value, kind)
          : value;
      values = Object.fromEntries(
        (data.module.fields || []).map((field) => [
          field.key,
          field.type === "datetime-local" && input[field.key]
            ? localDateTime(input[field.key])
            : field.type === "money" || field.type === "number"
              ? (display(input[field.key], numberKind(field)) ?? "")
              : (input[field.key] ?? (field.type === "checkbox" ? false : "")),
        ]),
      );
      lines = (input.lines || []).map((line: Row) => ({
        ...line,
        client_key: crypto.randomUUID(),
        ...Object.fromEntries(
          (Object.keys(lineNumberKinds) as LineNumberKey[])
            .filter((key) => line[key] !== undefined && line[key] !== null)
            .map((key) => [key, display(line[key], lineNumberKinds[key])]),
        ),
      }));
      lastSavedInput = serverIdentities(
        result,
        input,
        lines.map((line) => line.client_key),
      );
      savedFingerprint = JSON.stringify(lastSavedInput);
      previousInputs = previousInputs.slice(0, -1);
      saveLabel = restored
        ? "Rücknahme gespeichert · wiederhergestellte Positionen und interne Kosten prüfen"
        : "Letztes Autospeichern nachvollziehbar zurückgenommen";
      autosavePaused = false;
    } catch (e) {
      error =
        e instanceof Error
          ? e.message
          : "Die Rücknahme konnte nicht gespeichert werden.";
    } finally {
      busy = false;
      closingSave = false;
    }
  }
  async function closeEditor() {
    if (busy) return;
    clearTimeout(debounce);
    const dirty = initialized && JSON.stringify(payload()) !== savedFingerprint;
    if (dirty && (!autosave || !form.checkValidity() || autosavePaused)) {
      discardRequested = true;
      await tick();
      discardPanel?.focus();
      return;
    }
    if (dirty && autosave) {
      await persist(true);
    } else {
      onclose();
      if (savedInSession) showSavedToast("Gespeichert.");
      if (autosave) await refreshAll().catch(() => {});
    }
  }
  async function discard() {
    clearTimeout(debounce);
    leaving = true;
    const destination = pendingNavigation;
    onclose();
    if (destination) await goto(destination);
    else if (autosave) await refreshAll().catch(() => {});
  }
  async function continueEditing() {
    pendingNavigation = null;
    discardRequested = false;
    await tick();
    visibleFieldControl(
      form?.querySelector<HTMLElement>(
        '[aria-invalid="true"],input,select,textarea',
      ),
    )?.focus();
  }
  function save(event: SubmitEvent) {
    event.preventDefault();
    persist(true);
  }
</script>

<div
  class="modal-backdrop"
  role="presentation"
  onclick={(e) => {
    if (e.target === e.currentTarget && !busy) closeEditor();
  }}
>
  <div
    class:wide={hasLines}
    class="modal"
    role="dialog"
    use:focusTrap
    aria-modal="true"
    aria-labelledby="editor-title"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === "Escape" && !busy) closeEditor();
    }}
  >
    <header class="modal-header">
      <div>
        <h2 id="editor-title">
          {data.module?.singular}
          {record ? "bearbeiten" : "anlegen"}
        </h2>
        <p>
          {autosave
            ? "Dieser Entwurf speichert automatisch. Pflichtfelder sind mit * gekennzeichnet."
            : "Pflichtfelder sind mit * gekennzeichnet."}
        </p>
        {#if contextReferences.length}<p class="create-context">
            {contextReferences
              .map((item) => item.label + ": " + item.name)
              .join(" · ")}
          </p>{/if}
      </div>
      <button
        class="icon-button"
        aria-label="Schließen"
        disabled={busy}
        onclick={closeEditor}><Icon name="close" /></button
      >
    </header>
    {#if sections.length > 1 || hasLines}<div class="editor-outline">
        <nav aria-label="Abschnitte im Formular">
          {#each sections as section, index}{#if section.title}<button
                type="button"
                aria-current={activeSection === String(index) ? 'location' : undefined}
                onclick={() => jumpToSection(index)}>{section.title}</button
              >{/if}{/each}{#if hasLines}<button
              type="button"
              aria-current={activeSection === 'lines' ? 'location' : undefined}
              onclick={jumpToLines}>Positionen</button
            >{/if}
        </nav>
        {#if missingRequired.length}<button
            type="button"
            class="required-progress"
            onclick={focusMissing}
            >{missingRequired.length} Grundangabe{missingRequired.length === 1
              ? ""
              : "n"} offen<Icon name="chevron" size={13} /></button
          >{:else}<span class="required-complete"
            ><Icon name="check" size={13} />Grundangaben ausgefüllt</span
          >{/if}
      </div>{/if}
    <form
      bind:this={form!}
      onsubmit={save}
      oninput={(event) => {
        const target=event.target as HTMLElement;
        const line=target.id?.match(/^line-(description|quantity|unit|price|tax|discount|cost|type)-(\d+)$/);
        const keys:Record<string,string>={price:'unit_price',tax:'tax_rate',discount:'discount_percent',cost:'cost_unit',type:'line_type'};
        const key = line?`lines.${line[2]}.${keys[line[1]]||line[1]}`:target.id?.replace(/^field-/, "");
        if (target.id === "field-days" && data.module?.slug === "leave")
          leaveDaysManual = !!(target as HTMLInputElement).value?.trim();
        if (key && fieldErrors[key]) {
          clientErrorKeys.delete(key);
          const next = { ...fieldErrors };
          delete next[key];
          fieldErrors = next;
          if (!Object.keys(next).length) error = "";
        }
      }}
      onfocusout={validateOnBlur}
      oninvalidcapture={(event) => revealField(event.target as HTMLElement)}
      style="display:contents"
    >
      <div class="modal-body" use:trackSections inert={busy && closingSave}>
        {#if discardRequested}<section
            class="discard-confirmation"
            bind:this={discardPanel!}
            tabindex="-1"
            aria-labelledby="discard-title"
          >
            <h3 id="discard-title">Ungespeicherte Eingaben</h3>
            <p>
              {autosave
                ? "Die letzten Änderungen konnten noch nicht gespeichert werden. Bereits bestätigte Entwurfsstände bleiben erhalten."
                : "Diese Eingaben sind noch nicht gespeichert. Möchten Sie weiterarbeiten oder sie verwerfen?"}
            </p>
            <div class="inline-actions">
              <button
                type="button"
                class="btn primary"
                onclick={continueEditing}>Weiter bearbeiten</button
              ><button type="button" class="btn" onclick={discard}
                >Ungespeicherte Eingaben verwerfen</button
              >
            </div>
          </section>{/if}
        {#if error}<div class="notice error" role="alert">
            <Icon name="alert" />
            <div>{error}</div>
          </div>{/if}
        {#if !record&&data.module?.slug==='quotes'&&data.summary?.createSource}<div class="notice info"><Icon name="file"/><div><strong>Aus Anfrage übernommen</strong><p class="field-help"><a class="text-link" href={data.summary.createSource.href}>{data.summary.createSource.number?data.summary.createSource.number+' · ':''}{data.summary.createSource.title}</a></p><p class="field-help">Titel, Kunde und Kundenwunsch sind vorbelegt und bearbeitbar. Ergänzen Sie die tatsächlichen Leistungen und Preise.</p>{#if data.summary.createSource.truncated}<p class="field-help">Die lange Beschreibung ist im Entwurf gekürzt. Den vollständigen Text finden Sie in der verknüpften Anfrage.</p>{/if}</div></div>{/if}
        {#if !record&&data.module?.slug==='invoices'&&(orderPrefill||orderPrefillBusy||orderPrefillError)}<div class="notice" class:info={!orderPrefillError} class:warning={!!orderPrefillError} role="status"><Icon name={orderPrefillError?'alert':'file'}/><div>{#if orderPrefillBusy}<strong>Positionen aus dem Auftrag werden geladen …</strong>{:else if orderPrefillError}<strong>Positionen nicht übernommen</strong><p class="field-help">{orderPrefillError}</p>{:else if orderPrefill}<strong>{orderPrefill.count?`Positionen aus Auftrag ${orderPrefill.number} übernommen – bitte prüfen`:`Auftrag ${orderPrefill.number} enthält noch keine Positionen`}</strong><p class="field-help"><a class="text-link" href={orderPrefill.href} target="_blank" rel="noreferrer">Auftrag {orderPrefill.number} öffnen</a></p><p class="field-help">{orderPrefill.count?`Titel und ${orderPrefill.count} Position${orderPrefill.count===1?'':'en'} sind vorbelegt und bearbeitbar. Für Anzahlungs-, Abschlags- oder Teilrechnungen Mengen und Preise anpassen.`:'Bitte die abzurechnenden Leistungen unter Positionen erfassen.'}</p>{/if}</div></div>{/if}
        {#snippet sectionFields(
          fields: import("#lib/client/types.ts").Field[],
        )}<div class="field-grid">
            {#each fields as field (field.key)}<FieldInput
                field={field.key === "settlement_rule_version_id"
                  ? { ...field, required: values.kind === "final" }
                  : field}
                bind:value={values[field.key]}
                lookups={editorLookups}
                error={fieldErrors[field.key]}
                helpText={editorHelp(field)}
                referenceParentId={field.reference === "purchase-order-lines"
                  ? values.purchase_order_id || record?.purchase_order_id
                  : field.reference === "work-packages"
                    ? values.order_id || record?.order_id || undefined
                    : undefined}
                referenceKind={data.module?.slug === "invoices" &&
                field.reference === "finance-rules"
                  ? field.key === "settlement_rule_version_id"
                    ? "invoice_settlement"
                    : field.key === "rule_version_id"
                      ? "invoice_format"
                      : undefined
                  : undefined}
                referenceAsOf={["report-rules", "finance-rules"].includes(
                  field.reference || "",
                )
                  ? values.as_of ||
                    values.effective_on ||
                    values.next_due_date ||
                    (field.key === "rule_version_id"
                      ? values.planned_transmission_date
                      : undefined) ||
                    values.invoice_date
                  : undefined}
              />{#if field.key==='customer_id'&&data.module?.slug==='inquiries'&&permitted(data,'crm')}<QuickCustomer oncreated={customer=>{addedChoices={...addedChoices,customers:[...(addedChoices.customers??[]),{id:customer.id,name:customer.name}]};values.customer_id=customer.id;}}/>{/if}
              {#if field.key==='document_id'&&data.module?.slug==='supplier-invoices'&&permitted(data,'documents.upload')}<InlineOriginal onready={doc=>{addedChoices={...addedChoices,documents:[...(addedChoices.documents??[]),{id:doc.id,name:doc.name}]};values.document_id=doc.id;}}/>{/if}{/each}
          </div>{/snippet}
        {#snippet lineError(index:number,key:string)}{#if lineFieldError(index,key)}<span class="field-error" role="alert" id={`line-error-${index}-${key}`}>{lineFieldError(index,key)}</span>{/if}{/snippet}
        {#if data.module?.slug==='team'}<div class="notice info"><div>Für ein vorläufiges Beschäftigtenprofil genügen Name und gegebenenfalls der persönliche Zugang. Ein bestätigtes Arbeitsmodell benötigt zusätzlich Beginn, Wochenstunden, sieben Tagesstunden und Feiertagsregion. Angaben nur aus den tatsächlichen Personalgrundlagen übernehmen.</div></div>{/if}
        <div class="editor-sections">
          {#each sections as section, index (section.title + "|" + (section.fields[0]?.key || ""))}
            {#if section.optional}<details
                data-editor-section={index}
                class="form-disclosure"
                use:openWhen={sectionOpen(section)}
              >
                <summary
                  ><span>{section.title}</span><span class="disclosure-hint"
                    >Optional</span
                  ><Icon name="down" size={16} /></summary
                >
                <div class="disclosure-body">
                  {#if section.description}<p class="field-help mb">
                      {section.description}
                    </p>{/if}{@render sectionFields(section.fields)}
                </div>
              </details>{:else}<section
                data-editor-section={index}
                class="editor-section"
                aria-label={section.title || undefined}
              >
                {#if section.title}<div class="editor-section-heading">
                    <h3>{section.title}</h3>
                    {#if section.description}<p>{section.description}</p>{/if}
                  </div>{/if}
                {@render sectionFields(section.fields)}
              </section>{/if}
          {/each}
        </div>
        <div data-editor-lines>
          {#if isDelivery}<DeliveryLines
              {data}
              orderId={values.order_id}
              bind:rows={lines}
            />{:else if frozenOrder}<section class="form-section">
              <h3>Angenommener Leistungsumfang</h3>
              <p class="field-help mt">
                Dieser Auftrag stammt aus einem angenommenen Angebotsstand.
                Kunde, Währung und Positionen bleiben verbindlich. Zusätzliche
                oder geänderte Leistungen werden als eigener Nachtrag geprüft
                und bestätigt.
              </p>
              <div class="action-preview mt">
                {#each lines as line, index}<p class="small">
                    {index + 1}. {line.description}{#if line.line_type === "item"}
                      · {display(line.quantity, "quantity")}
                      {display(line.unit)}{/if}
                  </p>{/each}
              </div>
              <a
                class="btn mt"
                href={"/change-orders?order_id=" + record?.id}
                target="_blank"
                rel="noreferrer"
                >Nachträge zu diesem Auftrag öffnen<Icon
                  name="arrow"
                  size={15}
                /></a
              >
            </section>{:else if hasLines}
            <section class="form-section">
              <h3>Positionen</h3>
              {#if data.module?.slug === "orders"}<p class="field-help mb">
                  Der vereinbarte Nettowert wird aus den ausgewählten Positionen
                  berechnet und beim Speichern verbindlich festgehalten. Ein
                  davon abweichender Gesamtbetrag wird nicht zusätzlich
                  eingegeben.
                </p>{/if}
              <div class="line-items">
                {#each lines as line, index}<div class="line-item">
                    <div class="line-item-header">
                      <span>Position {index + 1}</span><button
                        type="button"
                        class="icon-button"
                        aria-label={`Position ${index + 1} entfernen`}
                        disabled={lines.length === 1 && !!record}
                        title={lines.length === 1 && record
                          ? "Eine gespeicherte Leistungsliste benötigt mindestens eine Position."
                          : undefined}
                        onclick={() => removeLine(index)}
                        ><Icon name="trash" size={16} /></button
                      >
                    </div>
                    <div class="line-fields">
                      <div class="field description">
                        <label for={`line-description-${index}`}
                          >Leistung *</label
                        ><textarea
                          id={`line-description-${index}`}
                          aria-invalid={!!lineFieldError(index,'description')}
                          aria-describedby={lineFieldError(index,'description')?`line-error-${index}-description`:undefined}
                          bind:value={line.description}
                          required
                          style="min-height:70px"></textarea>{@render lineError(index,'description')}
                      </div>
                      <div class="field">
                        <label for={`line-type-${index}`}>Positionsart</label
                        ><select
                          use:searchableSelect={line.line_type}
                          id={`line-type-${index}`}
                          aria-invalid={!!lineFieldError(index,'line_type')}
                          aria-describedby={lineFieldError(index,'line_type')?`line-error-${index}-line_type`:undefined}
                          bind:value={line.line_type}
                          onchange={(event) => {
                            if (event.currentTarget.value !== "item") {
                              line.product_id = undefined;
                              line.price_version_id = undefined;
                              line.cost_unit = undefined;
                              line.optional = false;
                              line.selected = true;
                            }
                          }}
                          ><option value="item">Leistung</option><option
                            value="heading">Überschrift</option
                          ><option value="text">Text</option><option
                            value="subtotal">Zwischensumme</option
                          ></select
                        >{@render lineError(index,'line_type')}
                      </div>
                      {#if !["heading", "text", "subtotal"].includes(line.line_type)}<details
                          class="field description catalog-line"
                          open={!!line.product_id}
                        >
                          <summary class="text-link" style="cursor:pointer"
                            >Produkt oder Leistung mit Preisgrundlage verknüpfen</summary
                          >
                          <div class="field mt">
                            <label for={`line-product-${index}`}
                              >Produkt / Leistung · optional</label
                            ><ReferencePicker
                              id={`line-product-${index}`}
                              bind:value={line.product_id}
                              reference="products"
                              initial={data.lookups.products || []}
                              onchange={() => {
                                line.price_version_id = undefined;
                              }}
                            /><span class="field-help"
                              >Die Artikelzuordnung verbindet Bedarf, Bestellung
                              und tatsächlichen Wareneingang. Eine manuelle
                              Leistung bleibt möglich.</span
                            >
                          </div>
                          {#if selling && line.product_id}<SalesPricePicker
                              prefix={`line-${index}`}
                              productId={line.product_id}
                              priceId={line.price_version_id}
                              quantity={line.quantity}
                              currency={values.currency ||
                                record?.currency ||
                                "EUR"}
                              onapply={(price) => applyPrice(line, price)}
                              onclear={() =>
                                (line.price_version_id = undefined)}
                            />{/if}
                        </details>
                        <div class="field">
                          <label for={`line-quantity-${index}`}>Menge *</label
                          ><input
                            id={`line-quantity-${index}`}
                            aria-invalid={!!lineFieldError(index,'quantity')}
                            aria-describedby={lineFieldError(index,'quantity')?`line-error-${index}-quantity`:undefined}
                            inputmode="decimal"
                            bind:value={line.quantity}
                            required
                          />{@render lineError(index,'quantity')}{#if !lineFieldError(index,'quantity')&&quantityHint(line.quantity)}<span class="field-help">{quantityHint(line.quantity)}</span>{/if}
                        </div>
                        <div class="field">
                          <label for={`line-unit-${index}`}>Einheit *</label
                          ><select
                            use:searchableSelect={line.unit}
                            id={`line-unit-${index}`}
                            aria-invalid={!!lineFieldError(index,'unit')}
                            aria-describedby={lineFieldError(index,'unit')?`line-error-${index}-unit`:undefined}
                            bind:value={line.unit}
                            onchange={() => (line.price_version_id = undefined)}
                            >{#each [{ value: "piece", label: "Stück" }, { value: "mm", label: "mm" }, { value: "m", label: "m" }, { value: "m2", label: "m²" }, { value: "m3", label: "m³" }, { value: "kg", label: "kg" }, { value: "h", label: "Stunde" }, { value: "day", label: "Tag" }, { value: "package", label: "Pauschale" }] as unit}<option
                                value={unit.value}>{unit.label}</option
                              >{/each}</select
                          >{@render lineError(index,'unit')}
                        </div>
                        <div class="field">
                          <label for={`line-price-${index}`}
                            >Einzelpreis netto · {values.currency ||
                              record?.currency ||
                              "EUR"} *</label
                          ><input
                            id={`line-price-${index}`}
                            aria-invalid={!!lineFieldError(index,'unit_price')}
                            aria-describedby={lineFieldError(index,'unit_price')?`line-error-${index}-unit_price`:undefined}
                            inputmode="decimal"
                            bind:value={line.unit_price}
                            oninput={() => (line.price_version_id = undefined)}
                            required
                          />{@render lineError(index,'unit_price')}
                        </div>
                        <div class="field">
                          <label for={`line-tax-${index}`}
                            >Steuersatz · % *</label
                          ><input
                            id={`line-tax-${index}`}
                            aria-invalid={!!lineFieldError(index,'tax_rate')}
                            aria-describedby={lineFieldError(index,'tax_rate')?`line-error-${index}-tax_rate`:undefined}
                            inputmode="decimal"
                            bind:value={line.tax_rate}
                            oninput={() => (line.price_version_id = undefined)}
                            required
                          />{@render lineError(index,'tax_rate')}
                        </div>
                        <details
                          class="field description line-advanced"
                          use:openWhen={!!line.tax_category ||
                            !!lineFieldError(index, "discount_percent") ||
                            !!lineFieldError(index, "cost_unit")}
                        >
                          <summary
                            >{[
                              "Rabatt",
                              ...(data.module?.slug === "invoices"
                                ? ["besonderer Steuerfall"]
                                : []),
                              ...(permitted(data, "finance")
                                ? ["interne Kalkulation"]
                                : []),
                            ].join(", ").replace(/, ([^,]*)$/, " & $1")}</summary
                          >
                          <div class="field-grid">
                            {#if permitted(data, "finance")}<div class="field">
                                <label for={`line-cost-${index}`}
                                  >Geplante Einzelkosten · {values.currency ||
                                    record?.currency ||
                                    "EUR"}</label
                                ><input
                                  id={`line-cost-${index}`}
                                  aria-invalid={!!lineFieldError(index,'cost_unit')}
                                  aria-describedby={lineFieldError(index,'cost_unit')?`line-error-${index}-cost_unit`:undefined}
                                  inputmode="decimal"
                                  bind:value={line.cost_unit}
                                />{@render lineError(index,'cost_unit')}<span class="field-help"
                                  >Interne Kalkulationsgrundlage je Einheit.
                                  Leer bedeutet unbekannt. Dies ist keine
                                  Verbrauchs- oder Lohnbuchung.</span
                                >
                              </div>{/if}
                            <div class="field">
                              <label for={`line-discount-${index}`}
                                >Rabatt · %</label
                              ><input
                                id={`line-discount-${index}`}
                                aria-invalid={!!lineFieldError(index,'discount_percent')}
                                aria-describedby={lineFieldError(index,'discount_percent')?`line-error-${index}-discount_percent`:undefined}
                                inputmode="decimal"
                                bind:value={line.discount_percent}
                              />{@render lineError(index,'discount_percent')}
                            </div>
                            {#if data.module?.slug === "invoices"}<div
                                class="field description"
                              >
                                <label for={`line-tax-category-${index}`}
                                  >Besonderer Steuerfall dieser Position · optional</label
                                ><select
                                  use:searchableSelect={line.tax_category}
                                  id={`line-tax-category-${index}`}
                                  bind:value={line.tax_category}
                                  ><option value=""
                                    >Kein besonderer Steuerfall</option
                                  ><option value="S">Steuerpflichtig</option><option
                                    value="Z">Nullsatz</option
                                  ><option value="E">Steuerbefreit</option><option
                                    value="AE">Reverse Charge</option
                                  ><option value="K"
                                    >Innergemeinschaftliche Lieferung</option
                                  ><option value="G">Ausfuhr</option><option
                                    value="O">Nicht steuerbar</option
                                  ></select
                                ><span class="field-help"
                                  >Für normale Leistungen mit 19 % oder 7 % leer
                                  lassen. Einen besonderen Steuerfall nur nach
                                  Rücksprache mit der Steuerberatung wählen.</span
                                >
                              </div>
                              {#if line.tax_category && line.tax_category !== "S"}<div
                                  class="field description"
                                >
                                  <label for={`line-tax-reason-${index}`}
                                    >Begründung für die Rechnung (Rechtsgrundlage)</label
                                  ><textarea
                                    id={`line-tax-reason-${index}`}
                                    bind:value={line.tax_exemption_reason}
                                  ></textarea>
                                </div>{/if}{/if}
                          </div>
                        </details>{/if}
                    </div>
                    {#if line.line_type === "item"}<div class="line-options">
                        <label class="check-field"
                          ><input
                            type="checkbox"
                            bind:checked={line.optional}
                          />Optionale Position</label
                        >{#if line.optional}<label class="check-field"
                            ><input
                              type="checkbox"
                              bind:checked={line.selected}
                            />In ausgewähltem Umfang enthalten</label
                          >{/if}
                      </div>{/if}
                  </div>{/each}
              </div>
              <div class="inline-actions mt">
                <button class="btn" type="button" onclick={addLine}
                  ><Icon name="plus" size={16} />Position hinzufügen</button
                >{#if !record && data.module?.slug === "invoices" && values.order_id && !lines.length}<button
                    class="btn"
                    type="button"
                    disabled={orderPrefillBusy}
                    onclick={() => prefillFromOrder(String(values.order_id))}
                    ><Icon name="file" size={16} />Positionen aus Auftrag übernehmen</button
                  >{/if}
              </div>
              <p class="line-note">
                Preise und Steuersätze werden bewusst eingegeben oder
                ausdrücklich aus einem passenden freigegebenen
                Verkaufspreisstand übernommen. Beträge wie 2.400,00 oder
                2400,50 sind möglich. Zwischensummen zeigen die
                ausgewählten Nettopositionen seit der letzten Überschrift oder
                Zwischensumme. Sie werden nicht erneut zur Gesamtsumme addiert.
                Die verbindlichen Beträge werden beim Speichern berechnet und
                geprüft.
              </p>
            </section>
          {/if}
        </div>
        {#if hasLines && !isDelivery && !frozenOrder}<DocumentTotals
            {lines}
            currency={values.currency || record?.currency || "EUR"}
          />{/if}
        {#if assistantDraftModules.includes(data.module?.slug || "")}<DraftReview
            {data}
            {record}
            {values}
            {lines}
          />{/if}
      </div>
      <footer class="modal-footer record-editor-footer">
        {#if autosave}<span
            class="field-help"
            style="margin-right:auto"
            aria-live="polite"
            >{saveLabel || "Bestehender Entwurf · automatisch speichern"}</span
          >{/if}<button
          type="button"
          class="btn"
          disabled={busy}
          onclick={closeEditor}>{autosave ? "Schließen" : "Abbrechen"}</button
        >{#if autosave && autosavePaused && !discardRequested}<button
            class="btn"
            type="button"
            disabled={busy}
            onclick={closeEditor}>Änderungen verwerfen …</button
          >{/if}{#if previousInputs.length}<button
            class="btn"
            type="button"
            disabled={busy}
            onclick={undoAutosave}
            ><Icon name="back" size={15} />Rückgängig</button
          >{/if}<button class="btn primary" type="submit" disabled={busy}
          >{#if busy}<Icon name="refresh" size={16} class="spin" />{:else}<Icon
              name="check"
              size={16}
            />{/if}{busy ? "Wird gespeichert …" : "Speichern"}</button
        >
      </footer>
    </form>
  </div>
</div>

<style>
  .editor-outline {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 24px;
    border-bottom: 1px solid var(--line);
    background: var(--glass-surface, var(--input-surface));
    min-width: 0;
  }
  .editor-outline nav {
    display: flex;
    gap: 4px;
    min-width: 0;
    overflow: auto;
    scrollbar-width: thin;
  }
  .editor-outline nav button {
    flex: none;
    min-height: 44px;
    border-radius: 10px;
    padding: 8px 12px;
    color: var(--muted);
    font-size: 12px;
  }
  .editor-outline nav button:hover {
    background: var(--paper);
    color: var(--forest);
  }
  .editor-outline nav button[aria-current="location"] {
    background: var(--paper);
    color: var(--forest);
    box-shadow: var(--surface-shadow);
    font-weight: 550;
  }
  .required-progress,
  .required-complete {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 34px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }
  .required-progress {
    color: var(--forest);
    text-align: right;
  }
  .required-complete {
    color: var(--success);
  }
  .line-advanced {
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--wash);
    border: 1px solid var(--line-soft, var(--line));
  }
  .line-advanced > summary {
    min-height: 28px;
    font-size: 12px;
    color: var(--muted);
    cursor: pointer;
  }
  .line-advanced[open] > summary {
    margin-bottom: 16px;
  }
  [data-editor-section],
  [data-editor-lines],
  .form-section {
    scroll-margin-top: 16px;
  }
  @media (max-width: 760px) {
    .editor-outline {
      padding: 7px 14px;
      flex-wrap: wrap;
      gap: 0;
    }
    .editor-outline nav {
      width: 100%;
    }
    .editor-outline nav button {
      min-height: 44px;
    }
    .required-progress,
    .required-complete {
      min-height: 28px;
      font-size: 12px;
    }
  }
  .discard-confirmation {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 20px;
    background: var(--wash);
  }
  .discard-confirmation h3 {
    font-size: 16px;
    margin: 0 0 8px;
  }
  .discard-confirmation p {
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 16px;
  }
  .discard-confirmation:focus {
    outline: 2px solid var(--forest);
    outline-offset: 3px;
  }

  .record-editor-footer > .btn {
    flex-shrink: 0;
    overflow-wrap: normal;
    word-break: normal;
    white-space: normal;
    min-width: 90px;
  }
  .record-editor-footer > .field-help {
    flex: 1 1 180px;
    min-width: 0;
  }
  @media (max-width: 600px) {
    .record-editor-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .record-editor-footer > .field-help {
      flex-basis: 100%;
      margin: 0 !important;
    }
    .record-editor-footer > .btn {
      flex: 1 1 130px;
      min-height: 48px;
    }
    .record-editor-footer > .btn.primary {
      flex-basis: 100%;
    }
  }
</style>
