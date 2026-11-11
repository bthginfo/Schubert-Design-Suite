import { describe, expect, it, vi } from "vitest";
import type { ActorContext } from "@schubert/contracts";
import { searchManufacturerProducts } from "../apps/web/src/lib/server/manufacturer-lookup.js";

const actor: ActorContext = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  legalEntityId: "00000000-0000-4000-8000-000000000002",
  actorId: "00000000-0000-4000-8000-000000000003",
  role: "Planner",
  permissions: ["planning"],
  permissionVersion: 1,
  employeeId: null,
  correlationId: "test",
  actorType: "employee",
  identityAssurance: "individual_session",
};

const withoutCache = <T,>(_key: string, load: () => Promise<T>) => load();
const duravitCard = (article: string, size: string) =>
  '<div class="col-product__col-1">' +
  '<a title="ME by Starck Waschtisch" href="/de-de/p/Waschtisch-' + article + '/">ME by Starck Waschtisch</a>' +
  '<p class="product-desc">' + size + ' mm, Weiß Hochglanz</p><div class="product-number">#' + article + '</div></div>';

describe("manufacturer product search", () => {
  it("returns the exact Duravit article and its dimensions from an otherwise fuzzy listing", async () => {
    const fetchPage = vi.fn(async (_url: string) =>
      '<input type="search">' + duravitCard("233565AA00", "650 x 490") + duravitCard("233555AA00", "550 x 440"));
    const result = await searchManufacturerProducts(actor, { query: "Waschtisch Duravit 233555AA00" }, { fetchPage, cache: withoutCache });
    expect(fetchPage).toHaveBeenCalledOnce();
    expect(new URL(String(fetchPage.mock.calls[0]?.[0])).searchParams.get("q")).toBe("233555AA00");
    expect(result.items).toEqual([expect.objectContaining({
      manufacturer: "Duravit", article: "233555AA00", sourceUrl: "https://www.duravit.com/de-de/p/Waschtisch-233555AA00/",
      dimensions: [{ label: "Abmessungen", value: "550 × 440 mm" }],
    })]);
  });

  it("keeps two variants on the same Geberit page distinct and strips link tracking", async () => {
    const url = "https://catalog.geberit.de/de-DE/product/PRO_2694811";
    const row = (article: string, finish: string) =>
      "<table><tr><td>Art.-Nr.</td><td>" + article + "</td></tr>" +
      "<tr><td>B</td><td>35.5 cm</td></tr><tr><td>Farbe / Oberfläche</td><td>" + finish + "</td></tr></table>";
    const fetchPage = vi.fn(async (_url: string) => "<h1>Acanto Wand-WC</h1>" + row("502.774.00.1", "weiß") + row("502.774.00.8", "KeraTect"));
    const result = await searchManufacturerProducts(actor, { query: url + "?tracking=demo#details" }, { fetchPage, cache: withoutCache });
    expect(fetchPage).toHaveBeenCalledWith(url);
    expect(result.items.map(item => [item.article, item.variant])).toEqual([["502.774.00.1", "weiß"], ["502.774.00.8", "KeraTect"]]);
    expect(result.items[0].dimensions).toEqual([{ label: "Breite", value: "35.5 cm" }]);
  });

  it("uses the official exact-article route for AXOR numbers that may be absent from the sitemap", async () => {
    const path = "/articledetail-axor-starck-stabhandbrause-10531000";
    const fetchPage = vi.fn(async (_url: string, format?: string) => format === "json"
      ? JSON.stringify({ redirectUrl: path, productCodes: ["10531000"] })
      : '<meta property="og:title" content="AXOR Starck Stabhandbrause - 10531000">');
    const result = await searchManufacturerProducts(actor, { query: "AXOR Starck 10531000" }, { fetchPage, cache: withoutCache });
    expect(fetchPage).toHaveBeenCalledWith("https://pro.hansgrohe.de/search/products?q=10531000", "json");
    expect(fetchPage).toHaveBeenCalledWith("https://pro.hansgrohe.de" + path);
    expect(result.items).toEqual([expect.objectContaining({ manufacturer: "AXOR", article: "10531000" })]);
  });

  it("guides an article-only Geberit query to the official catalog without attempting restricted search", async () => {
    const fetchPage = vi.fn();
    const result = await searchManufacturerProducts(actor, { query: "Geberit 502.774.00.1" }, { fetchPage, cache: withoutCache });
    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.sources).toEqual([{ provider: "geberit", status: "needs_detail", url: "https://catalog.geberit.de/de-DE" }]);
  });

  it("distinguishes unavailable markup from an empty catalog result", async () => {
    const fetchPage = vi.fn(async () => "<html><title>Temporarily unavailable</title></html>");
    const result = await searchManufacturerProducts(actor, { query: "Duravit 233555" }, { fetchPage, cache: withoutCache });
    expect(result.items).toEqual([]);
    expect(result.sources[0].status).toBe("unavailable");
  });

  it("rejects unauthorized roles and unsupported links before calling any source", async () => {
    const fetchPage = vi.fn();
    const options = { fetchPage, cache: withoutCache };
    await expect(searchManufacturerProducts({ ...actor, permissions: ["time"] }, { query: "Duravit 233555" }, options))
      .rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(searchManufacturerProducts(actor, { query: "https://example.invalid/de-DE/product/PRO_2694811" }, options))
      .rejects.toMatchObject({ status: 422, code: "MANUFACTURER_LINK" });
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
