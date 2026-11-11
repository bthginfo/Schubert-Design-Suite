import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { get, put } from "@vercel/blob";
import {
  canSearchPlanningProducts, manufacturerCatalogSearchSchema,
  type ActorContext, type ManufacturerCatalogEntry, type ManufacturerCatalogResult, type ManufacturerCatalogSource,
  type ManufacturerLookupItem,
} from "@schubert/contracts";
import { DomainError, requireRule } from "@schubert/domain";
import { cachePublicCatalog } from "./manufacturer-lookup-cache.js";
import { searchManufacturerProducts } from "./manufacturer-lookup.js";
import { catalogProviderById, catalogProviders, type CatalogProvider } from "./manufacturer-catalog-sources.js";
import { canCollectCatalog, collectManufacturerSource, manufacturerSourceFailure, type ManufacturerSourceSnapshot } from "./manufacturer-catalog-collect.js";

export interface ManufacturerCatalogSnapshot {
  version: 1;
  checkedAt: string | null;
  month: string | null;
  sources: Record<string, ManufacturerSourceSnapshot>;
}
type SnapshotRead = { value: ManufacturerCatalogSnapshot; etag: string };
type AvailableCatalog = { snapshot: ManufacturerCatalogSnapshot; storage: ManufacturerCatalogResult["storage"] };
type Search = ReturnType<typeof manufacturerCatalogSearchSchema.parse>;

const path = "system/manufacturer-catalog/v1/catalog.json.gz";
const limitCompressed = 12 * 1024 * 1024;
const limitExpanded = 34 * 1024 * 1024;
const pageSize = 24;
const compareName = new Intl.Collator("de-DE", { numeric: true }).compare;
const cacheTime = 60 * 60 * 1000;
const retryDelay = 45 * 60 * 1000;
const automatedProviderIds = catalogProviders.filter(provider => canCollectCatalog(provider.id)).map(provider => provider.id);
let hot: { value: AvailableCatalog; expires: number } | undefined;
let opening: Promise<AvailableCatalog> | undefined;

export function emptyManufacturerCatalog(): ManufacturerCatalogSnapshot {
  return { version: 1, checkedAt: null, month: null, sources: {} };
}

export async function refreshManufacturerSources(
  previous: ManufacturerCatalogSnapshot,
  now: Date,
  collect = collectManufacturerSource,
  ids = automatedProviderIds,
): Promise<ManufacturerCatalogSnapshot> {
  const checkedAt = now.toISOString();
  const sources = { ...previous.sources };
  for (let start = 0; start < ids.length; start += 4) {
    await Promise.all(ids.slice(start, start + 4).map(async id => {
      const last = sources[id];
      try {
        const next = await collect(id, now);
        if (last?.items.length && next.items.length < last.items.length / 2) {
          throw new Error("Ungewöhnlich starker Rückgang im Herstellerverzeichnis.");
        }
        sources[id] = last?.digest === next.digest ? { ...next, items: last.items } : next;
      } catch (error) {
        sources[id] = {
          items: last?.items ?? [],
          digest: last?.digest ?? "",
          checkedAt: last?.checkedAt ?? null,
          attemptedAt: checkedAt,
          state: "unavailable",
          failure: manufacturerSourceFailure(error),
          sourceUrl: last?.sourceUrl ?? catalogProviderById.get(id)?.website ?? "",
        };
      }
    }));
  }
  return { version: 1, checkedAt, month: checkedAt.slice(0, 7), sources };
}

async function readSnapshot(token: string): Promise<SnapshotRead | null> {
  const stored = await get(path, { access: "private", token, useCache: false });
  if (!stored) return null;
  if (stored.statusCode !== 200 || stored.blob.size > limitCompressed || !stored.blob.etag) {
    throw new Error("Gespeicherter Katalog ist nicht lesbar.");
  }
  const reader = stored.stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limitCompressed) throw new Error("Gespeicherter Katalog ist zu groß.");
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const decoded: ManufacturerCatalogSnapshot = JSON.parse(
    gunzipSync(Buffer.concat(chunks, length), { maxOutputLength: limitExpanded }).toString("utf8"),
  );
  if (decoded.version !== 1 || !decoded.sources ||
      Object.entries(decoded.sources).some(([id, source]) =>
        !catalogProviderById.has(id) || !Array.isArray(source.items) || source.items.some(item => item.providerId !== id))) {
    throw new Error("Gespeicherter Katalog hat ein ungültiges Format.");
  }
  return { value: decoded, etag: stored.blob.etag };
}

