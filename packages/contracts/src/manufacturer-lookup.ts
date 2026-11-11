import { z } from "zod";

export const manufacturerLookupLabels = {
  duravit: "Duravit",
  kaldewei: "KALDEWEI",
  hansgrohe: "hansgrohe / AXOR",
  geberit: "Geberit",
} as const;

export type ManufacturerLookupProvider = keyof typeof manufacturerLookupLabels;

export const manufacturerLookupSchema = z.strictObject({
  query: z.string().trim().min(2, "Mindestens zwei Zeichen eingeben.").max(300),
});

export function canSearchPlanningProducts(permissions: readonly string[] = []) {
  return permissions.some(permission => [
    "*", "planning", "planning.read", "planning.*", "catalog", "catalog.read", "catalog.*",
  ].includes(permission));
}

export interface ManufacturerLookupItem {
  manufacturer: string;
  name: string;
  article: string;
  articleKind: "article" | "model" | "product" | "series";
  sourceUrl: string;
  planningDataUrl?: string;
  variant?: string;
  dimensions: { label: string; value: string }[];
}

export interface ManufacturerLookupSource {
  provider: ManufacturerLookupProvider;
  status: "searched" | "unavailable" | "needs_detail";
  url: string;
}

export interface ManufacturerLookupResult {
  items: ManufacturerLookupItem[];
  sources: ManufacturerLookupSource[];
  hasMore: boolean;
}
