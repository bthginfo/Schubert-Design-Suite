import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ManufacturerCatalogEntry } from "@schubert/contracts";
import { one } from "@schubert/db";
import { requireRule } from "@schubert/domain";
import { register, registeredCommands, hash, type Runtime } from "./core.js";

export const manufacturerCatalogAdoptionCommand = "catalog.manufacturer_reference.adopt";
type CatalogSourceLoader = (providerId: string) => Promise<{
  items: ManufacturerCatalogEntry[];
  digest: string;
  checkedAt: string | null;
  sourceUrl: string;
} | undefined>;

const selection = z.strictObject({
  providerId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/),
  referenceId: z.string().max(80),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});

export function registerManufacturerCatalogAdoption(loadSource: CatalogSourceLoader) {
  if (registeredCommands().includes(manufacturerCatalogAdoptionCommand)) return;
  register(manufacturerCatalogAdoptionCommand, "catalog", request => adoptReference(request, loadSource));
}

async function adoptReference(request: Runtime, loadSource: CatalogSourceLoader) {
  const input = selection.parse(request.payload);
  const source = await loadSource(input.providerId);
  requireRule(source && source.digest === input.digest, "MANUFACTURER_CATALOG_CHANGED",
    "Der Herstellerkatalog wurde aktualisiert. Bitte den Artikel erneut suchen.", 409);
  const item = source.items.find(candidate => candidate.id === input.referenceId);
  requireRule(item && item.articleKind === "article" && item.article, "MANUFACTURER_ARTICLE_REQUIRED",
    "Bitte einen Eintrag mit konkreter Artikelnummer wählen.", 422);

  const legal = request.ctx.legalEntityId;
  const manufacturerName = item.manufacturer;
  await request.db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    "manufacturer-reference:" + request.ctx.tenantId + ":" + legal + ":" + manufacturerName.toLocaleLowerCase("de-DE"),
  ]);
  let manufacturer = await one<{ id: string }>(request.db,
    "SELECT id FROM manufacturers WHERE legal_entity_id=$1 AND lower(name)=lower($2) ORDER BY id LIMIT 1",
    [legal, manufacturerName]);
  if (!manufacturer) manufacturer = await request.insert("manufacturers", { name: manufacturerName, status: "active" });

  const existing = await one<{ id: string }>(request.db, [
    "SELECT p.id FROM products p",
    "WHERE p.legal_entity_id=$1 AND p.manufacturer_id=$2 AND (lower(p.sku)=lower($3) OR EXISTS (",
    "SELECT 1 FROM product_variants pv JOIN product_variant_versions vv ON vv.id=pv.active_version_id",
    "WHERE pv.product_id=p.id AND pv.legal_entity_id=p.legal_entity_id AND lower(vv.manufacturer_sku)=lower($3)))",
    "ORDER BY p.id LIMIT 1",
  ].join(" "), [legal, manufacturer!.id, item.article]);
  if (existing) return { id: existing.id, productId: existing.id, command_noop: true };

  const title = (manufacturerName + " · " + item.name).slice(0, 180);
  const product = await request.insert("products", {
    name: title,
    sku: item.article,
    manufacturer_id: manufacturer!.id,
    kind: "merchandise",
    unit: "piece",
    active: true,
    status: "active",
  });
  const versionId = randomUUID();
  const variant = await request.insert("product_variants", {
    product_id: product.id,
    name: "Herstellerreferenz " + item.article,
    status: "active",
    active_version_id: versionId,
  });
  await request.insert("product_variant_versions", {
    id: versionId,
    product_variant_id: variant.id,
    name: title,
    manufacturer_sku: item.article,
    gtin: item.gtin ?? null,
    source_url: item.sourceUrl,
    revision: 1,
    status: "source_reference",
    notes: "Artikelreferenz aus dem Herstellerkatalog. Planungsmaße, technische Freigabe und Verfügbarkeit separat prüfen.",
    content_hash: hash(item),
    validation_report: {
      kind: "manufacturer_public_reference",
      publicSourceKey: "manufacturer-catalog:" + item.id,
      sourceHash: source.digest,
      checkedOn: source.checkedAt?.slice(0, 10),
      locator: source.sourceUrl,
      orderingDetailsPending: true,
    },
  });
  return { id: product.id, productId: product.id, version: product.version };
}