function remember(snapshot: ManufacturerCatalogSnapshot, storage: AvailableCatalog["storage"]) {
  const value = { snapshot, storage };
  hot = { value, expires: Date.now() + cacheTime };
  return value;
}

async function storeCatalog(token: string, previous: SnapshotRead | null, now: Date) {
  const month = now.toISOString().slice(0, 7);
  const ids = dueManufacturerSources(previous?.value ?? null, now);
  if (previous && !ids.length) return { snapshot: previous.value, alreadyChecked: true };
  const snapshot = await refreshManufacturerSources(previous?.value ?? emptyManufacturerCatalog(), now, collectManufacturerSource, ids);
  if (!Object.values(snapshot.sources).some(source => source.items.length)) {
    throw new DomainError("MANUFACTURER_CATALOG_UNAVAILABLE", "Der Katalog konnte keine Herstellerdaten abrufen.", 503);
  }
  const json = JSON.stringify(snapshot);
  if (Buffer.byteLength(json) > limitExpanded) throw new Error("Der aktualisierte Katalog ist zu groß.");
  const data = gzipSync(json);
  if (data.byteLength > limitCompressed) throw new Error("Der aktualisierte Katalog ist zu groß.");
  try {
    await put(path, data, {
      access: "private",
      token,
      contentType: "application/gzip",
      addRandomSuffix: false,
      ...(previous ? { allowOverwrite: true, ifMatch: previous.etag } : { allowOverwrite: false }),
    });
  } catch (error) {
    const concurrent = await readSnapshot(token).catch(() => null);
    if (concurrent?.value.month === month && concurrent.etag !== previous?.etag &&
        !dueManufacturerSources(concurrent.value, now).some(id => ids.includes(id))) {
      return { snapshot: concurrent.value, alreadyChecked: true };
    }
    throw error;
  }
  return { snapshot, alreadyChecked: false };
}

export function dueManufacturerSources(snapshot: ManufacturerCatalogSnapshot | null, now: Date) {
  if (!snapshot || snapshot.month !== now.toISOString().slice(0, 7)) return automatedProviderIds;
  return automatedProviderIds.filter(id => {
    const source = snapshot.sources[id];
    return !source || (source.state === "unavailable" && now.getTime() - Date.parse(source.attemptedAt) >= retryDelay);
  });
}

export async function reconcileManufacturerCatalog() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  requireRule(token, "MANUFACTURER_CATALOG_STORAGE", "Der private Katalogspeicher ist noch nicht eingerichtet.", 503);
  const result = await storeCatalog(token!, await readSnapshot(token!), new Date());
  const { snapshot } = remember(result.snapshot, "private_blob");
  const sources = Object.entries(snapshot.sources);
  return {
    status: result.alreadyChecked ? "already_checked" : "checked",
    checkedAt: snapshot.checkedAt,
    providers: sources.length,
    articlesAndReferences: sources.reduce((sum, [, source]) => sum + source.items.length, 0),
    articles: sources.reduce((sum, [, source]) => sum + source.items.filter(item => item.articleKind === "article").length, 0),
    unavailable: sources.filter(([, source]) => source.state === "unavailable").map(([id]) => id),
    failures: Object.fromEntries(sources.filter(([, source]) => source.failure).map(([id, source]) => [id, source.failure])),
  };
}

export async function availableManufacturerCatalog(): Promise<AvailableCatalog> {
  if (hot && hot.expires > Date.now()) return hot.value;
  if (opening) return opening;
  opening = (async () => {
    const token = process.env.VERCEL === "1" ? process.env.BLOB_READ_WRITE_TOKEN?.trim() : undefined;
    if (token) {
      const existing = await readSnapshot(token);
      if (existing) return remember(existing.value, "private_blob");
      const first = await storeCatalog(token, null, new Date());
      return remember(first.snapshot, "private_blob");
    }
    return remember(await refreshManufacturerSources(emptyManufacturerCatalog(), new Date()), "temporary");
  })();
  try {
    return await opening;
  } finally {
    opening = undefined;
  }
}

