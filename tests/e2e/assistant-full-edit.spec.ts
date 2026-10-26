import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { withTenant, insert, update, one, closePools } from "@schubert/db";
import { assistantActionCatalog, type ActorContext } from "@schubert/contracts";
import { rolePermissions } from "@schubert/domain";
import { createDesign, applyOperations } from "@schubert/geometry";
import {
  initialPlanningOperations,
  normalizePlanningEdits,
} from "../../packages/ai/src/planning-edits.js";
import { planningDraftOperations } from "../../packages/ai/src/planning-draft.js";
import { login } from "./login.js";
config({ quiet: true });
const actor: ActorContext = {
  tenantId: process.env.TEST_TENANT_ID!,
  legalEntityId: process.env.TEST_LEGAL_ENTITY_ID!,
  actorId: process.env.TEST_OWNER_ID!,
  role: "Owner",
  permissions: rolePermissions.Owner,
  permissionVersion: 1,
  employeeId: null,
  correlationId: randomUUID(),
  actorType: "employee",
  identityAssurance: "individual_session",
};
let connection: string | null = null;
test.beforeAll(async () => {
  await mkdir("work/ai-full-edit-2026-10-26/browser", { recursive: true });
  await withTenant(actor, async (db) => {
    if (
      !(await one(
        db,
        "SELECT 1 FROM integration_connections WHERE provider='openai' AND status='configured'",
      ))
    )
      connection = (
        await insert(db, "integration_connections", {
          tenant_id: actor.tenantId,
          legal_entity_id: actor.legalEntityId,
          provider: "openai",
          name: "TEST AI full edit browser transport",
          configuration: {},
          status: "configured",
        })
      ).id;
  });
});
test.afterAll(async () => {
  try {
    if (connection)
      await withTenant(actor, (db) =>
        db.query("DELETE FROM integration_connections WHERE id=$1", [
          connection,
        ]),
      );
  } finally {
    await closePools();
  }
});
async function call(
  page: Page,
  name: string,
  payload: any = {},
  id?: string,
  version?: number,
) {
  const response = await page.request.post("/api/v1/commands", {
    headers: { origin: new URL(page.url()).origin },
    data: {
      name,
      payload,
      id,
      expectedVersion: version,
      idempotencyKey: randomUUID(),
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).result;
}
async function chat(page: Page) {
  await page.getByRole("button", { name: "Assistent", exact: true }).click();
  const panel = page.locator("#assistant-drawer");
  await panel.getByRole("button", { name: /^Chat/ }).click();
  return panel;
}
async function saved(
  commands: any[],
  validation: any,
  who = actor.actorId,
  evidence: any[] = [],
) {
  return withTenant(actor, (db) =>
    insert(db, "ai_proposals", {
      tenant_id: actor.tenantId,
      legal_entity_id: actor.legalEntityId,
      created_by: who,
      actor_id: who,
      entity_type: "orders",
      action_type: "draft_changes",
      commands,
      validation,
      evidence,
      missing_inputs: [],
      assumptions: [],
      expires_at: new Date(Date.now() + 600000),
      status: "proposed",
    }),
  );
}
// UI transport fixture: deliberately no claim of a live upload, scanner, preview
// worker or LLM here. The apply request and domain transaction remain real.
async function paper() {
  return withTenant(actor, async (db) => {
    const base = {
        tenant_id: actor.tenantId,
        legal_entity_id: actor.legalEntityId,
        created_by: actor.actorId,
      },
      sourceHash = "a".repeat(64),
      previewHash = "b".repeat(64);
    async function file(name: string, hash: string, scan: string) {
      const blob = await insert(db, "blob_objects", {
          ...base,
          storage_key: "TEST/browser/" + randomUUID(),
          provider: "vercel_blob",
          content_hash: hash,
          mime_type: "image/png",
          size_bytes: 100,
          scan_status: scan,
          status: "available",
        }),
        doc = await insert(db, "documents", {
          ...base,
          name,
          original_name: name,
          mime_type: "image/png",
          size_bytes: 100,
          content_hash: hash,
          status: "available",
        }),
        version = await insert(db, "document_versions", {
          ...base,
          document_id: doc.id,
          blob_object_id: blob.id,
          content_hash: hash,
          revision: 1,
          status: "available",
        });
      await update(db, "documents", doc.id, { current_version_id: version.id });
      return { doc, version };
    }
    const original = await file("TEST Papierskizze.png", sourceHash, "clean"),
      preview = await file(
        "TEST Bildseite.png",
        previewHash,
        "trusted_generator",
      );
    const result = {
      document_id: preview.doc.id,
      document_version_id: preview.version.id,
      previewDocumentVersionId: preview.version.id,
      previewHash,
      width: 1440,
      height: 900,
      sourceHash,
      sourceDocumentVersionId: original.version.id,
      pageIndex: 0,
    };
    const job = await insert(db, "job_runs", {
      ...base,
      name: "TEST completed paper preview",
      job_type: "document.preview",
      payload: {
        documentId: original.doc.id,
        documentVersionId: original.version.id,
        sourceHash,
        pageIndex: 0,
        aiPreview: true,
        aiReading: true,
      },
      result,
      status: "completed",
    });
    await update(db, "documents", preview.doc.id, { source_job_id: job.id });
    return {
      original,
      preview,
      job,
      sourceHash,
      result,
      source: {
        documentId: original.doc.id,
        documentVersionId: original.version.id,
        sourceHash,
        pageIndex: 0,
        name: original.doc.name,
        imagePreview: {
          documentId: preview.doc.id,
          documentVersionId: preview.version.id,
          hash: previewHash,
          width: 1440,
          height: 900,
        },
      },
    };
  });
}
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCfkAAAAASUVORK5CYII=",
  "base64",
);
test("Office photo attachment prepares automatically and creates an actual linked order with its original source", async ({
  page,
}) => {
  test.setTimeout(150000);
  await login(page, "OWNER");
  const customer = await call(page, "crm.customer.create", {
    name: "TEST Papierkunde " + randomUUID().slice(0, 6),
    party_type: "person",
  });
  await page.goto("/customers/" + customer.id);
  const source = await paper();
  let uploads = 0,
    modelCalls = 0,
    prepared = 0;
  let body: any;
  await page.route("**/api/v1/uploads", async (route) => {
    uploads++;
    expect(route.request().headers()["content-type"]).toContain(
      "multipart/form-data",
    );
    expect(route.request().postDataBuffer()!.toString()).toContain(
      "skizze.png",
    );
    await route.fulfill({
      json: { ok: true, result: { id: source.original.doc.id } },
    });
  });
  await page.route("**/api/v1/commands", async (route) => {
    const input = route.request().postDataJSON();
    if (input.name !== "documents.preview") return route.continue();
    prepared++;
    expect(input.payload.ai_reading).toBe(true);
    await route.fulfill({
      json: { ok: true, result: { job_id: source.job.id, status: "pending" } },
    });
  });
  await page.route(
    "**/api/v1/documents/" + source.preview.doc.id + "/download**",
    (route) => route.fulfill({ body: png, contentType: "image/png" }),
  );
  await page.route("**/api/v1/ai/chat", async (route) => {
    modelCalls++;
    body = route.request().postDataJSON();
    const proposal = await saved(
      [
        {
          name: "sales.order.create",
          input: {
            title: "TEST Grabmal aus Papierzeichnung",
            currency: "EUR",
            customer_id: customer.id,
            business_unit: "memorial",
            notes: "Zeichnung 800 × 1200 mm; Material und Preise noch offen.",
          },
        },
      ],
      {
        actionCatalog: assistantActionCatalog(
          actor.permissions,
          undefined,
          "Owner",
        ),
      },
      actor.actorId,
      [
        {
          documentVersionId: source.original.version.id,
          sourceHash: source.sourceHash,
        },
      ],
    );
    await route.fulfill({
      json: {
        ok: true,
        result: {
          text: "Auftragsentwurf aus der Skizze vorbereitet.",
          proposal,
        },
      },
    });
  });
  const panel = await chat(page);
  await panel
    .locator("input[type=file]")
    .setInputFiles({ name: "skizze.png", mimeType: "image/png", buffer: png });
  await expect(panel).toContainText("Bereit für die KI");
  expect(uploads).toBe(1);
  expect(prepared).toBe(1);
  expect(modelCalls).toBe(0);
  await panel
    .locator("#assistant-message")
    .fill("Aus dieser Zeichnung einen Auftrag für diesen Kunden anlegen.");
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  await expect(panel).toContainText(
    "Auftragsentwurf aus der Skizze vorbereitet.",
  );
  expect(body.references).toEqual([
    { document_id: source.original.doc.id, page_index: 0, include_image: true },
  ]);
  expect(body.context.path).toContain(customer.id);
  await expect(panel.locator(".proposal-preview")).toContainText(
    "Auftrag als Entwurf anlegen",
  );
  await expect(panel.locator(".proposal-preview")).not.toContainText(
    "$created:",
  );
  await panel
    .getByRole("button", { name: "Geprüften Vorschlag anwenden", exact: true })
    .click();
  await expect(panel).toContainText("Vom Server bestätigt angewendet.");
  const link = panel.locator('a[href^="/orders/"]');
  await expect(link).toHaveCount(1);
  const orderId = (await link.getAttribute("href"))!.split("/").at(-1)!;
  expect(
    (
      await withTenant(actor, (db) =>
        one<any>(db, "SELECT customer_id FROM orders WHERE id=$1", [orderId]),
      )
    ).customer_id,
  ).toBe(customer.id);
  await page.setViewportSize({ width: 390, height: 844 });
  const audit = await new AxeBuilder({ page })
    .include("#assistant-drawer")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: "work/ai-full-edit-2026-10-26/browser/office-paper-order-mobile.png",
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(391);
  await link.click();
  await expect(page).toHaveURL(new RegExp("/orders/" + orderId));
  await page
    .getByRole("button", { name: /Dokumente/ })
    .first()
    .click();
  await expect(page.locator("main")).toContainText("TEST Papierskizze.png");
});
test("Planner sketch from the overview creates a room and opens a prefilled customer-image handoff without generating an image", async ({
  page,
}) => {
  test.setTimeout(150000);
  await login(page, "OWNER");
  await page.goto("/studio");
  const source = await paper();
  let quoteCalls = 0;
  await page.route("**/api/v1/commands", (route) => {
    if (
      route.request().postDataJSON().name === "planning.visualization.request"
    )
      throw Error(
        "No image may be generated without the existing cost decision.",
      );
    quoteCalls++;
    return route.continue();
  });
  await page.route("**/api/v1/ai/chat", async (route) => {
    const initial = {
        draft: {
          kind: "rectangular_room",
          label: "Bad",
          clearWidthMm: "4000",
          clearDepthMm: "3000",
          heightMm: "2600",
          wallThicknessMm: "200",
        },
      },
      snapshot = createDesign("room_plan"),
      ops = initialPlanningOperations(
        { snapshot, sources: [source.source] },
        initial,
      ),
      proposal = await saved(
        [
          {
            name: "planning.project.create",
            input: {
              kind: "room_plan",
              name: "TEST Bad aus Skizze " + randomUUID().slice(0, 6),
              initial_plan: initial,
            },
          },
        ],
        {
          actionCatalog: assistantActionCatalog(
            actor.permissions,
            undefined,
            "Owner",
          ),
          sources: [source.source],
          initialPlanPreviews: [
            { commandIndex: 0, snapshot: applyOperations(snapshot, ops) },
          ],
        },
        actor.actorId,
        [
          {
            documentVersionId: source.original.version.id,
            sourceHash: source.sourceHash,
          },
        ],
      );
    await route.fulfill({
      json: {
        ok: true,
        result: {
          text: "Badentwurf mit Ihrer Bildvorlage vorbereitet.",
          proposal,
          visualization: {
            intent: "plan",
            prompt:
              "Kundenbild: warmes Tageslicht und heller Naturstein. Raumaufteilung und Maße aus dem Plan beibehalten.",
          },
        },
      },
    });
  });
  const panel = await chat(page);
  await panel
    .locator("#assistant-message")
    .fill("Bad aus meiner Skizze anlegen und ein Kundenbild vorbereiten.");
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  await expect(panel.locator(".initial-plan")).toBeVisible();
  await expect(panel.locator(".initial-plan")).toContainText(
    "Maßstab noch nicht festgelegt",
  );
  await expect(
    panel.getByRole("button", { name: "Kundenbild vorbereiten", exact: true }),
  ).toBeDisabled();
  await panel
    .getByRole("button", { name: "Geprüften Vorschlag anwenden", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Kundenbild vorbereiten", exact: true }),
  ).toBeEnabled();
  await panel
    .getByRole("button", { name: "Kundenbild vorbereiten", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Die Planung wird zum Bild.",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#visualization-prompt")).toHaveValue(
    /^Kundenbild: warmes Tageslicht/,
  );
  expect(quoteCalls).toBe(0);
  await page.screenshot({
    path: "work/ai-full-edit-2026-10-26/browser/sketch-image-handoff.png",
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: "Bildstudio schließen", exact: true })
    .click();
});
test("A full inscription revision applies directly and both chat undo and Studio undo preserve the earlier model", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page, "OWNER");
  const plan = await call(page, "planning.project.create", {
      name: "TEST Inschrift vollständig bearbeiten " + randomUUID().slice(0, 6),
      kind: "memorial",
    }),
    draft = planningDraftOperations(
      { snapshot: plan.revision.snapshot },
      {
        kind: "memorial_slab",
        label: "Stein",
        widthMm: "800",
        heightMm: "1200",
        thicknessMm: "160",
      },
    );
  let ready = await call(
    page,
    "planning.design.change",
    { base_revision_id: plan.revision.id, operations: draft },
    plan.variant.id,
    plan.variant.version,
  );
  const add = normalizePlanningEdits({ snapshot: ready.revision.snapshot }, [
    { type: "add_inscription", exactText: "dwadwadwadwa" },
  ]);
  ready = await call(
    page,
    "planning.design.change",
    { base_revision_id: ready.revision.id, operations: add },
    ready.variant.id,
    ready.variant.version,
  );
  const text = ready.revision.snapshot.elements.find(
    (e: any) => e.kind === "inscription",
  );
  await page.goto("/studio/" + plan.project.id + "?variant=" + plan.variant.id);
  await page.route("**/api/v1/ai/chat", async (route) => {
    const body = route.request().postDataJSON(),
      operations = normalizePlanningEdits(
        { snapshot: ready.revision.snapshot },
        [
          { type: "plan_inscription_revision", elementId: text.id },
          {
            type: "set_inscription_text",
            elementId: text.id,
            exactText: "Anna Müller\n* 1948 † 2025",
          },
          { type: "add_inscription", exactText: "Karl Müller\n* 1945 † 2026" },
        ],
      ),
      proposal = await saved(
        [
          {
            name: "planning.design.change",
            targetId: ready.variant.id,
            baseVersion: ready.variant.version,
            input: { base_revision_id: ready.revision.id, operations },
          },
        ],
        {
          planningTarget: {
            variantId: ready.variant.id,
            revisionId: ready.revision.id,
            baseVersion: ready.variant.version,
          },
          guardrails: body.context.planning_work.guardrails,
        },
      );
    await route.fulfill({
      json: {
        ok: true,
        result: {
          text: "Beide Inschriften mit Stern und Kreuz vorbereitet.",
          proposal,
        },
      },
    });
  });
  const panel = await chat(page);
  await panel
    .locator("#assistant-message")
    .fill(
      "Inschrift ersetzen: Anna Müller, Geburt 1948 mit Stern, Tod 2025 mit Kreuz. Eine zweite Inschrift für Karl Müller, 1945 bis 2026, ergänzen.",
    );
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  await expect(panel.locator(".planning-proposal")).toContainText(
    "Anna Müller",
  );
  await expect(panel.locator(".planning-proposal")).toContainText(
    "Karl Müller",
  );
  await panel
    .getByRole("button", { name: "Geprüften Vorschlag anwenden", exact: true })
    .click();
  await expect(panel).toContainText("Vom Server bestätigt angewendet.");
  const pdf = await page.request.get(
    `/api/v1/designs/${plan.variant.id}/export?kind=pdf&view=front`,
  );
  expect(pdf.status()).toBe(200);
  await mkdir("work/ai-full-edit-2026-10-26/pdf", { recursive: true });
  await writeFile(
    "work/ai-full-edit-2026-10-26/pdf/ai-inscriptions.pdf",
    await pdf.body(),
  );
  await panel
    .getByRole("button", { name: "KI-Änderung rückgängig", exact: true })
    .click();
  await expect(panel).toContainText("Änderung zurückgenommen");
  const stored = await withTenant(actor, (db) =>
    one<any>(
      db,
      "SELECT r.snapshot FROM design_variants v JOIN design_revisions r ON r.id=v.head_revision_id WHERE v.id=$1",
      [plan.variant.id],
    ),
  );
  expect(stored.snapshot.elements).toEqual(ready.revision.snapshot.elements);
  await panel
    .getByRole("button", { name: "Assistent schließen", exact: true })
    .click();
  await page.keyboard.press("Control+Shift+z");
  await expect
    .poll(async () =>
      withTenant(actor, async (db) => {
        const row = await one<any>(
          db,
          "SELECT r.snapshot FROM design_variants v JOIN design_revisions r ON r.id=v.head_revision_id WHERE v.id=$1",
          [plan.variant.id],
        );
        return row.snapshot.elements.filter(
          (element: any) => element.kind === "inscription",
        ).length;
      }),
    )
    .toBe(2);
  await page.keyboard.press("Control+z");
  await expect
    .poll(async () =>
      withTenant(
        actor,
        async (db) =>
          (
            await one<any>(
              db,
              "SELECT r.snapshot FROM design_variants v JOIN design_revisions r ON r.id=v.head_revision_id WHERE v.id=$1",
              [plan.variant.id],
            )
          ).snapshot.elements,
      ),
    )
    .toEqual(ready.revision.snapshot.elements);
});
