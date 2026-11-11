import { z } from "zod";
import type { ManufacturerLookupItem, ManufacturerLookupSource } from "./manufacturer-lookup.js";

export const manufacturerCatalogSearchSchema = z.strictObject({
  query: z.string().trim().max(300).default(""),
  providerId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/).optional(),
  offset: z.number().int().min(0).max(50_000).default(0),
});

export type ManufacturerCatalogCoverage = "articles" | "index" | "partner" | "website" | "unresolved";

export interface ManufacturerCatalogSource {
  id: string;
  name: string;
  group: string;
  website: string | null;
  coverage: ManufacturerCatalogCoverage;
  online: boolean;
  count: number;
  checkedAt: string | null;
  digest?: string;
  state: "current" | "unavailable" | "reference";
}

export interface ManufacturerCatalogEntry extends ManufacturerLookupItem {
  id: string;
  providerId: string;
  gtin?: string;
  series?: string;
  discontinued?: boolean;
}

export interface ManufacturerCatalogResult {
  items: ManufacturerCatalogEntry[];
  total: number;
  nextOffset: number | null;
  providers: ManufacturerCatalogSource[];
  checkedAt: string | null;
  storage: "private_blob" | "temporary";
  lookupNotice?: string;
  siteSearch?: string;
  lookupSources?: ManufacturerLookupSource[];
  searchedProviderId?: string;
}