function words(value: string) {
  return value.toLocaleLowerCase("de-DE").replaceAll("ä", "ae").replaceAll("ö", "oe")
    .replaceAll("ü", "ue").replaceAll("ß", "ss").normalize("NFKD")
    .replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}

const providerAliases = [
  ...catalogProviders.flatMap(provider => [provider.name, provider.id].map(name => ({ id: provider.id, name: words(name) }))),
  { id: "hansgrohe", name: "axor" },
  { id: "antoniolupi", name: "antonio lupi" },
  { id: "ideagroup", name: "idea group" },
  { id: "wall-deco", name: "wall and deco" },
].sort((a, b) => b.name.length - a.name.length);

export function catalogSearchTarget(input: Search) {
  const text = words(input.query);
  const phrase = " " + text + " ";
  const aliases = input.providerId ? providerAliases.filter(item => item.id === input.providerId) : providerAliases;
  const alias = aliases.find(item => phrase.startsWith(" " + item.name + " ")) ??
    aliases.find(item => catalogProviderById.get(item.id)?.nativeSearch && phrase.includes(" " + item.name + " "));
  return {
    id: input.providerId ?? alias?.id,
    term: alias ? phrase.replace(" " + alias.name + " ", " ").trim() : text,
    brand: alias?.name === "axor" ? "AXOR" : undefined,
  };
}

function indexEntry(item: ManufacturerCatalogEntry) {
  return {
    item,
    name: words(item.name),
    code: words(item.article).replaceAll(" ", ""),
    text: words([item.manufacturer, item.name, item.article, item.gtin, item.variant, item.series].filter(Boolean).join(" ")),
  };
}

const searchIndexes = new WeakMap<ManufacturerCatalogEntry[], ReturnType<typeof indexEntry>[]>();
const allSourceItems = new WeakMap<ManufacturerCatalogSnapshot, ManufacturerCatalogEntry[]>();

function pageOf(items: ManufacturerCatalogEntry[], term: string, offset: number, brand?: string) {
  let index = searchIndexes.get(items);
  if (!index) {
    index = items.map(indexEntry).sort((a, b) =>
      Number(!!a.item.discontinued) - Number(!!b.item.discontinued) ||
      compareName(a.item.name, b.item.name) || a.item.id.localeCompare(b.item.id));
    searchIndexes.set(items, index);
  }
  const tokens = term ? term.split(" ") : [];
  const code = tokens.join("");
  const exact: ManufacturerCatalogEntry[] = [];
  const named: ManufacturerCatalogEntry[] = [];
  const prefix: ManufacturerCatalogEntry[] = [];
  const matching: ManufacturerCatalogEntry[] = [];
  for (const row of index) {
    if (brand && row.item.manufacturer !== brand) continue;
    if (term && (code === row.code || code === row.item.gtin)) exact.push(row.item);
    else if (term && row.name === term) named.push(row.item);
    else if (term && row.name.startsWith(term + " ")) prefix.push(row.item);
    else if (tokens.every(token => row.text.includes(token))) matching.push(row.item);
  }
  const filtered = exact.concat(named, prefix, matching);
  return {
    items: filtered.slice(offset, offset + pageSize),
    total: filtered.length,
    nextOffset: offset + pageSize < filtered.length ? offset + pageSize : null,
  };
}

function directoryFor(snapshot: ManufacturerCatalogSnapshot): ManufacturerCatalogSource[] {
  return catalogProviders.map(provider => {
    const source = snapshot.sources[provider.id];
    return {
      id: provider.id,
      name: provider.name,
      group: provider.group,
      website: provider.website,
      coverage: provider.coverage,
      online: !!provider.nativeSearch || canCollectCatalog(provider.id),
      count: source?.items.length ?? 0,
      checkedAt: source?.checkedAt ?? null,
      ...(source?.digest ? { digest: source.digest } : {}),
      state: source?.state ?? "reference",
    };
  });
}

function permitted(ctx: ActorContext) {
  requireRule(canSearchPlanningProducts(ctx.permissions), "FORBIDDEN", "Der Herstellerkatalog ist für diesen Zugang nicht freigegeben.", 403);
}

