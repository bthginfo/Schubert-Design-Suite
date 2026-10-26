import { createHash } from "node:crypto";
import {
  manufacturerDeliverySchema,
  type ActorContext,
  type ManufacturerDeliveryRow,
} from "@schubert/contracts";
import { rows, one, withTenant } from "@schubert/db";
import { assertPermission, assertVersion, requireRule } from "@schubert/domain";
import { z } from "zod";
import { register, getRecord, hash, type Runtime } from "./core.js";
import { catalogEvidence, assertLegalScope } from "./catalog.js";
import { parseManufacturerDelivery } from "./manufacturer-delivery-parser.js";
import { assertManufacturerUse } from "./document-access.js";
const permission = (ctx: ActorContext) => {
  assertPermission(ctx.permissions, "manufacturer_assets");
  assertPermission(ctx.permissions, "catalog");
};
async function source(r: Runtime, id: string) {
  const metadata = await catalogEvidence(r, id);
  requireRule(
    metadata.document.entity_type === "manufacturer-assets" &&
      Number(metadata.document.size_bytes) <= 2 * 1024 * 1024,
    "DELIVERY_SOURCE",
    "Eine private Herstellerunterlage bis 2 MB verwenden.",
  );
  const owner = await getRecord(
    r.db,
    "manufacturer_assets",
    metadata.document.entity_id,
  );
  requireRule(
    owner.manufacturer_name.trim().toLowerCase() === "duravit",
    "DELIVERY_MANUFACTURER",
    "Diese Quelldatei gehört nicht zu Duravit.",
  );
  const original = metadata;
  requireRule(
    owner.status !== "archived",
    "DELIVERY_SOURCE_ARCHIVED",
    "Eine ausgeblendete Quellenfassung kann keine neue Lieferung begründen.",
  );
  requireRule(
    ["text/csv", "text/plain"].includes(original.document.mime_type),
    "DELIVERY_FORMAT",
    "Einen CSV-Datenstand auswählen. CAD- und Bildoriginale getrennt in der Herstellerbibliothek ablegen.",
  );
  return original;
}
async function existing(r: Runtime, article: string) {
  return one<any>(
    r.db,
    "SELECT v.*,p.id product_id,pv.id variant_id FROM products p JOIN manufacturers m ON m.id=p.manufacturer_id AND m.legal_entity_id=$2 JOIN product_variants pv ON pv.product_id=p.id AND pv.legal_entity_id=$2 JOIN product_variant_versions v ON v.id=pv.active_version_id AND v.legal_entity_id=$2 WHERE lower(m.name)='duravit' AND p.legal_entity_id=$2 AND v.manufacturer_sku=$1 ORDER BY v.created_at DESC LIMIT 1",
    [article, r.ctx.legalEntityId],
  );
}
const content = (item: ManufacturerDeliveryRow, sourceUrl: string) =>
  hash({
    article: item.article,
    name: item.name,
    width: item.width,
    depth: item.depth,
    height: item.height,
    sourceUrl,
    market: "DE",
  });
