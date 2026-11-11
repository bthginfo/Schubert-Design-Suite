import type { ManufacturerCatalogCoverage } from "@schubert/contracts";

export type CatalogProvider = {
  id: string;
  name: string;
  group: string;
  website: string | null;
  coverage: ManufacturerCatalogCoverage;
  nativeSearch?: boolean;
};

export const catalogProviders: readonly CatalogProvider[] = [
  { id: "agape", name: "Agape", group: "Bad & Spa", website: "https://www.agapedesign.it/de-DE", coverage: "index" },
  { id: "antoniolupi", name: "antoniolupi", group: "Bad & Spa", website: "https://www.antoniolupi.it/en/collections", coverage: "website" },
  { id: "aparici", name: "Aparici", group: "Fliesen & Stein", website: "https://www.aparici.com/recursos", coverage: "website" },
  { id: "bette", name: "Bette", group: "Bad & Spa", website: "https://www.my-bette.com/service/downloads", coverage: "partner" },
  { id: "bisazza", name: "Bisazza", group: "Fliesen & Stein", website: "https://www.bisazza.com/de/Produkte/", coverage: "index" },
  { id: "cea", name: "CEA", group: "Armaturen", website: "https://www.ceadesign.it/en/products/1-bathroom", coverage: "index" },
  { id: "cosmic", name: "Cosmic", group: "Bad & Spa", website: "https://www.cosmicbrand.com/de/de/produkte", coverage: "index" },
  { id: "devon-devon", name: "Devon&Devon", group: "Bad & Spa", website: "https://www.devon-devon.com/eu/", coverage: "index" },
  { id: "dornbracht", name: "Dornbracht", group: "Armaturen", website: "https://www.dornbracht.com/de-de/designserien/", coverage: "partner" },
  { id: "duravit", name: "Duravit", group: "Bad & Spa", website: "https://www.duravit.com/de-de/produkte/", coverage: "index", nativeSearch: true },
  { id: "effe", name: "Effe", group: "Bad & Spa", website: "https://www.effe.it/de/produkte/", coverage: "index" },
  { id: "geberit", name: "Geberit", group: "Bad & Spa", website: "https://catalog.geberit.de/de-DE", coverage: "index", nativeSearch: true },
  { id: "glamora", name: "Glamora", group: "Wand & Textil", website: "https://www.glamora.it/de", coverage: "index" },
  { id: "godelmann", name: "Godelmann", group: "Fliesen & Stein", website: "https://www.godelmann.de/de/produkte/nach-kategorien/betonfliesen", coverage: "index" },
  { id: "hansgrohe", name: "hansgrohe / AXOR", group: "Armaturen", website: "https://pro.hansgrohe.de/bad", coverage: "articles", nativeSearch: true },
  { id: "ideagroup", name: "IdeaGroup", group: "Bad & Spa", website: "https://www.ideagroupbadmoebel.de/", coverage: "index" },
  { id: "inbani", name: "Inbani", group: "Bad & Spa", website: "https://inbani.com/", coverage: "index" },
  { id: "k8", name: "K8", group: "Schubert Showroom", website: null, coverage: "unresolved" },
  { id: "kaldewei", name: "KALDEWEI", group: "Bad & Spa", website: "https://www.kaldewei.de/produkte/badewannen/", coverage: "index", nativeSearch: true },
  { id: "keuco", name: "KEUCO", group: "Bad & Spa", website: "https://www.keuco.com/de_de/fachpartner/downloads/", coverage: "articles" },
  { id: "lithos-design", name: "Lithos Design", group: "Fliesen & Stein", website: "https://www.lithosdesign.com/coverings/", coverage: "index" },
  { id: "living-ceramics", name: "Living Ceramics", group: "Fliesen & Stein", website: "https://livingceramics.com/en/downloads/", coverage: "index" },
  { id: "londonart", name: "Londonart", group: "Wand & Textil", website: "https://www.londonart.it/en/exclusive-wallpaper", coverage: "index" },
  { id: "luiz", name: "Luiz", group: "Wand & Textil", website: "https://luiz.com/collections/", coverage: "index" },
  { id: "mirage", name: "Mirage", group: "Fliesen & Stein", website: "https://mirage.it/de/products/collections", coverage: "index" },
  { id: "mutina", name: "Mutina", group: "Fliesen & Stein", website: "https://www.mutina.it/en/collezioni", coverage: "index" },
  { id: "nero", name: "Nero", group: "Schubert Markenliste", website: null, coverage: "unresolved" },
  { id: "nevobad", name: "NevoBad", group: "Bad & Spa", website: "https://nevobad.de/produkte/", coverage: "index" },
  { id: "nimbus", name: "Nimbus", group: "Licht & Spiegel", website: "https://nimbus-lighting.com/en/products/families", coverage: "website" },
  { id: "oraitaliana", name: "14oraitaliana", group: "Fliesen & Stein", website: "https://www.14oraitaliana.com/public/download/14ORAITALIANA_marzo_25.pdf", coverage: "website" },
  { id: "sicis", name: "SICIS", group: "Fliesen & Stein", website: "https://www.sicis.com/en", coverage: "index" },
  { id: "strassacker", name: "Strassacker", group: "Grabmal", website: "https://shop.strassacker.com/", coverage: "website" },
  { id: "terma", name: "Terma", group: "Heizkörper", website: "https://de.termaheat.com/produkte/heizkoerper", coverage: "index" },
  { id: "tubes", name: "Tubes", group: "Heizkörper", website: "https://www.tubesradiatori.com/de/produkte/", coverage: "index" },
  { id: "vola", name: "VOLA", group: "Armaturen", website: "https://de.vola.com/catalog/cad-zeichnungen", coverage: "website" },
  { id: "wall-deco", name: "Wall&decò", group: "Wand & Textil", website: "https://www.wallanddeco.com/de-de/", coverage: "index" },
  { id: "zazzeri", name: "Zazzeri", group: "Armaturen", website: "https://www.zazzeri.it/collezioni/", coverage: "index" },
  { id: "zierath", name: "Zierath", group: "Licht & Spiegel", website: "https://www.frasco.de/zierath/", coverage: "unresolved" },
  { id: "zierkon", name: "Zierkon", group: "Licht & Spiegel", website: "https://www.zierkon.de/produktgruppen/", coverage: "index" },
];

