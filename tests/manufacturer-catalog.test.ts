import { describe, expect, it, vi } from "vitest";
import type { ActorContext, ManufacturerCatalogEntry } from "@schubert/contracts";
import {
  catalogSearchTarget, dueManufacturerSources, emptyManufacturerCatalog, refreshManufacturerSources, searchManufacturerCatalogOnline,
} from "../apps/web/src/lib/server/manufacturer-catalog.js";
import { catalogDigest, collectManufacturerSource, type ManufacturerSourceSnapshot } from "../apps/web/src/lib/server/manufacturer-catalog-collect.js";

const actor: ActorContext = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  legalEntityId: "00000000-0000-4000-8000-000000000002",
  actorId: "00000000-0000-4000-8000-000000000003",
  role: "Planner",
  permissions: ["planning"],
  permissionVersion: 1,
  employeeId: null,
  correlationId: "catalog-test",
  actorType: "employee",
  identityAssurance: "individual_session",
};

function source(providerId: string, count: number, checkedAt: string): ManufacturerSourceSnapshot {
  const items: ManufacturerCatalogEntry[] = Array.from({ length: count }, (_, i) => ({
    id: providerId + ":" + i,
    providerId,
    manufacturer: providerId,
    name: "Artikel " + i,
    article: String(i),
    articleKind: "article",
    sourceUrl: "https://manufacturer.example/article/" + i,
    dimensions: [],
  }));
  return {
    items, digest: catalogDigest(items), checkedAt, attemptedAt: checkedAt, state: "current",
    sourceUrl: "https://manufacturer.example/catalog",
  };
}

describe("manufacturer catalog", () => {
  it("keeps the previous valid versions if a source fails or returns a partial directory", async () => {
    const october = "2026-10-11T04:35:00.000Z";
    const november = new Date("2026-11-11T04:35:00.000Z");
    const first = await refreshManufacturerSources(emptyManufacturerCatalog(), new Date(october),
      async (id) => source(id, 12, october), ["keuco", "bette", "dornbracht"]);

    const next = await refreshManufacturerSources(first, november, async (id) => {
      if (id === "keuco") throw new Error("temporary outage");
      return source(id, id === "bette" ? 2 : 12, november.toISOString());
    }, ["keuco", "bette", "dornbracht"]);

    expect(next.month).toBe("2026-11");
    for (const id of ["keuco", "bette"]) {
      expect(next.sources[id]).toMatchObject({
        state: "unavailable", checkedAt: october, attemptedAt: november.toISOString(), digest: first.sources[id].digest,
      });
      expect(next.sources[id].items).toBe(first.sources[id].items);
    }
    expect(next.sources.dornbracht).toMatchObject({ state: "current", checkedAt: november.toISOString() });
    expect(next.sources.dornbracht.items).toBe(first.sources.dornbracht.items);
  });

  it("recognizes AXOR and KEUCO article searches", () => {
    expect(catalogSearchTarget({ query: "AXOR Starck", offset: 0 })).toMatchObject({
      id: "hansgrohe", brand: "AXOR", term: "starck",
    });
    expect(catalogSearchTarget({ query: "KEUCO 00450006000", offset: 0 })).toMatchObject({
      id: "keuco", term: "00450006000",
    });
    expect(catalogSearchTarget({ query: "ME by Starck Duravit 233555AA00", offset: 0 })).toMatchObject({
      id: "duravit", term: "me by starck 233555aa00",
    });
  });

  it("only retries failed sources once the previous run has had time to finish", async () => {
    const first = new Date("2026-11-11T11:03:00.000Z");
    const ids = dueManufacturerSources(null, first);
    const snapshot = await refreshManufacturerSources(emptyManufacturerCatalog(), first, async id => {
      if (id === "hansgrohe") throw new Error("temporary outage");
      return source(id, 1, first.toISOString());
    }, ids);

    expect(dueManufacturerSources(snapshot, new Date("2026-11-11T11:04:00.000Z"))).toEqual([]);
    expect(dueManufacturerSources(snapshot, new Date("2026-11-11T12:08:00.000Z"))).toEqual(["hansgrohe"]);
    expect(dueManufacturerSources(snapshot, new Date("2026-12-11T11:03:00.000Z"))).toEqual(ids);
  });

  it("uses both official brand indexes when the combined trade directory is temporarily unavailable", async () => {
    const sitemap = (href: string) => new Response("<urlset><url><loc>" + href + "</loc></url></urlset>");
    const mockFetch = vi.fn(async (url: URL) => {
      if (url.hostname === "pro.hansgrohe.de") return new Response(null, { status: 503 });
      if (url.hostname === "www.hansgrohe.de") {
        return sitemap("https://www.hansgrohe.de/articledetail-handbrause-12345678");
      }
      return sitemap("https://www.axor-design.com/de/articledetail-starck-87654321");
    });
    vi.stubGlobal("fetch", mockFetch);
    try {
      const result = await collectManufacturerSource("hansgrohe");
      expect(result.items).toHaveLength(2);
      expect(result.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ manufacturer: "hansgrohe", article: "12345678" }),
        expect.objectContaining({ manufacturer: "AXOR", article: "87654321" }),
      ]));
      expect(mockFetch).toHaveBeenCalledTimes(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("offers a domain-limited external search only for a verified manufacturer website", async () => {
    const vola = await searchManufacturerCatalogOnline(actor, { query: "VOLA 111" });
    expect(vola).toMatchObject({ searchedProviderId: "vola", items: [] });
    expect(new URL(vola.siteSearch!).searchParams.get("q")).toBe("site:de.vola.com 111");
    const nero = await searchManufacturerCatalogOnline(actor, { query: "Nero 111" });
    expect(nero).toMatchObject({ searchedProviderId: "nero", items: [] });
    expect(nero.siteSearch).toBeUndefined();
    await expect(searchManufacturerCatalogOnline({ ...actor, permissions: ["time"] }, { query: "VOLA 111" }))
      .rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});