register("manufacturer.delivery.stage", "manufacturer_assets", async (r) => {
  permission(r.ctx);
  const parsedInput = manufacturerDeliverySchema
      .extend({ source_base64: z.string().min(1).max(900000) })
      .parse(r.payload),
    { source_base64, ...input } = parsedInput,
    original = await source(r, input.source_document_version_id),
    bytes = Buffer.from(source_base64, "base64");
  requireRule(
    createHash("sha256").update(bytes).digest("hex") ===
      original.version.content_hash,
    "DELIVERY_CONTENT_HASH",
    "Die übergebenen CSV-Bytes stimmen nicht mit der gescannten Originalfassung überein.",
  );
  const parsed = parseManufacturerDelivery(bytes, input),
    preview = [];
  for (const item of parsed.items) {
    const known = await existing(r, item.article);
    preview.push({
      ...item,
      change: !known
        ? "new"
        : known.validation_report?.deliveryContentHash ===
            content(item, input.source_url)
          ? "unchanged"
          : "changed",
      previousVersionId: known?.id ?? null,
      previous: known
        ? {
            width: known.width_mm,
            depth: known.depth_mm,
            height: known.height_mm,
            name: known.name,
          }
        : null,
    });
  }
  const report = {
    items: preview,
    new: preview.filter((i) => i.change === "new").length,
    changed: preview.filter((i) => i.change === "changed").length,
    unchanged: preview.filter((i) => i.change === "unchanged").length,
    sourceQuality: "Herstellerreferenz · keine technische Freigabe",
    catalogCoverage:
      "Unbekannt: keine vollständige Hersteller-Soll-Liste hinterlegt",
    models: "CAD-/Bildoriginale bleiben getrennt zu prüfen",
  };
  return r.insert("manufacturer_deliveries", {
    name: input.label,
    manufacturer: "Duravit",
    market: "DE",
    source_document_version_id: input.source_document_version_id,
    source_hash: original.version.content_hash,
    source_url: input.source_url,
    payload: { input, items: parsed.items },
    report,
    status: "review",
  });
});
register("manufacturer.delivery.apply", "manufacturer_assets", async (r) => {
  permission(r.ctx);
  const input = z.strictObject({ confirm: z.literal(true) }).parse(r.payload),
    delivery = await getRecord(
      r.db,
      "manufacturer_deliveries",
      r.command.id,
      true,
    );
  assertLegalScope(r, delivery);
  assertVersion(delivery.version, r.command.expectedVersion);
  requireRule(
    delivery.status === "review" && !delivery.applied_at,
    "DELIVERY_APPLIED",
    "Dieser Lieferstand wurde bereits übernommen. Für Änderungen eine neue Lieferung prüfen.",
  );
  const original = await source(r, delivery.source_document_version_id);
  await assertManufacturerUse(
    r.db,
    original.document,
    original.version.id,
    "planning",
  );
  requireRule(
    original.version.content_hash === delivery.source_hash,
    "DELIVERY_HASH",
    "Der geprüfte Quelldateistand hat sich geändert.",
  );
  await r.db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    "manufacturer:Duravit:DE:" + r.ctx.tenantId + ":" + r.ctx.legalEntityId,
  ]);
  const payload = delivery.payload as {
    input: any;
    items: ManufacturerDeliveryRow[];
  };
  let manufacturer = await one<any>(
    r.db,
    "SELECT id FROM manufacturers WHERE lower(name)='duravit' AND legal_entity_id=$1 LIMIT 1",
    [r.ctx.legalEntityId],
  );
  if (!manufacturer)
    manufacturer = await r.insert("manufacturers", {
      name: "Duravit",
      status: "active",
    });
  const bindings = [];
  let added = 0,
    changed = 0,
    unchanged = 0;
  for (const item of payload.items) {
    const known = await existing(r, item.article),
      digest = content(item, delivery.source_url);
    requireRule(
      (known?.id ?? null) ===
        (delivery.report.items.find(
          (entry: any) => entry.article === item.article,
        )?.previousVersionId ?? null),
      "DELIVERY_STALE",
      "Der Artikelstand hat sich seit der Vorschau geändert. Lieferung erneut prüfen.",
      409,
    );
    if (known?.validation_report?.deliveryContentHash === digest) {
      bindings.push({
        article: item.article,
        versionId: known.id,
        change: "unchanged",
      });
      unchanged++;
      continue;
    }
    requireRule(
      !known || known.status === "source_reference",
      "DELIVERY_TECHNICAL_STAND",
      "Ein fachlich geprüfter aktiver Artikelstand wird nicht durch eine Referenzlieferung ersetzt: " +
        item.article,
    );
    let productId = known?.product_id,
      variantId = known?.variant_id;
    if (!known) {
      const product = await r.insert("products", {
        name: "Duravit " + item.name,
        sku: item.article,
        manufacturer_id: manufacturer.id,
        kind: "merchandise",
        unit: "piece",
        active: true,
        status: "active",
      });
      productId = product.id;
      variantId = (
        await r.insert("product_variants", {
          product_id: productId,
          name: item.article,
          status: "active",
        })
      ).id;
    }
    const version = await r.insert("product_variant_versions", {
      product_variant_id: variantId,
      name: "Duravit " + item.name,
      manufacturer_sku: item.article,
      width_mm: item.width,
      depth_mm: item.depth,
      height_mm: item.height,
      source_url: delivery.source_url,
      source_document_version_id: delivery.source_document_version_id,
      revision: (known?.revision ?? 0) + 1,
      status: "source_reference",
      content_hash: digest,
      validation_report: {
        kind: "manufacturer_public_reference",
        publicSourceKey:
          "duravit-de-delivery:" + delivery.id + ":" + item.article,
        sourceHash: delivery.source_hash,
        deliveryId: delivery.id,
        deliveryContentHash: digest,
        market: "DE",
        sourceRow: item.row,
        geometry: "rectangular_envelope",
        orderingDetailsPending: true,
        originalModelAvailable: false,
      },
    });
    await r.db.query(
      "UPDATE product_variants SET active_version_id=$1,version=version+1,updated_at=now(),updated_by=$3 WHERE id=$2",
      [version.id, variantId, r.ctx.actorId],
    );
    bindings.push({
      article: item.article,
      versionId: version.id,
      change: known ? "changed" : "new",
    });
    known ? changed++ : added++;
  }
  return r.update(
    "manufacturer_deliveries",
    delivery.id,
    {
      status: "applied",
      applied_at: new Date(),
      report: {
        ...delivery.report,
        bindings,
        added,
        changed,
        unchanged,
      },
    },
    delivery.version,
  );
});
export async function manufacturerDeliveries(ctx: ActorContext) {
  permission(ctx);
  return withTenant(ctx, (db) =>
    rows(
      db,
      "SELECT l.id,l.name,l.status,l.version,l.manufacturer,l.market,l.source_document_version_id,l.source_hash,l.source_url,l.report,l.created_at,l.applied_at,a.id source_asset_id,a.version source_asset_version,a.status source_status,(a.use_planning AND a.published_at IS NOT NULL AND a.document_version_id=l.source_document_version_id AND a.source_hash=l.source_hash AND a.status='available') source_planning_use FROM manufacturer_deliveries l JOIN document_versions v ON v.id=l.source_document_version_id JOIN documents d ON d.id=v.document_id JOIN manufacturer_assets a ON a.id=d.entity_id AND d.entity_type='manufacturer-assets' WHERE l.legal_entity_id=$1 ORDER BY l.created_at DESC,l.id DESC LIMIT 20",
      [ctx.legalEntityId],
    ),
  );
}
