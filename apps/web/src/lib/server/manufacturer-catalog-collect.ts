import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { load } from "cheerio/slim";
import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";
import type { ManufacturerCatalogEntry } from "@schubert/contracts";
import { catalogIndexes, catalogProviderById, type CatalogIndex, type CatalogProvider } from "./manufacturer-catalog-sources.js";

export interface ManufacturerSourceSnapshot {
  items: ManufacturerCatalogEntry[];
  digest: string;
  checkedAt: string | null;
  attemptedAt: string;
  state: "current" | "unavailable";
  sourceUrl: string;
}

const userAgent = "SchubertDesignSuite/1.0 (manufacturer catalog)";
const maximumSourceBytes = 8 * 1024 * 1024;
const maximumRows = 30_000;
const keucoDirectory = "https://www.keuco.com/de_de/fachpartner/downloads/";
const keucoProductIndex = "https://www.keuco.com/de_de/produkte/";
const keucoPackage = /^\/content\/dam\/keuco-cms\/global\/website\/download\/artikelstammdaten\/[^/]+\/[^/]*CSV_GESAMT_DGH[^/]*\.zip$/i;
const sanitize = (value: string | undefined, max = 175) => (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
export const canCollectCatalog = (providerId: string) => providerId === "keuco" || !!catalogIndexes[providerId];
export const catalogDigest = (items: ManufacturerCatalogEntry[]) => createHash("sha256").update(JSON.stringify(items)).digest("hex");

function sameSiteUrl(raw: string | undefined, base: string, host: string): URL | null {
  if (!raw || raw.length > 600) return null;
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "https:" || url.hostname !== host || url.port || url.username ||
        url.password || /%(?:2f|5c)/i.test(url.pathname)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

async function fetchBytes(url: string, max = maximumSourceBytes, accept = "text/html,application/xml,text/xml,application/gzip,application/zip") {
  const target = new URL(url);
  const signal = AbortSignal.timeout(8_000);
  let response = await fetch(target, { signal, redirect: "manual", headers: { accept, "user-agent": userAgent } });
  if (response.status >= 300 && response.status < 400) {
    const next = sameSiteUrl(response.headers.get("location") ?? undefined, target.href, target.hostname);
    await response.body?.cancel();
    if (!next) throw new Error("Herstellerquelle hat eine externe Weiterleitung.");
    response = await fetch(next, { signal, redirect: "error", headers: { accept, "user-agent": userAgent } });
  }
  if (!response.ok || !response.body || Number(response.headers.get("content-length")) > max) {
    await response.body?.cancel();
    throw new Error("Herstellerquelle nicht verfügbar.");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > max) throw new Error("Herstellerquelle überschreitet die erwartete Größe.");
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks, bytes);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

async function fetchText(url: string) {
  const raw = await fetchBytes(url);
  const bytes = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw, { maxOutputLength: maximumSourceBytes }) : raw;
  return new TextDecoder().decode(bytes);
}

function titleFromPath(url: URL, article?: string) {
  const last = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  let title: string;
  try { title = decodeURIComponent(last); } catch { return ""; }
  title = title.replace(/\.html?$/i, "").replace(/^articledetail-/i, "");
  if (article && title.endsWith("-" + article)) title = title.slice(0, -article.length - 1);
  title = sanitize(title.replace(/[-_]+/g, " "));
  return title.length ? title[0].toLocaleUpperCase("de-DE") + title.slice(1) : "";
}

function makeId(provider: string, key: string) {
  return provider + ":" + createHash("sha256").update(key).digest("hex").slice(0, 24);
}

async function collectIndex(provider: CatalogProvider, index: CatalogIndex) {
  const origin = new URL(index.url);
  const productHost = index.productHost ?? origin.hostname;
  let links: { raw: string; title: string }[];
  const page = await fetchText(index.url);

  if (index.type === "page") {
    const $ = load(page);
    links = $(index.linkSelector ?? "a[href]").toArray().map(element => ({
      raw: $(element).attr("href") ?? "",
      title: sanitize($(element).text()).replace(/\s+(?:ansehen|entdecken|discover more)$/i, ""),
    }));
  } else {
    const $ = load(page, { xml: true });
    if (index.children) {
      const children = $("sitemap > loc").toArray()
        .map(element => sameSiteUrl($(element).text().trim(), origin.origin, origin.hostname))
        .filter((url): url is URL => !!url && index.children!.test(url.pathname + url.search));
      const unique = [...new Set(children.map(url => url.href))];
      if (!unique.length || unique.length > (index.maxChildren ?? 6)) throw new Error("Produktverzeichnisse weichen vom erwarteten Umfang ab.");
      links = [];
      for (const child of unique) {
        const childXml = load(await fetchText(child), { xml: true });
        const entries = childXml("url > loc").toArray();
        if (!entries.length) throw new Error("Ein Produktverzeichnis fehlt.");
        links.push(...entries.map(element => ({ raw: childXml(element).text().trim(), title: "" })));
      }
    } else {
      links = $("url > loc").toArray().map(element => ({ raw: $(element).text().trim(), title: "" }));
    }
  }

  const byUrl = new Map<string, ManufacturerCatalogEntry>();
  for (const link of links) {
    const url = sameSiteUrl(link.raw, origin.origin, productHost);
    if (!url || !index.paths.test(url.pathname)) continue;
    if (!index.allowQuery) url.search = "";
    const article = index.article?.exec(url.pathname)?.[1] ?? "";
    const name = link.title || titleFromPath(url, article);
    if (!name || (index.kind === "article" && !article)) continue;
    const manufacturer = provider.id === "hansgrohe" ? (/^axor\b/i.test(name) ? "AXOR" : "hansgrohe") : provider.name;
    const key = article || url.pathname.replace(/\/$/, "") + url.search;
    const item: ManufacturerCatalogEntry = {
      id: makeId(provider.id, key),
      providerId: provider.id,
      manufacturer,
      name,
      article,
      articleKind: index.kind,
      sourceUrl: url.href,
      dimensions: [],
    };
    const known = byUrl.get(key);
    if (!known || (!known.name.includes(" ") && link.title.includes(" "))) byUrl.set(key, item);
  }
  return [...byUrl.values()];
}

function dateFromCsv(value: string | undefined) {
  if (!value || !/^\d{8}$/.test(value)) return null;
  const date = value.slice(4) + "-" + value.slice(2, 4) + "-" + value.slice(0, 2);
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? null : date;
}

function rowsFromCsv<T>(data: Uint8Array, maximum: number) {
  const rows = parse(new TextDecoder("utf-8", { fatal: true }).decode(data), {
    columns: true,
    delimiter: ";",
    bom: true,
    skip_empty_lines: true,
    max_record_size: 40_000,
    to: maximum + 1,
  }) as T[];
  if (rows.length > maximum) throw new Error("Der Katalog enthält mehr Zeilen als erwartet.");
  return rows;
}

type KeucoHead = { DatenlieferantKuerzel?: string; KatalogID?: string; Gueltigkeitsbeginn?: string; Gueltigkeitsende?: string };
type KeucoRow = {
  Werksartikelnummer?: string; GTIN?: string; Kurztext_1?: string; Kurztext_2?: string; URL?: string; Serie?: string;
  Laenge_mm?: string; Breite_mm?: string; Hoehe_mm?: string; Loeschartikelkennzeichen?: string; Auslaufartikel?: string;
};

function catalogueLength(value: string | undefined) {
  if (!value || !/^\d{1,5}(?:[,.]\d{1,3})?$/.test(value) || Number(value.replace(",", ".")) <= 0) return null;
  return value.replace(".", ",") + " mm";
}

function keucoRecords(files: Record<string, Uint8Array>, today: string): ManufacturerCatalogEntry[] | null {
  if (!files["artikel.csv"] || !files["kopfdaten.csv"]) throw new Error("Artikel- oder Kopfdaten fehlen.");
  const [head] = rowsFromCsv<KeucoHead>(files["kopfdaten.csv"], 3);
  const start = dateFromCsv(head?.Gueltigkeitsbeginn);
  const end = dateFromCsv(head?.Gueltigkeitsende);
  if (!start || !end || head.DatenlieferantKuerzel !== "KE" || !head.KatalogID?.includes(":DE:")) {
    throw new Error("Der Datensatz ist kein zuordenbarer deutscher KEUCO-Katalog.");
  }
  if (today < start || today > end) return null;
  const rows = rowsFromCsv<KeucoRow>(files["artikel.csv"], maximumRows);
  if (rows.length < 500 || !("Werksartikelnummer" in rows[0]) || !("Kurztext_1" in rows[0])) {
    throw new Error("Der Artikelbestand weicht vom erwarteten Export ab.");
  }
  const result = new Map<string, ManufacturerCatalogEntry>();
  for (const row of rows) {
    const article = row.Werksartikelnummer?.trim() ?? "";
    const name = sanitize(row.Kurztext_1);
    if (!/^[A-Z0-9][A-Z0-9 ._-]{2,31}$/i.test(article) || !name ||
        /^(?:true|1|ja|x)$/i.test(row.Loeschartikelkennzeichen?.trim() ?? "")) continue;
    const link = sameSiteUrl(row.URL, keucoProductIndex, "www.keuco.com");
    const dimensions = [
      ["Länge laut Stammdaten", row.Laenge_mm],
      ["Breite laut Stammdaten", row.Breite_mm],
      ["Höhe laut Stammdaten", row.Hoehe_mm],
    ].flatMap(([label, raw]) => {
      const value = catalogueLength(raw);
      return value ? [{ label: label!, value }] : [];
    });
    const gtin = row.GTIN?.trim();
    const series = sanitize(row.Serie, 90);
    const variant = sanitize(row.Kurztext_2);
    result.set(article, {
      id: makeId("keuco", article),
      providerId: "keuco",
      manufacturer: "KEUCO",
      name,
      article,
      articleKind: "article",
      sourceUrl: link?.href ?? keucoProductIndex,
      planningDataUrl: keucoDirectory,
      dimensions,
      ...(gtin && /^\d{8,14}$/.test(gtin) ? { gtin } : {}),
      ...(series ? { series } : {}),
      ...(variant ? { variant } : {}),
      ...(/^(?:true|1|ja|x)$/i.test(row.Auslaufartikel?.trim() ?? "") ? { discontinued: true } : {}),
    });
  }
  if (result.size < 500 || result.size < rows.length / 2) throw new Error("Der KEUCO-Export enthält zu wenige gültige Artikel.");
  return [...result.values()];
}

async function collectKeuco(today: string) {
  const $ = load(await fetchText(keucoDirectory));
  const urls = [...new Set($("a[href]").toArray()
    .map(element => sameSiteUrl($(element).attr("href"), keucoDirectory, "www.keuco.com"))
    .filter((url): url is URL => !!url && keucoPackage.test(url.pathname))
    .map(url => url.href))];
  for (const url of urls.slice(0, 4)) {
    const raw = await fetchBytes(url, 5 * 1024 * 1024, "application/zip,application/octet-stream");
    if (raw[0] !== 0x50 || raw[1] !== 0x4b) throw new Error("Der Hersteller liefert kein ZIP-Archiv.");
    let expanded = 0;
    const files = unzipSync(raw, { filter: file => {
      if (!["artikel.csv", "kopfdaten.csv"].includes(file.name)) return false;
      expanded += file.originalSize;
      if (expanded > 12 * 1024 * 1024) throw new Error("Die ausgewählten CSV-Dateien sind zu groß.");
      return true;
    } });
    const items = keucoRecords(files, today);
    if (items) return { items, sourceUrl: url };
  }
  throw new Error("Es wurde keine aktuell gültige KEUCO-Datei gefunden.");
}

export async function collectManufacturerSource(providerId: string, now = new Date()): Promise<ManufacturerSourceSnapshot> {
  const provider = catalogProviderById.get(providerId);
  if (!provider || !canCollectCatalog(providerId)) throw new Error("Für diesen Hersteller gibt es keine automatische Bezugsquelle.");
  const checkedAt = now.toISOString();
  const { items, sourceUrl } = providerId === "keuco"
    ? await collectKeuco(checkedAt.slice(0, 10))
    : {
        items: (await Promise.all(catalogIndexes[providerId].map(index => collectIndex(provider, index)))).flat(),
        sourceUrl: catalogIndexes[providerId][0].url,
      };
  const unique = [...new Map(items.map(item => [item.id, item])).values()]
    .sort((a, b) => a.id.localeCompare(b.id, "en"));
  if (!unique.length || unique.length > maximumRows) throw new Error("Das Herstellerverzeichnis liefert keine brauchbaren Einträge.");
  return { items: unique, digest: catalogDigest(unique), checkedAt, attemptedAt: checkedAt, state: "current", sourceUrl };
}