function verifyProvider(id: string | undefined) {
  const provider = id ? catalogProviderById.get(id) : undefined;
  requireRule(!id || provider, "MANUFACTURER_SOURCE", "Bitte einen Hersteller aus dem Verzeichnis wählen.", 422);
  return provider;
}

export async function searchManufacturerCatalog(ctx: ActorContext, payload: unknown): Promise<ManufacturerCatalogResult> {
  permitted(ctx);
  const input = manufacturerCatalogSearchSchema.parse(payload);
  const { id, term, brand } = catalogSearchTarget(input);
  verifyProvider(id);
  const { snapshot, storage } = await availableManufacturerCatalog();
  let allItems = allSourceItems.get(snapshot);
  if (!id && !allItems) {
    allItems = Object.values(snapshot.sources).flatMap(source => source.items);
    allSourceItems.set(snapshot, allItems);
  }
  const items = id ? snapshot.sources[id]?.items ?? [] : allItems ?? [];
  return { ...pageOf(items, term, input.offset, brand), providers: directoryFor(snapshot), checkedAt: snapshot.checkedAt, storage, searchedProviderId: id };
}

function onlineItem(item: ManufacturerLookupItem, provider: CatalogProvider | undefined): ManufacturerCatalogEntry {
  const providerId = provider?.id ?? (item.manufacturer === "AXOR" ? "hansgrohe" : words(item.manufacturer));
  return { ...item, providerId, id: providerId + ":" + createHash("sha256").update(item.sourceUrl + "#" + item.article).digest("hex").slice(0, 24) };
}

export async function searchManufacturerCatalogOnline(ctx: ActorContext, payload: unknown): Promise<ManufacturerCatalogResult> {
  permitted(ctx);
  const input = manufacturerCatalogSearchSchema.parse(payload);
  requireRule(input.query.length >= 2, "MANUFACTURER_QUERY", "Bitte Produktname, Artikelnummer oder Produktlink eingeben.", 422);
  const { id, term } = catalogSearchTarget(input);
  const provider = verifyProvider(id);
  const empty = emptyManufacturerCatalog();
  const resultBase = { checkedAt: null, storage: "temporary" as const, providers: directoryFor(empty), searchedProviderId: id };
  if (provider?.nativeSearch || (!provider && /^(?:https?:\/\/|www\.|catalog\.|pro\.|\d{5,})/i.test(input.query))) {
    const phrase = " " + words(input.query) + " ";
    const query = provider && !/^(?:https?:\/\/|www\.|catalog\.|pro\.)/i.test(input.query) && !providerAliases.some(alias =>
      alias.id === provider.id && phrase.includes(" " + alias.name + " "))
      ? (provider.id === "hansgrohe" ? "hansgrohe" : provider.name) + " " + input.query : input.query;
    const native = await searchManufacturerProducts(ctx, { query });
    const items = native.items.map(item => onlineItem(item, provider));
    return { ...resultBase, items, total: items.length, nextOffset: null, lookupSources: native.sources };
  }
  if (!provider || !canCollectCatalog(provider.id)) {
    const siteSearch = provider?.website && provider.coverage !== "unresolved" && term
      ? "https://www.google.com/search?" + new URLSearchParams({
          q: "site:" + new URL(provider.website).hostname.replace(/^www\./, "") + " " + term,
        }) : undefined;
    return {
      ...resultBase,
      items: [], total: 0, nextOffset: null,
      siteSearch,
      lookupNotice: !provider
        ? "Wählen Sie einen Hersteller für die Suche oder fügen Sie einen Produktlink ein."
        : provider.coverage === "unresolved"
          ? "Die Herstelleridentität ist noch nicht eindeutig bestätigt."
          : "Für diese Quelle stehen die Herstellerseite und eine auf deren Domain begrenzte Websuche zur Verfügung.",
    };
  }
  try {
    const source = await cachePublicCatalog("manufacturer-catalog-online:" + provider.id, () => collectManufacturerSource(provider.id));
    return {
      ...resultBase,
      ...pageOf(source.items, term, input.offset),
      providers: directoryFor({ ...empty, sources: { [provider.id]: source } }),
      checkedAt: source.checkedAt,
    };
  } catch {
    return { ...resultBase, items: [], total: 0, nextOffset: null, lookupNotice: "Die Herstellerquelle ist gerade nicht abrufbar." };
  }
}
