import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { ActorContext } from "@schubert/contracts";
import { executeCommand, prepareAssistantContext } from "@schubert/application";
import { withTenant, insert, one } from "@schubert/db";
import { customerNextActions } from "../packages/application/src/customer-actions.js";
export async function guidedWorkflowIntegration(
  actor: (role: string) => ActorContext,
  test: (label: string, run: () => Promise<void>) => Promise<void>,
) {
  const owner = actor("Owner");
  const call = (name: string, payload: Record<string, unknown>) =>
    executeCommand(owner, { name, payload, idempotencyKey: randomUUID() });
  await test("Task presets persist on the actual project, reject a mismatched studio and create no invented measurements", async () => {
    const result = await call("planning.project.create", {
      kind: "room_plan",
      name: "TEST · Fensterbank " + randomUUID(),
      workflow_preset: "stone_sill",
    });
    assert.equal(result.project.workflow_preset, "stone_sill");
    assert.deepEqual(result.revision.snapshot.measurements, {});
    assert.deepEqual(result.revision.snapshot.elements, []);
    const prepared = await prepareAssistantContext(
      owner,
      {
        message: "Welche Maße fehlen?",
        history: [],
        mode: "standard",
        path: "studio/" + result.project.id,
        context: {
          path: "studio/" + result.project.id,
          variantId: result.variant.id,
        },
        references: [],
      },
      "https://example.invalid",
    );
    assert.equal(prepared.context.project.workflow_preset, "stone_sill");
    assert.equal(prepared.context.workflow.label, "Bauteil & Maße");
    await assert.rejects(
      () =>
        call("planning.project.create", {
          kind: "memorial",
          name: "TEST · falsches Vorhaben",
          workflow_preset: "stone_sill",
        }),
      (e: any) => e.code === "PLANNING_PRESET",
    );
  });
  await test("Customer next actions derive from real records, respect permissions and keep foreign customers/entities out", async () => {
    const customer = await call("crm.customer.create", {
        name: "TEST · Nächste Schritte " + randomUUID(),
      }),
      other = await call("crm.customer.create", {
        name: "TEST · Anderer Aktionskunde " + randomUUID(),
      });
    const order = await call("sales.order.create", {
        title: "TEST · Steinauftrag",
        customer_id: customer.id,
        currency: "EUR",
      }),
      foreign = await call("sales.order.create", {
        title: "TEST · Fremder Steinauftrag",
        customer_id: other.id,
        currency: "EUR",
      });
    const task = await call("communication.task.create", {
      title: "TEST · Freigabe nachfassen",
      order_id: order.id,
      due_date: "2026-01-02",
    });
    await call("communication.task.create", {
      title: "TEST · Geheime Fremdaufgabe",
      order_id: foreign.id,
    });
    const pack = await call("projects.package.create", {
      name: "TEST · Vor Ort messen",
      order_id: order.id,
      kind: "survey",
      unit: "h",
      due_date: "2026-01-03",
    });
    const actions = await withTenant(owner, (db) =>
      customerNextActions(db, owner, customer.id),
    );
    assert(actions.some((a) => a.href === "/tasks/" + task.id && a.overdue));
    assert(
      actions.some(
        (a) =>
          a.href === "/work-packages/" + pack.id && a.title.includes("Aufmaß"),
      ),
    );
    assert(!JSON.stringify(actions).includes("Geheime Fremdaufgabe"));
    const prepared = await prepareAssistantContext(
      owner,
      {
        message: "Was ist als Nächstes zu tun?",
        history: [],
        mode: "standard",
        path: "customers/" + customer.id,
        references: [],
      },
      "https://example.invalid",
    );
    assert(
      prepared.context.customerWorkspace.nextActions.some(
        (item: any) => item.href === "/tasks/" + task.id,
      ),
    );
    const section = await prepareAssistantContext(
      owner,
      {
        message: "Erkläre diese Aufträge.",
        history: [],
        mode: "standard",
        path: "customers/" + customer.id,
        context: { path: "customers/" + customer.id, search: "bereich=orders" },
        references: [],
      },
      "https://example.invalid",
    );
    assert.equal(section.context.customerWorkspace.area, "orders");
    assert.deepEqual(section.context.customerWorkspace.nextActions, []);
    assert(
      !JSON.stringify(prepared.context.customerWorkspace).includes(
        "Geheime Fremdaufgabe",
      ),
    );
    const limited = { ...owner, permissions: ["crm"] };
    assert.deepEqual(
      await withTenant(limited, (db) =>
        customerNextActions(db, limited, customer.id),
      ),
      [],
    );
    const differentEntity = { ...owner, legalEntityId: randomUUID() };
    assert.deepEqual(
      await withTenant(differentEntity, (db) =>
        customerNextActions(db, differentEntity, customer.id),
      ),
      [],
    );
  });
  await test("Duravit delivery: scanned source hash, scope, review, immutable revisions and stale previews are enforced in real PostgreSQL", async () => {
    const admin = actor("SuperAdmin"),
      run = (name: string, payload: Record<string, unknown>, record?: any) =>
        executeCommand(admin, {
          name,
          payload,
          id: record?.id,
          expectedVersion: record?.version,
          idempotencyKey: randomUUID(),
        });
    const sku = "TEST-" + randomUUID().slice(0, 8),
      base = {
        tenant_id: admin.tenantId,
        legal_entity_id: admin.legalEntityId,
        created_by: admin.actorId,
      };
    // Synthetic source fixtures exercise trusted upload/scan state; no live scanner or OEM feed is claimed.
    async function source(width: string) {
      const bytes = Buffer.from(
          "Artikel;Name;Breite;Tiefe;Höhe\n" +
            sku +
            ";TEST Duravit-Lieferung;" +
            width +
            ";460;\n",
        ),
        digest = createHash("sha256").update(bytes).digest("hex");
      const asset = await run("manufacturer.asset.create", {
        name: "TEST · CSV-Lieferung",
        manufacturer_name: "Duravit",
        kind: "datasheet",
        studio_scope: "room_plan",
        source_url:
          "https://pro.duravit.de/pro/html/default/downloadcenter.de-de.html",
        source_unit: "mm",
      });
      const fixture = await withTenant(admin, async (db) => {
        const blob = await insert(db, "blob_objects", {
          ...base,
          storage_key: admin.tenantId + "/synthetic/delivery/" + randomUUID(),
          provider: "vercel_blob",
          content_hash: digest,
          mime_type: "text/csv",
          size_bytes: bytes.length,
          scan_status: "quarantine",
          status: "quarantine",
        });
        const doc = await insert(db, "documents", {
          ...base,
          name: "TEST Duravit.csv",
          original_name: "TEST Duravit.csv",
          mime_type: "text/csv",
          size_bytes: bytes.length,
          content_hash: digest,
          entity_type: "manufacturer-assets",
          entity_id: asset.id,
          visibility: "internal",
          status: "quarantine",
        });
        const version = await insert(db, "document_versions", {
          ...base,
          document_id: doc.id,
          blob_object_id: blob.id,
          content_hash: digest,
          revision: 1,
          status: "quarantine",
        });
        await db.query(
          "UPDATE documents SET current_version_id=$1 WHERE id=$2",
          [version.id, doc.id],
        );
        return { blob, doc, version };
      });
      await run(
        "manufacturer.asset.attach",
        { document_id: fixture.doc.id },
        asset,
      );
      const input = {
        label: "TEST · Lieferstand " + width,
        unit: "mm",
        source_url:
          "https://pro.duravit.de/pro/html/default/downloadcenter.de-de.html",
        source_document_version_id: fixture.version.id,
        source_base64: bytes.toString("base64"),
        mapping: {
          article: "Artikel",
          name: "Name",
          width: "Breite",
          depth: "Tiefe",
          height: "Höhe",
        },
      };
      await assert.rejects(
        () => run("manufacturer.delivery.stage", input),
        (e: any) => e.code === "EVIDENCE_QUARANTINE",
      );
      await withTenant(admin, async (db) => {
        await db.query(
          "UPDATE blob_objects SET scan_status='clean',status='available' WHERE id=$1",
          [fixture.blob.id],
        );
        await db.query("UPDATE documents SET status='available' WHERE id=$1", [
          fixture.doc.id,
        ]);
        await db.query(
          "UPDATE document_versions SET status='available' WHERE id=$1",
          [fixture.version.id],
        );
      });
      return input;
    }
    const input = await source("600");
    await assert.rejects(
      () =>
        run("manufacturer.delivery.stage", {
          ...input,
          source_base64: Buffer.from("tampered").toString("base64"),
        }),
      (e: any) => e.code === "DELIVERY_CONTENT_HASH",
    );
    await assert.rejects(
      () =>
        executeCommand(actor("Planner"), {
          name: "manufacturer.delivery.stage",
          payload: input,
          idempotencyKey: randomUUID(),
        }),
      (e: any) => e.status === 403,
    );
    const preview = await run("manufacturer.delivery.stage", input);
    assert.equal(preview.report.new, 1);
    async function allowPlanning(input: {
      source_document_version_id: string;
    }) {
      const asset = await withTenant(admin, (db) =>
        one<any>(
          db,
          "SELECT id,version FROM manufacturer_assets WHERE document_version_id=$1",
          [input.source_document_version_id],
        ),
      );
      const allowed = await run(
        "manufacturer.asset.publish",
        {
          use_planning: true,
          use_ai: false,
          rights_statement:
            "TEST · ausschließlich synthetische Testdatei für die lokale Planungsprüfung; keine echten Herstellerrechte behauptet.",
          rights_confirmed: true,
        },
        asset,
      );
      assert.equal(allowed.use_ai, false);
    }
    await assert.rejects(
      () => run("manufacturer.delivery.apply", { confirm: true }, preview),
      (e: any) => e.code === "MANUFACTURER_USAGE",
    );
    await allowPlanning(input);
    const applied = await run(
      "manufacturer.delivery.apply",
      { confirm: true },
      preview,
    );
    assert.equal(applied.report.added, 1);
    const originalId = applied.report.bindings[0].versionId;
    const unchanged = await run("manufacturer.delivery.stage", input);
    assert.equal(unchanged.report.unchanged, 1);
    const changedInput = await source("650");
    const changed = await run("manufacturer.delivery.stage", changedInput);
    await allowPlanning(changedInput);
    assert.equal(changed.report.changed, 1);
    const updated = await run(
      "manufacturer.delivery.apply",
      { confirm: true },
      changed,
    );
    assert.equal(updated.report.changed, 1);
    assert.notEqual(updated.report.bindings[0].versionId, originalId);
    const old = await withTenant(admin, (db) =>
      one<any>(
        db,
        "SELECT width_mm,status FROM product_variant_versions WHERE id=$1",
        [originalId],
      ),
    );
    assert.equal(Number(old.width_mm), 600);
    assert.equal(old.status, "source_reference");
    await assert.rejects(
      () => run("manufacturer.delivery.apply", { confirm: true }, unchanged),
      (e: any) => e.code === "DELIVERY_STALE",
    );
  });
}
