import { z } from "zod";
import { calendarDate, shiftCalendarDate } from "./dispatch-calendar.js";
import { moduleBySlug } from "./modules.js";

const privateScreens = new Set([
  "team", "leave", "time", "time-openings", "time-adjustments", "settings", "account",
  "audit", "users", "manufacturer-assets", "bank-accounts", "bank-transactions",
  "bank-imports", "jobs", "cutovers", "imports", "price-imports", "notifications",
]);

export function assistantPrivateScreen(slug: string) {
  const module = moduleBySlug(slug);
  return privateScreens.has(slug) || !!module?.hr || module?.permission === "hr";
}

const germanMonths = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
const namedDate = new RegExp(String.raw`\b(\d{1,2})\.\s*(${germanMonths.join("|")}|maerz)\s+(\d{4})\b`, "giu");
export function assistantRequestDay(message: string, today?: string) {
  const dates = new Set<string>();
  const add = (year: string, month: string, day: string) => {
    const date = year + "-" + month.padStart(2, "0") + "-" + day.padStart(2, "0");
    if (calendarDate(date)) dates.add(date);
  };
  for (const [, year, month, day] of message.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) add(year, month, day);
  for (const [, day, month, year] of message.matchAll(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\b/g)) add(year, month, day);
  for (const [, day, month, year] of message.matchAll(namedDate))
    add(year, String(germanMonths.indexOf(month.toLowerCase().replace("maerz", "märz")) + 1), day);
  if (!dates.size && calendarDate(today)) {
    const relative = message.replace(/\bam Morgen\b/gi, "").match(/(?<!\p{L})(übermorgen|morgen|heute)(?!\p{L})/giu) ?? [];
    for (const word of relative) dates.add(shiftCalendarDate(today, ["heute", "morgen", "übermorgen"].indexOf(word.toLowerCase())));
  }
  return dates.size === 1 ? [...dates][0] : undefined;
}

export const assistantSuiteAreas = [
  "customers", "suppliers", "contacts", "addresses", "sites", "graves", "cemeteries",
  "inquiries", "quotes", "orders", "work-packages", "change-orders", "deliveries",
  "acceptances", "defects", "invoices", "supplier-invoices", "receivables", "payables",
  "payments", "purchase-orders", "products", "manufacturers", "stock", "stock-locations", "tasks",
  "dispatch", "team", "resources", "documents", "studio", "reports",
] as const;
export type AssistantSuiteArea = typeof assistantSuiteAreas[number];

const day = z.string().refine(calendarDate).nullable();
export const suiteLookupSchema = z.strictObject({
  area: z.enum(assistantSuiteAreas),
  query: z.string().trim().min(1).max(120).nullable(),
  status: z.string().regex(/^[a-z][a-z0-9_]{0,29}$/).nullable(),
  from: day,
  to: day,
  details: z.boolean(),
}).refine(({ area, from, to }) => !from || !to ||
  (from <= to && (!["dispatch", "team"].includes(area) || Date.parse(to) - Date.parse(from) <= 42 * 86400000)));

export const dispatchLookupSchema = z.strictObject({
  person: z.string().trim().min(1).max(120),
  order: z.string().trim().min(1).max(120),
});

export type AssistantRecordLink = { href: string; label: string; area: AssistantSuiteArea };

export type AssistantPlanBinding = {
  variantId: string;
  projectId: string;
  revisionId: string;
  baseVersion: number;
  contentHash: string;
  label: string;
  href: string;
};