export const catalogProviderById = new Map(catalogProviders.map(provider => [provider.id, provider]));

export type CatalogIndex = {
  url: string;
  type: "sitemap" | "page";
  paths: RegExp;
  kind: "product" | "series" | "article";
  children?: RegExp;
  maxChildren?: number;
  productHost?: string;
  allowQuery?: boolean;
  article?: RegExp;
  linkSelector?: string;
};

export const catalogIndexes: Record<string, readonly CatalogIndex[]> = {
  agape: [{ url: "https://www.agapedesign.it/sitemaps/family_sitemap.xml", type: "sitemap", paths: /^\/de-DE\/families\/[^/]+\/?$/, kind: "series" }],
  bette: [{ url: "https://content.my-bette.com/sitemap-de.xml.gz", type: "sitemap", productHost: "www.my-bette.com", paths: /^\/produkt\/[^/]+(?:\/[^/]+)?\/?$/, kind: "product" }],
  bisazza: [{ url: "https://www.bisazza.com/de/Produkte/", type: "page", paths: /^\/de\/Produkte\/[^/]+\/?$/i, kind: "series" }],
  cea: [{ url: "https://www.ceadesign.it/en/products/1-bathroom/5-taps", type: "page", paths: /^\/en\/products\/1-bathroom\/5-taps\/[^/]+\/?$/, kind: "series" }],
  cosmic: [{ url: "https://www.cosmicbrand.com/sitemap.xml", type: "sitemap", paths: /^\/de\/de\/produkte\/[^/]+-WJ[A-Z0-9.]+\/?$/i, kind: "product" }],
  "devon-devon": [{ url: "https://www.devon-devon.com/media/sitemap/it_en/sitemap.xml", type: "sitemap", paths: /^\/it_en\/(?:bathroom|washbasins|bathtubs|taps-and-fittings|furnishings|accessories|floorings-and-wall-coverings)\/[^/]+(?:\/[^/]+)*\.html$/i, kind: "product" }],
  dornbracht: [{ url: "https://www.dornbracht.com/de-de/sitemap.de-de.xml", type: "sitemap", paths: /^\/de-de\/designserien\/(?:badserien|kuechenserien|spa-serien)\/[^/]+\/?$/i, kind: "series" }],
  duravit: [{ url: "https://assets.duravit.com/GoogleSitemap/de-de/sitemap.xml", type: "sitemap", productHost: "www.duravit.com", paths: /^\/de-de\/produkte\/alle-serien\/[^/]+\/?$/, kind: "series" }],
  effe: [{ url: "https://www.effe.it/en/products/", type: "page", paths: /^\/en\/product\/[^/]+\/?$/, kind: "product" }],
  geberit: [{ url: "https://catalog.geberit.de/de-DE", type: "page", paths: /^\/de-DE\/series\/SC1_\d+\/?$/, kind: "series" }],
  glamora: [{ url: "https://www.glamora.it/sitemap.xml", type: "sitemap", productHost: "glamora.it", paths: /^\/de\/(?:creative-collection|special-editions)\/[^/]+(?:\/[^/]+)*\/?$/, kind: "series" }],
  godelmann: [{ url: "https://www.godelmann.de/sitemap.xml", type: "sitemap", paths: /^\/de\/produkte\/nach-kategorien\/(?:[^/]+\/)*gdm\.[^/]+\/?$/i, kind: "product" }],
  hansgrohe: [{ url: "https://pro.hansgrohe.de/sitemap/hpsdesite-article-de_de-eur.xml", type: "sitemap", paths: /^\/articledetail-[^/]+-\d{8}\/?$/i, kind: "article", article: /-(\d{8})\/?$/ }],
  ideagroup: [
    { url: "https://www.ideagroupbadmoebel.de/prodotto-sitemap.xml", type: "sitemap", paths: /^\/prodotto\/[^/]+\/?$/, kind: "series" },
    { url: "https://www.ideagroupbadmoebel.de/complemento-sitemap.xml", type: "sitemap", paths: /^\/complemento\/[^/]+\/?$/, kind: "product" },
  ],
  inbani: [
    { url: "https://inbani.com/wp-sitemap-posts-product-1.xml", type: "sitemap", paths: /^\/(?:en\/)?(?:products|productos)\/[^/]+\/?$/, kind: "product" },
    { url: "https://inbani.com/wp-sitemap-posts-collections-1.xml", type: "sitemap", paths: /^\/(?:en\/)?collections\/[^/]+\/?$/, kind: "series" },
  ],
  kaldewei: [{
    url: "https://www.kaldewei.de/sitemap.xml", type: "sitemap", kind: "series",
    children: /^\/sitemap\.xml\?sitemap=(?:baths|showers|washbasins|showerchannels)&cHash=[a-f0-9]{32}$/,
    paths: /^\/produkte\/(?:badewannen|duschflaechen|waschtische|duschrinnen)\/detail\/product\/[^/]+\/?$/,
  }],
  "lithos-design": [
    { url: "https://www.lithosdesign.com/coverings/", type: "page", paths: /^\/coverings\/[^/]+\/?$/, kind: "product" },
    { url: "https://www.lithosdesign.com/backlit-walls/", type: "page", paths: /^\/backlit-walls\/[^/]+\/?$/, kind: "product" },
    { url: "https://www.lithosdesign.com/dividers/", type: "page", paths: /^\/dividers\/[^/]+\/?$/, kind: "product" },
    { url: "https://www.lithosdesign.com/furniture/", type: "page", paths: /^\/furniture\/[^/]+\/?$/, kind: "product" },
  ],
  "living-ceramics": [{ url: "https://livingceramics.com/productos-sitemap.xml", type: "sitemap", paths: /^\/de\/productos\/[^/]+\/?$/, kind: "series" }],
  londonart: [{ url: "https://www.londonart.it/en/exclusive-wallpaper", type: "page", linkSelector: ".animation-text a[href]", paths: /^\/en\/(?!exclusive-wallpaper\/?$)[a-z0-9-]+\/?$/i, kind: "series" }],
  luiz: [{ url: "https://luiz.com/collection-sitemap.xml", type: "sitemap", paths: /^\/(?:en\/)?collection\/[^/]+\/?$/, kind: "series" }],
  mirage: [{ url: "https://mirage.it/sitemap-de.xml", type: "sitemap", paths: /^\/de\/products\/collections\/[^/]+\/?$/, kind: "series" }],
  mutina: [{ url: "https://www.mutina.it/en/collezioni", type: "page", paths: /^\/en\/collection\/[^/]+\/?$/, kind: "series" }],
  nevobad: [{
    url: "https://nevobad.de/sitemap_index.xml", type: "sitemap", children: /^\/product-sitemap\d*\.xml$/,
    paths: /^\/katalog\/[^/]+\/[^/]+\/[^/]+\/?$/, kind: "product", maxChildren: 8,
  }],
  sicis: [{ url: "https://www.sicis.com/sitemaps/sitemap/en-products.xml", type: "sitemap", paths: /^\/en\/(?:mosaic-products|furniture-products|textiles-products|surfaces-products)\/[^/]+\/[^/]+\/?$/, kind: "product" }],
  terma: [{ url: "https://de.termaheat.com/produkte/heizkoerper", type: "page", paths: /^\/(?:produkt|produkte\/heizkoerper)\/[^/]+\/?$/, kind: "product" }],
  tubes: [{ url: "https://www.tubesradiatori.com/it/prodotti-sitemap.xml", type: "sitemap", paths: /^\/de\/produkte\/[^/]+\/?$/, kind: "product" }],
  "wall-deco": [{ url: "https://www.wallanddeco.com/de-de/", type: "page", paths: /^\/de-de\/katalog\/kollektionen\/[^/]+\/?$/, kind: "series" }],
  zazzeri: [{
    url: "https://www.zazzeri.it/sitemap_index.xml", type: "sitemap", children: /^\/zazzeri_product-sitemap\d*\.xml$/,
    paths: /^\/de\/zazzeri_product\/[^/]+\/?$/, kind: "product", maxChildren: 12,
  }],
  zierkon: [{ url: "https://www.zierkon.de/sitemap.xml", type: "sitemap", paths: /^\/produktgruppen\/[^/]+\/?$/, kind: "series" }],
};

export const catalogIndexFallbacks: Record<string, readonly CatalogIndex[]> = {
  hansgrohe: [
    { url: "https://www.hansgrohe.de/sitemap/hbwdesite-article-de_de-eur.xml", type: "sitemap", paths: /^\/articledetail-[^/]+-\d{8}\/?$/i, kind: "article", article: /-(\d{8})\/?$/ },
    { url: "https://www.axor-design.com/de/sitemap/axwdesite-article-de_de-eur.xml", type: "sitemap", paths: /^\/de\/articledetail-[^/]+-\d{8}\/?$/i, kind: "article", article: /-(\d{8})\/?$/ },
  ],
};
