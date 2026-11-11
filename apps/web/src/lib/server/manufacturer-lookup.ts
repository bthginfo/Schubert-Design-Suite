import {
  canSearchPlanningProducts, manufacturerLookupLabels, manufacturerLookupSchema,
  type ActorContext, type ManufacturerLookupItem, type ManufacturerLookupProvider,
  type ManufacturerLookupResult, type ManufacturerLookupSource,
} from "@schubert/contracts";
import { DomainError, requireRule } from "@schubert/domain";
import { load } from "cheerio/slim";
import { cachePublicCatalog } from "./manufacturer-lookup-cache.js";

type Provider = ManufacturerLookupProvider;
type Item = ManufacturerLookupItem;
type Catalog = { items: Item[]; hasMore: boolean };
type SourceFormat = "html" | "xml" | "json";
type LoadPage = (url: string, format?: SourceFormat) => Promise<string | null>;

const hosts: Record<Provider, string> = {
  duravit: "www.duravit.com",
  kaldewei: "www.kaldewei.de",
  hansgrohe: "pro.hansgrohe.de",
  geberit: "catalog.geberit.de",
};
const productPaths: Record<Provider, RegExp> = {
  duravit: /^\/de-de\/p\/[a-z0-9%_-]+\/?$/i,
  kaldewei: /^\/produkte\/(?:badewannen|duschflaechen|waschtische|duschrinnen)\/detail\/product\/[a-z0-9%_-]+\/?$/i,
  hansgrohe: /^\/articledetail-[a-z0-9%_-]+-\d{8}\/?$/i,
  geberit: /^\/de-DE\/product\/PRO_\d{1,12}\/?$/,
};
const planningData: Record<Provider, string> = {
  duravit: "https://www.duravit.com/de-de/professionals/downloadcenter/",
  kaldewei: "https://www.kaldewei.de/professionals/3d-und-bim-dateien/",
  hansgrohe: "https://pro.hansgrohe.de/beratung/planungsdaten",
  geberit: "https://www.geberit.de/sanitaer-rohrleitungssysteme/planung-installation/cad-daten/",
};
const directory = {
  duravit: "https://www.duravit.com/de-de/technische-seiten/suchergebnisseite/",
  kaldewei: "https://www.kaldewei.de/volltextsuche/",
  hansgrohe: "https://pro.hansgrohe.de/bad",
  geberit: "https://catalog.geberit.de/de-DE",
};
const searchableProviders = ["duravit", "kaldewei", "hansgrohe"] as const;
const detailsLimit = 3;
const resultLimit = 9;
const providerLimit = 5;
const sourceBytes = 2_500_000;
const cleanText = (value: string, max = 180) => value.replace(/\s+/g, " ").trim().slice(0, max);
const articleToken = (value: string) => value.toUpperCase().replace(/[^\p{L}\d]/gu, "");
const productCode = (url: string) => new URL(url).pathname.match(/-(\d{8})\/?$/)?.[1];
const duravitNumber = (term: string) => term.match(/(?:^|[\s#])(\d{6}(?:[a-z0-9]{4})?)(?=$|[\s,.])/i)?.[1]?.toUpperCase();
const sourceTypes: Record<SourceFormat, string> = {
  html: "text/html", xml: "application/xml,text/xml,text/plain", json: "application/json",
};

function productUrl(value: string | undefined, provider: Provider): string | null {
  if (!value || value.length > 500) return null;
  try {
    const url = new URL(value, "https://" + hosts[provider]);
    if (url.protocol !== "https:" || url.hostname !== hosts[provider] || url.port ||
        url.username || url.password || /%(?:2f|5c)/i.test(url.pathname) ||
        !productPaths[provider].test(url.pathname)) return null;
    return url.origin + url.pathname;
  } catch {
    return null;
  }
}

function withQuery(url: string, key: string, term: string) {
  const target = new URL(url);
  target.searchParams.set(key, term);
  return target.href;
}

function manufacturerDirectory(provider: Provider, term: string) {
  if (!term) return directory[provider];
  if (provider === "duravit") return withQuery(directory.duravit, "q", term);
  if (provider === "kaldewei") return withQuery(directory.kaldewei, "tx_solr[q]", term);
  return directory[provider];
}

function identifySearch(input: ReturnType<typeof manufacturerLookupSchema.parse>) {
  const query = input.query.replace(/\s+/g, " ");
  if (/^(?:https?:\/\/|www\.|catalog\.|pro\.)/i.test(query)) {
    const url = /^https?:\/\//i.test(query) ? query : "https://" + query;
    for (const provider of Object.keys(hosts) as Provider[]) {
      const source = productUrl(url, provider);
      if (source) return { providers: [provider], source, term: "" };
    }
    throw new DomainError("MANUFACTURER_LINK", "Bitte einen deutschen Produktlink von Duravit, KALDEWEI, hansgrohe, AXOR oder Geberit eingeben.", 422);
  }

  const brandMatch = query.match(/\b(duravit|kaldewei|hansgrohe|axor|geberit)\b/i);
  const brand = brandMatch?.[0].toLowerCase();
  const provider = brand === "axor" ? "hansgrohe" : brand as Provider | undefined;
  const term = brandMatch ? query.replace(brandMatch[0], "").replace(/^[\s,:-]+|[\s,:-]+$/g, "").replace(/\s+/g, " ") : query;
  requireRule(term.length >= 2 && term.length <= 150 && /^[\p{L}\p{M}\d .,'’&+()/#_×-]+$/u.test(term),
    "MANUFACTURER_QUERY", "Bitte eine Modellbezeichnung, Artikelnummer oder einen Hersteller-Produktlink eingeben.", 422);
  if (provider) return { providers: [provider], source: null, term };
  if (/^(?:PRO_\d{1,12}|\d{3}\.\d{3}\.[a-z0-9]{2}\.\d)$/i.test(term)) {
    return { providers: ["geberit"] as Provider[], source: null, term };
  }
  return { providers: [...searchableProviders] as Provider[], source: null, term };
}

async function readSource(url: string, format: SourceFormat = "html"): Promise<string | null> {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(5_000),
    headers: {
      accept: sourceTypes[format],
      "accept-language": "de-DE",
      "user-agent": "SchubertDesignSuite/1.0 (manufacturer product lookup)",
    },
  });
  if (response.status === 404) {
    await response.body?.cancel();
    return null;
  }
  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!response.ok || !response.body || !sourceTypes[format].split(",").includes(contentType) ||
      Number(response.headers.get("content-length")) > sourceBytes) {
    await response.body?.cancel();
    throw new Error("Herstellerquelle nicht erreichbar.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > sourceBytes) throw new Error("Herstellerantwort zu groß.");
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function manufacturerItem(provider: Provider, url: string, article: string, name: string, dimensions: Item["dimensions"], variant?: string): Item {
  return {
    manufacturer: provider === "hansgrohe" ? (/^AXOR\b/i.test(name) ? "AXOR" : "hansgrohe") : manufacturerLookupLabels[provider],
    name: cleanText(name),
    article,
    articleKind: provider === "kaldewei" ? "model" : "article",
    sourceUrl: url,
    planningDataUrl: planningData[provider],
    dimensions,
    ...(variant ? { variant: cleanText(variant) } : {}),
  };
}

function productDimensions(description: string) {
  const match = description.match(/^(\d{1,4}(?:[,.]\d+)?)\s*[x×]\s*(\d{1,4}(?:[,.]\d+)?)(?:\s*[x×]\s*(\d{1,4}(?:[,.]\d+)?))?\s*mm\b/i);
  return match ? [{ label: "Abmessungen", value: match.slice(1).filter(Boolean).join(" × ") + " mm" }] : [];
}

function duravitDetail(markup: string, sourceUrl: string): Item[] {
  const $ = load(markup);
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      const product = JSON.parse($(script).text());
      if (product?.["@type"] !== "Product" || typeof product.name !== "string" ||
          typeof product.sku !== "string" || !/^[a-z0-9-]{4,24}$/i.test(product.sku)) continue;
      const description = cleanText($('meta[name="description"]').attr("content") ?? "");
      const dimensions = productDimensions(description);
      return [manufacturerItem("duravit", sourceUrl, product.sku, product.name, dimensions,
        dimensions.length ? description.split(/,\s+/).slice(1).join(", ") : description)];
    } catch {
      // A product page can have other structured markup besides its Product record.
    }
  }
  throw new Error("Duravit-Produktdaten fehlen.");
}

function duravitCards(markup: string, term: string): { items: Item[]; links: string[] } {
  const $ = load(markup);
  if (!$('input[type="search"]').length) throw new Error("Duravit-Suchergebnis fehlt.");
  const needle = duravitNumber(term);
  const matchesArticle = (article: string) => !needle || (needle.length === 6
    ? articleToken(article).slice(0, 6) === needle
    : articleToken(article) === needle);
  const items: Item[] = [];
  for (const number of $(".product-number").toArray()) {
    const card = $(number).parent();
    const anchor = card.find('a[title][href*="/de-de/p/"]').first();
    const url = productUrl(anchor.attr("href"), "duravit");
    const name = cleanText(anchor.text());
    const article = cleanText($(number).text()).replace(/^#\s*/, "");
    if (!url || !name || !/^[a-z0-9-]{4,24}$/i.test(article) ||
        !matchesArticle(article)) continue;
    const description = cleanText(card.find(".product-desc").text());
    const dimensions = productDimensions(description);
    items.push(manufacturerItem("duravit", url, article, name, dimensions,
      dimensions.length ? description.split(/,\s+/).slice(1).join(", ") : description));
  }
  const links = needle && items.length === 0
    ? $('a[href*="/de-de/p/"]').toArray().map(link => productUrl($(link).attr("href"), "duravit"))
      .filter((url): url is string => {
        const article = url && new URL(url).pathname.match(/-(\d{6}[a-z0-9]{4})\/?$/i)?.[1];
        return !!article && matchesArticle(article);
      })
    : [];
  return { items, links: [...new Set(links)].slice(0, detailsLimit) };
}

function kaldeweiDetail(markup: string, sourceUrl: string): Item[] {
  const $ = load(markup);
  const name = cleanText($("h1").first().text());
  if (!name) throw new Error("KALDEWEI-Produktdaten fehlen.");
  const matches = $("option").toArray().flatMap(option => {
    const line = cleanText($(option).text());
    const match = line.match(/^(\d{2,4})\s*[x×]\s*(\d{2,4})(?:\s*[x×]\s*\d{1,4})?\s*\|\s*(\d{2,5}(?:-\d{1,3})?)$/);
    if (!match) return [];
    // The third number on a bath is bowl depth. The first two are the published plan dimensions.
    return [manufacturerItem("kaldewei", sourceUrl, match[3], name,
      [{ label: "Grundmaß", value: match[1] + " × " + match[2] + " mm" }])];
  });
  if (!matches.length) throw new Error("KALDEWEI-Modellvarianten fehlen.");
  return distinct(matches);
}

function hansgroheDetail(markup: string, sourceUrl: string): Item[] {
  const $ = load(markup);
  const article = productCode(sourceUrl);
  const title = cleanText($('meta[property="og:title"]').attr("content") ?? $("title").first().text(), 250);
  if (!article || !title.endsWith(" - " + article)) throw new Error("hansgrohe-Artikelnummer nicht bestätigt.");
  const measurements = new Map<string, string>();
  for (const element of $("li").toArray()) {
    const text = cleanText($(element).text());
    const match = text.match(/^(Ausladung|Auslaufhöhe|Gesamthöhe|Breite|Tiefe):\s*(\d{1,4}(?:[,.]\d+)?)\s*mm$/i);
    if (match) measurements.set(match[1], match[2] + " mm");
  }
  return [manufacturerItem("hansgrohe", sourceUrl, article, title.slice(0, -article.length - 3),
    Array.from(measurements, ([label, value]) => ({ label, value })))];
}

function geberitDetail(markup: string, sourceUrl: string): Item[] {
  const $ = load(markup);
  const name = cleanText($("h1").first().text());
  const labels: Record<string, string> = { B: "Breite", T: "Tiefe", L: "Länge", H: "Höhe" };
  const results: Item[] = [];
  for (const table of $("table").toArray()) {
    const fields = new Map<string, string>();
    for (const row of $(table).find("tr").toArray()) {
      const cells = $(row).children("td,th").toArray();
      if (cells.length === 2) fields.set(cleanText($(cells[0]).text()), cleanText($(cells[1]).text()));
    }
    const article = fields.get("Art.-Nr.");
    if (!name || !article || !/^\d{3}\.\d{3}\.[a-z0-9]{2}\.\d$/i.test(article)) continue;
    const dimensions = Object.entries(labels).flatMap(([axis, label]) => {
      const value = fields.get(axis);
      return value && /^\d{1,4}(?:[.,]\d+)?\s*(?:mm|cm|m)$/.test(value) ? [{ label, value }] : [];
    });
    results.push(manufacturerItem("geberit", sourceUrl, article, name, dimensions, fields.get("Farbe / Oberfläche")));
  }
  if (!results.length) throw new Error("Geberit-Artikelvarianten fehlen.");
  return distinct(results);
}

const parseDetail = {
  duravit: duravitDetail,
  kaldewei: kaldeweiDetail,
  hansgrohe: hansgroheDetail,
  geberit: geberitDetail,
};

function distinct(items: Item[]) {
  return [...new Map(items.map(item => [item.sourceUrl + "#" + item.article, item])).values()];
}

function cap(items: Item[], hasMore = false): Catalog {
  const unique = distinct(items);
  return { items: unique.slice(0, providerLimit), hasMore: hasMore || unique.length > providerLimit };
}

function sitemapLinks(markup: string | null, selector: string) {
  if (!markup) throw new Error("Produktverzeichnis fehlt.");
  const $ = load(markup, { xml: true });
  const links = $(selector).toArray().map(node => $(node).text().trim());
  if (!links.length) throw new Error("Produktverzeichnis ist leer.");
  return links;
}

function indexedWords(value: string) {
  return value.toLowerCase().replaceAll("ä", "ae").replaceAll("ö", "oe")
    .replaceAll("ü", "ue").replaceAll("ß", "ss")
    .normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function findPaths(urls: string[], term: string) {
  const words = indexedWords(term).split(" ").filter(Boolean);
  return urls.filter(url => {
    const path = indexedWords(new URL(url).pathname);
    return words.length > 0 && words.every(word => path.includes(word));
  });
}

async function hansgroheIndex(fetchPage: LoadPage) {
  const markup = await fetchPage("https://pro.hansgrohe.de/sitemap/hpsdesite-article-de_de-eur.xml", "xml");
  return sitemapLinks(markup, "url > loc").map(link => productUrl(link, "hansgrohe"))
    .filter((url): url is string => !!url).slice(0, 4_000);
}

async function hansgroheExact(article: string, fetchPage: LoadPage): Promise<Catalog> {
  const response = await fetchPage(withQuery("https://pro.hansgrohe.de/search/products", "q", article), "json");
  if (response === null) throw new Error("hansgrohe-Artikelsuche fehlt.");
  const result = JSON.parse(response);
  const url = typeof result?.redirectUrl === "string" ? productUrl(result.redirectUrl, "hansgrohe") : null;
  if (url && productCode(url) === article) return cap(await lookupDetails("hansgrohe", url, fetchPage));
  if (Array.isArray(result?.productCodes) && !result.productCodes.includes(article)) return cap([]);
  throw new Error("hansgrohe-Artikelquelle fehlt.");
}

async function kaldeweiIndex(fetchPage: LoadPage) {
  const markup = await fetchPage("https://www.kaldewei.de/sitemap.xml", "xml");
  const indexes = sitemapLinks(markup, "sitemap > loc").filter(link =>
    /^https:\/\/www\.kaldewei\.de\/sitemap\.xml\?sitemap=(?:baths|showers|washbasins|showerchannels)&cHash=[a-f0-9]{32}$/.test(link));
  if (indexes.length < 3 || indexes.length > 4) throw new Error("KALDEWEI-Verzeichnisse fehlen.");
  const entries = await Promise.all(indexes.map(async url => sitemapLinks(await fetchPage(url, "xml"), "url > loc")));
  return [...new Set(entries.flat().map(link => productUrl(link, "kaldewei"))
    .filter((url): url is string => !!url))].slice(0, 500);
}

async function lookupDetails(provider: Provider, url: string, fetchPage: LoadPage): Promise<Item[]> {
  const markup = await fetchPage(url);
  return markup === null ? [] : parseDetail[provider](markup, url);
}

async function fromPaths(provider: Provider, urls: string[], fetchPage: LoadPage, model?: string) {
  const results = await Promise.allSettled(urls.slice(0, detailsLimit).map(url => lookupDetails(provider, url, fetchPage)));
  const items = results.flatMap(result => result.status === "fulfilled" ? result.value : [])
    .filter(item => !model || item.article === model);
  if (!items.length && results.some(result => result.status === "rejected")) {
    throw new Error("Produktdetails konnten nicht gelesen werden.");
  }
  return cap(items, urls.length > detailsLimit);
}

function needsDetail(provider: Provider, term: string) {
  return (provider === "geberit" && !/^PRO_\d{1,12}$/i.test(term)) ||
    (provider === "kaldewei" && /^\d+(?:-\d+)?$/.test(term));
}

async function providerSearch(provider: Provider, term: string, source: string | null, fetchPage: LoadPage, cache: typeof cachePublicCatalog): Promise<Catalog> {
  if (source) return cap(await lookupDetails(provider, source, fetchPage));
  if (provider === "duravit") {
    const markup = await fetchPage(manufacturerDirectory(provider, duravitNumber(term) ?? term));
    if (markup === null) throw new Error("Duravit-Katalog nicht erreichbar.");
    const { items, links } = duravitCards(markup, term);
    return links.length ? fromPaths(provider, links, fetchPage) : cap(items);
  }
  if (provider === "geberit") {
    return cap(await lookupDetails(provider, directory.geberit + "/product/" + term.toUpperCase(), fetchPage));
  }
  if (provider === "hansgrohe") {
    const article = term.match(/(?:^|[\s#])(\d{8})(?=$|[\s,.])/)?.[1];
    if (article) return hansgroheExact(article, fetchPage);
    if (/^#?\d{5,}$/.test(term)) return cap([]);
    const urls = await cache("hansgrohe-de-index", () => hansgroheIndex(fetchPage), true);
    return fromPaths(provider, findPaths(urls, term), fetchPage);
  }
  const model = term.match(/(?:^|\s)(\d{2,5}(?:-\d{1,3})?)$/)?.[1];
  const name = model ? term.slice(0, -model.length).trim().replace(/\s+(?:mod\.?|modell)$/i, "") : term;
  const urls = await cache("kaldewei-de-index", () => kaldeweiIndex(fetchPage), true);
  return fromPaths(provider, findPaths(urls, name), fetchPage, model);
}

export async function searchManufacturerProducts(
  ctx: ActorContext,
  payload: unknown,
  { fetchPage = readSource, cache = cachePublicCatalog }: { fetchPage?: LoadPage; cache?: typeof cachePublicCatalog } = {},
): Promise<ManufacturerLookupResult> {
  requireRule(canSearchPlanningProducts(ctx.permissions), "FORBIDDEN",
    "Die Produktsuche ist für diesen Zugang nicht freigegeben.", 403);
  const { providers, term, source } = identifySearch(manufacturerLookupSchema.parse(payload));
  const responses = await Promise.all(providers.map(async provider => {
    const url = source ?? manufacturerDirectory(provider, term);
    if (!source && needsDetail(provider, term)) {
      return { source: { provider, url, status: "needs_detail" } satisfies ManufacturerLookupSource, items: [], hasMore: false };
    }
    try {
      const lookup = await cache(provider + ":" + (source ?? term.toLowerCase()),
        () => providerSearch(provider, term, source, fetchPage, cache));
      return { ...lookup, source: { provider, url, status: "searched" } satisfies ManufacturerLookupSource };
    } catch {
      return { source: { provider, url, status: "unavailable" } satisfies ManufacturerLookupSource, items: [], hasMore: false };
    }
  }));
  const items = distinct(responses.flatMap(response => response.items));
  return {
    items: items.slice(0, resultLimit),
    sources: responses.map(response => response.source),
    hasMore: items.length > resultLimit || responses.some(response => response.hasMore),
  };
}
