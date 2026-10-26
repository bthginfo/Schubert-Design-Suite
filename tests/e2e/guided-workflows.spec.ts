import { config } from "dotenv";
import { test, expect, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { withTenant, insert, closePools } from "@schubert/db";
import type { ActorContext } from "@schubert/contracts";
import { login } from "./login.js";
import { chooseSelect, nativeSelect, studioAdd } from "./select-choice.js";

config({ quiet: true });
const evidence = "work/guided-workflows-2026-10-26/browser";
async function command(
  page: Page,
  name: string,
  payload: object,
  record?: { id: string; version: number },
) {
  const response = await page.request.post("/api/v1/commands", {
    headers: { origin: new URL(page.url()).origin },
    data: {
      name,
      payload,
      id: record?.id,
      expectedVersion: record?.version,
      idempotencyKey: randomUUID(),
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).result;
}
async function capture(page: Page, name: string, scope: string) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  const audit = await new AxeBuilder({ page })
    .include(scope)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: evidence + "/" + name + ".png",
    animations: "disabled",
  });
}
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
});
test.afterAll(async () => {
  await closePools();
});

test("Inscription addition records the existing stone and keeps new text and additional components planned", async ({
  page,
}) => {
  await login(page, "PLANNER");
  const plan = await command(page, "planning.project.create", {
    kind: "memorial",
    workflow_preset: "memorial_existing",
    name: "TEST · Nachbeschriftung " + randomUUID().slice(0, 8),
  });
  await page.goto("/studio/" + plan.project.id + "?variant=" + plan.variant.id);
  await expect(page.locator(".planning-steps")).toContainText("Bestand & Maße");
  await page
    .getByRole("button", { name: "Bestand erfassen", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByText("Bestand, Rückbau & Gruppierung", { exact: true })
    .click();
  await expect(
    await nativeSelect(
      page,
      dialog.getByLabel("Planungsphase", { exact: true }),
    ),
  ).toHaveValue("existing");
  for (const [label, value] of [
    ["Breite (mm)", "800"],
    ["Höhe (mm)", "1200"],
    ["Materialstärke (mm)", "160"],
  ])
    await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog
    .getByRole("button", { name: "In den Plan übernehmen", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page
    .getByRole("button", { name: "Inschrift gestalten", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByText("Bestand, Rückbau & Gruppierung", { exact: true })
    .click();
  await expect(
    await nativeSelect(
      page,
      dialog.getByLabel("Planungsphase", { exact: true }),
    ),
  ).toHaveValue("planned");
  await dialog
    .getByLabel("Wörtlicher Text / Namen und Daten", { exact: true })
    .fill("Hanna Weiß\n1948 – 2026");
  await dialog
    .getByRole("button", { name: "In den Plan übernehmen", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Entwurf prüfen", exact: true }),
  ).toBeVisible();
  await studioAdd(page, "Stein / Sockel");
  dialog = page.getByRole("dialog");
  await dialog
    .getByText("Bestand, Rückbau & Gruppierung", { exact: true })
    .click();
  await expect(
    await nativeSelect(
      page,
      dialog.getByLabel("Planungsphase", { exact: true }),
    ),
  ).toHaveValue("planned");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await capture(page, "inscription-addition-desktop", ".studio-root");
});

test("Window-sill preset creates an explicitly measured sill without a room and survives reopening", async ({
  page,
}) => {
  await login(page, "PLANNER");
  await page.goto("/studio");
  await page.getByRole("button", { name: /^Raum & Naturstein/ }).click();
  const name = "TEST · Fensterbank-Vorhaben " + randomUUID().slice(0, 8);
  await page.getByLabel("Projektname", { exact: true }).fill(name);
  await chooseSelect(
    page,
    page.getByLabel("Vorhaben", { exact: false }),
    "stone_sill",
  );
  await page
    .getByRole("button", { name: "Planung beginnen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Steinbauteil anlegen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    await nativeSelect(page, dialog.getByLabel("Bauteilart", { exact: true })),
  ).toHaveValue("sill");
  await expect(dialog.getByLabel("Länge (mm)", { exact: true })).toHaveValue(
    "",
  );
  for (const [label, value] of [
    ["Länge (mm)", "1200"],
    ["Tiefe (mm)", "280"],
    ["Materialstärke (mm)", "30"],
  ])
    await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog
    .getByRole("button", { name: "In den Plan übernehmen", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Speichern", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.locator(".inspector")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Bauteile gestalten", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Entwurf prüfen", exact: true }),
  ).toBeVisible();
  await capture(page, "sill-desktop", ".studio-root");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "sill-mobile", ".studio-root");
});

test("Memorial next action opens the inscription on the saved stone and then review", async ({
  page,
}) => {
  await login(page, "PLANNER");
  const plan = await command(page, "planning.project.create", {
    kind: "memorial",
    name: "TEST · Geführtes Grabmal " + randomUUID().slice(0, 8),
    workflow_preset: "memorial_new",
  });
  await page.goto("/studio/" + plan.project.id + "?variant=" + plan.variant.id);
  await page
    .getByRole("button", { name: "Ersten Stein anlegen", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  for (const [label, value] of [
    ["Breite (mm)", "800"],
    ["Höhe (mm)", "1200"],
    ["Materialstärke (mm)", "160"],
  ])
    await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog
    .getByRole("button", { name: "In den Plan übernehmen", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page
    .getByRole("button", { name: "Inschrift gestalten", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Wörtlicher Text / Namen und Daten", { exact: true })
    .fill("Anna Weiß\n1948 – 2026");
  await dialog
    .getByRole("button", { name: "In den Plan übernehmen", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page
    .getByRole("button", { name: "Entwurf prüfen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Prüfliste öffnen", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Speichern", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator(".lettering-status")).toContainText(
    "1 Inschrift dargestellt",
  );
  await capture(page, "memorial-next-3d", ".studio-root");
});

test("Office customer next actions show real tasks, dates and assignment without mixing customers", async ({
  page,
}) => {
  await login(page, "OFFICE");
  const customer = await command(page, "crm.customer.create", {
      name: "TEST · Aktionskunde " + randomUUID().slice(0, 8),
    }),
    other = await command(page, "crm.customer.create", {
      name: "TEST · Fremder Aktionskunde " + randomUUID().slice(0, 8),
    });
  const order = await command(page, "sales.order.create", {
      title: "TEST · Aufmaß Küche",
      customer_id: customer.id,
      currency: "EUR",
    }),
    foreign = await command(page, "sales.order.create", {
      title: "TEST · Fremder Auftrag",
      customer_id: other.id,
      currency: "EUR",
    });
  const task = await command(page, "communication.task.create", {
    title: "TEST · Aufmaßtermin vereinbaren",
    order_id: order.id,
    due_date: "2026-01-02",
  });
  await command(page, "communication.task.create", {
    title: "TEST · Fremde Aufgabe darf nicht auftauchen",
    order_id: foreign.id,
  });
  await page.goto("/customers/" + customer.id);
  const next = page.locator(".customer-next");
  await expect(next).toContainText(task.title);
  await expect(next).toContainText("02.01.2026");
  await expect(next).toContainText("Noch nicht zugewiesen");
  await expect(next).toContainText("Überfällig");
  await expect(next).not.toContainText("Fremde Aufgabe");
  await capture(page, "customer-next-desktop", ".customer-workspace");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "customer-next-mobile", ".customer-workspace");
  await next.getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp("/tasks/" + task.id));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    task.title,
  );
});

test("Human test preparation retains self-assessments and previews feedback without sending", async ({
  page,
}) => {
  await login(page, "SUPERADMIN");
  await page.goto("/settings?tab=feedback");
  const toggle = page.getByLabel("Feedback-Button für das Team anzeigen");
  if (!(await toggle.isChecked())) {
    await toggle.check();
    await page
      .getByRole("button", { name: "Einstellung speichern", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("eingeschaltet");
  }
  await page.goto("/help");
  let practice = page.locator(".practice-test");
  await practice.locator("summary").click();
  await chooseSelect(
    page,
    practice.getByLabel("Mein Arbeitsbereich", { exact: true }),
    "office",
  );
  await practice
    .locator("section")
    .first()
    .getByLabel("Mit Hilfe", { exact: true })
    .check();
  const note = "TEST · Ich musste nach der Zuständigkeit suchen.";
  await practice
    .getByLabel("Wo mussten Sie suchen oder waren unsicher?", { exact: true })
    .fill(note);
  await page.goto("/customers");
  await page.goto("/help");
  practice = page.locator(".practice-test");
  await practice.locator("summary").click();
  await expect(
    practice.getByLabel("Wo mussten Sie suchen oder waren unsicher?", {
      exact: true,
    }),
  ).toHaveValue(note);
  await expect(
    practice
      .locator("section")
      .first()
      .getByLabel("Mit Hilfe", { exact: true }),
  ).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "human-test-preparation-mobile", ".practice-test");
  let submissions = 0;
  await page.route("**/api/v1/commands", (route) => {
    if (route.request().postDataJSON()?.name === "feedback.submit")
      submissions++;
    return route.continue();
  });
  await practice
    .getByRole("button", { name: "Rückmeldung prüfen", exact: true })
    .click();
  const feedback = page.locator("dialog.feedback-dialog");
  await expect(feedback).toBeVisible();
  await expect(
    feedback.getByLabel("Ihr Kommentar", { exact: false }),
  ).toHaveValue(new RegExp(note));
  expect(submissions).toBe(0);
  await feedback
    .getByRole("button", { name: "Feedback schließen", exact: true })
    .click();
});

test("Manufacturer delivery preview applies a scanned synthetic CSV as reference only and remains usable on mobile", async ({
  page,
}) => {
  await login(page, "SUPERADMIN");
  const actor: ActorContext = {
    tenantId: process.env.TEST_TENANT_ID!,
    legalEntityId: process.env.TEST_LEGAL_ENTITY_ID!,
    actorId: process.env.TEST_SUPERADMIN_ID!,
    role: "SuperAdmin",
    permissions: [],
    permissionVersion: 1,
    correlationId: randomUUID(),
    employeeId: null,
    actorType: "employee",
    identityAssurance: "individual_session",
  };
  const sku = "TEST-" + randomUUID().slice(0, 8),
    bytes = Buffer.from(
      "Artikel;Name;Breite;Tiefe;Höhe\n" +
        sku +
        ";TEST CSV Referenz;600;460;\n",
    ),
    digest = createHash("sha256").update(bytes).digest("hex");
  const asset = await command(page, "manufacturer.asset.create", {
    name: "TEST · Browser CSV-Quelle",
    manufacturer_name: "Duravit",
    kind: "datasheet",
    studio_scope: "room_plan",
    source_url:
      "https://pro.duravit.de/pro/html/default/downloadcenter.de-de.html",
    source_unit: "mm",
  });
  // Trusted scan/upload metadata fixture in the isolated local tenant; no live scanner or manufacturer feed is claimed.
  const fixture = await withTenant(actor, async (db) => {
    const base = {
        tenant_id: actor.tenantId,
        legal_entity_id: actor.legalEntityId,
        created_by: actor.actorId,
      },
      blob = await insert(db, "blob_objects", {
        ...base,
        storage_key:
          actor.tenantId + "/synthetic/browser-delivery/" + randomUUID(),
        provider: "vercel_blob",
        content_hash: digest,
        mime_type: "text/csv",
        size_bytes: bytes.length,
        scan_status: "clean",
        status: "available",
      }),
      doc = await insert(db, "documents", {
        ...base,
        name: "TEST Duravit.csv",
        original_name: "TEST Duravit.csv",
        mime_type: "text/csv",
        size_bytes: bytes.length,
        content_hash: digest,
        entity_type: "manufacturer-assets",
        entity_id: asset.id,
        visibility: "internal",
        status: "available",
      }),
      version = await insert(db, "document_versions", {
        ...base,
        document_id: doc.id,
        blob_object_id: blob.id,
        content_hash: digest,
        revision: 1,
        status: "available",
      });
    await db.query("UPDATE documents SET current_version_id=$1 WHERE id=$2", [
      version.id,
      doc.id,
    ]);
    return { doc, version };
  });
  await command(
    page,
    "manufacturer.asset.attach",
    { document_id: fixture.doc.id },
    asset,
  );
  const preview = await command(page, "manufacturer.delivery.stage", {
    label: "TEST · Browser-Lieferung " + sku,
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
  });
  await page.goto("/manufacturer-assets");
  const panel = page.locator(".delivery-panel");
  await panel.locator("summary").first().click();
  // Exercise the visible mapping preparation separately from the trusted scan fixture.
  await panel.locator("input[type=file]").setInputFiles({
    name: "TEST Zuordnung.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      'Artikel,"Name; Bezeichnung",Breite,Tiefe,Höhe\n123456,TEST A,60,46,\n',
    ),
  });
  await chooseSelect(page, panel.getByLabel("Bezeichnung", { exact: true }), {
    label: "Name; Bezeichnung",
  });
  await expect(
    await nativeSelect(
      page,
      panel.getByLabel("Artikelnummer", { exact: true }),
    ),
  ).toHaveValue("Artikel");
  await panel.locator(".history>summary").click();
  await panel.getByRole("button", { name: new RegExp(preview.name) }).click();
  await expect(panel.locator(".delivery-preview")).toContainText(
    "600 × 460 × offen",
  );
  await capture(page, "manufacturer-preview-desktop", ".delivery-panel");
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.locator(".source-rights").scrollIntoViewIfNeeded();
  await expect(
    panel.getByLabel("Grundlage der Planungsnutzung", { exact: true }),
  ).toHaveCSS("font-size", "16px");
  await capture(page, "manufacturer-rights-mobile", ".delivery-panel");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    panel.getByRole("button", {
      name: "Geprüfte Referenzstände übernehmen",
      exact: true,
    }),
  ).toBeDisabled();
  await panel
    .getByLabel("Grundlage der Planungsnutzung", { exact: true })
    .fill(
      "TEST · eigene synthetische Testdatei nur für lokale Planungsprüfung, keine echten Herstellerrechte behauptet.",
    );
  await panel
    .getByRole("checkbox", {
      name: "Ich habe die angegebene Planungsnutzung dieser Quelle geprüft.",
      exact: true,
    })
    .check();
  await panel
    .getByRole("button", { name: "Planungsnutzung freigeben", exact: true })
    .click();
  await expect(
    panel.getByRole("button", {
      name: "Geprüfte Referenzstände übernehmen",
      exact: true,
    }),
  ).toBeEnabled();
  await panel
    .getByRole("button", {
      name: "Geprüfte Referenzstände übernehmen",
      exact: true,
    })
    .click();
  await expect(panel.locator(".delivery-preview")).toContainText(
    "Dieser Lieferstand wurde übernommen",
  );
  await expect(panel).toContainText(
    "Technische Modelle und Rechte werden dadurch nicht freigegeben",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "manufacturer-delivery-mobile", ".delivery-panel");
});
