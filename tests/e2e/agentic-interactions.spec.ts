import {studioPanel,studioAdd,studioMetadata} from './select-choice.js';
import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { withTenant, insert, one, closePools } from "@schubert/db";
import type { ActorContext } from "@schubert/contracts";
import { planningDraftOperations } from "../../packages/ai/src/planning-draft.js";
import { login } from "./login.js";
config({ quiet: true });
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
let connection: string | null = null;
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "No unhandled browser errors").toEqual(
    [],
  );
});
test.beforeAll(async () => {
  if (!actor.tenantId) throw Error("Isolated test tenant required.");
  await mkdir("work/agentic-review", { recursive: true });
  await withTenant(actor, async (db) => {
    if (
      !(await one(
        db,
        "SELECT id FROM integration_connections WHERE provider='openai' AND status='configured'",
      ))
    )
      connection = (
        await insert(db, "integration_connections", {
          tenant_id: actor.tenantId,
          legal_entity_id: actor.legalEntityId,
          provider: "openai",
          name: "TEST · agentic UI transport stub",
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
async function command(
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
      id,
      expectedVersion: version,
      idempotencyKey: randomUUID(),
      payload,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).result;
}
async function createPlan(page: Page, kind: "memorial" | "room_plan") {
  const result = await command(page, "planning.project.create", {
    kind,
    name: "TEST · KI-Interaktion " + kind + " " + randomUUID().slice(0, 6),
  });
  await page.goto(
    "/studio/" + result.project.id + "?variant=" + result.variant.id,
  );
  await expect(page.locator(".studio-workspace")).toBeVisible();
  return result;
}
async function addStone(page: Page) {
  await page
    .getByRole("button", { name: "Ersten Stein anlegen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Breite (mm)", { exact: true }).fill("800");
  await dialog.getByLabel("Höhe (mm)", { exact: true }).fill("1200");
  await dialog.getByLabel("Materialstärke (mm)", { exact: true }).fill("160");
  const saving = savedResponse(page);
  await dialog
    .getByRole("button", { name: "In den Plan übernehmen", exact: true })
    .click();
  await saving;
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Speichern", exact: true }),
  ).toBeDisabled();
}
function savedResponse(page: Page) {
  return page.waitForResponse(
    (r) =>
      r.ok() &&
      r.request().method() === "POST" &&
      /\/api\/v1\/designs\/.+\/commands$/.test(new URL(r.url()).pathname),
  );
}
function assistant(page: Page) {
  return page.getByRole("dialog", { name: "Schubert Begleiter" });
}
async function openAssistant(page: Page) {
  await page
    .getByRole("button", { name: "KI für diesen Schritt", exact: true })
    .click();
  await expect(assistant(page)).toBeVisible();
  return assistant(page);
}
async function head(variantId: string) {
  return withTenant(actor, (db) =>
    one<any>(
      db,
      "SELECT r.id,r.snapshot,v.version FROM design_variants v JOIN design_revisions r ON r.id=v.head_revision_id WHERE v.id=$1",
      [variantId],
    ),
  );
}
async function persistProposal(
  body: any,
  operations: any[],
  generated = false,
) {
  return withTenant(actor, (db) =>
    insert(db, "ai_proposals", {
      tenant_id: actor.tenantId,
      legal_entity_id: actor.legalEntityId,
      created_by: process.env.TEST_PLANNER_ID!,
      actor_id: process.env.TEST_PLANNER_ID!,
      entity_type: "planning",
      entity_id: body.context.variantId,
      base_version: body.context.planning_work.base_version,
      action_type: "draft_changes",
      commands: [
        {
          name: "planning.design.change",
          input: {
            base_revision_id: body.context.planning_work.revision_id,
            operations,
          },
        },
      ],
      missing_inputs: [],
      assumptions: [],
      validation: {
        blocking: [],
        guardrails: body.context.planning_work.guardrails,
        selectedElementIds: body.context.selected_element_ids,
        serverGeneratedPlanningDraft: generated,
      },
      expires_at: new Date(Date.now() + 1800000),
      status: "proposed",
    }),
  );
}
async function audit(page: Page, scope: string) {
  const result = await new AxeBuilder({ page })
    .include(scope)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
}
async function shot(page: Page, name: string) {
  await page.screenshot({
    path: "work/agentic-review/" + name + ".png",
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
}

test("AI: structured clarification, explicit boundaries, cancellation and fresh follow-up stay under user control", async ({
  page,
}) => {
  test.setTimeout(150000);
  await login(page, "PLANNER");
  await createPlan(page, "memorial");
  await addStone(page);
  let calls: any[] = [],
    pending: Route | null = null;
  await page.route("**/api/v1/ai/chat", async (route) => {
    calls.push(route.request().postDataJSON());
    if (calls.length === 2) {
      pending = route;
      return;
    }
    await route.fulfill({
      json: {
        ok: true,
        result:
          calls.length === 1
            ? {
                text: "Bitte die Aufmaßgrundlage ergänzen.",
                missingInputs: [
                  "Ist die Breite ein fertiges Außenmaß?",
                  "Welche Materialstärke ist bestätigt?",
                ],
                assumptions: ["Die angegebenen Maße sind ungeprüfte Planmaße."],
                skillsUsed: [
                  {
                    id: "schubert-memorial-de",
                    label: "Grabmal & Inschrift",
                    version: "1.1.0",
                    jurisdiction: "DE",
                  },
                ],
              }
            : {
                text: "Neue Anfrage nach dem Abbruch bestätigt.",
                missingInputs: [],
                assumptions: [],
              },
      },
    });
  });
  const panel = await openAssistant(page);
  await panel
    .getByRole("button", { name: "Bearbeitungsgrenzen ändern", exact: true })
    .click();
  await expect(
    panel.getByLabel("Nur Auswahl bearbeiten", { exact: true }),
  ).not.toBeChecked();
  await panel.getByLabel("Nur Auswahl bearbeiten", { exact: true }).check();
  await panel.getByLabel("Wortlaut beibehalten", { exact: true }).check();
  await panel.getByLabel("Maßwerte beibehalten", { exact: true }).check();
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  await panel.getByText("Verwendete Fachhilfe", { exact: true }).click();
  await expect(panel.locator(".reply-skills")).toContainText(
    "Grabmal & Inschrift",
  );
  await expect(panel.locator(".reply-skills")).toContainText(
    "Deutschland · Version 1.1.0",
  );
  await expect(
    panel.getByRole("combobox", { name: /skill|fachhilfe/i }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("heading", { name: "Noch zu klären", exact: true }),
  ).toBeVisible();
  expect(calls[0].context.planning_work.guardrails).toEqual({
    preserveMeasurements: true,
    preserveWording: true,
    selectionOnly: true,
  });
  await panel
    .getByLabel("Ist die Breite ein fertiges Außenmaß?", { exact: true })
    .fill("Ja, fertiges Außenmaß 800 mm.");
  await panel
    .getByRole("button", { name: "Noch nicht bekannt", exact: true })
    .nth(1)
    .click();
  await panel
    .getByRole("button", {
      name: "Antwort senden",
      exact: true,
    })
    .click();
  await expect.poll(()=>calls.length).toBe(2);
  expect(calls[1].message).toContain('800 mm');
  await expect(panel.locator("#assistant-message")).toHaveValue(/800 mm/);
  await expect(panel.locator("#assistant-message")).toHaveValue(
    /Noch nicht bekannt/,
  );
  expect(calls).toHaveLength(2);
  await panel.locator(".reply-assumptions>summary").click();
  await expect(panel.locator(".reply-assumptions")).toContainText(
    "nicht bestätigt",
  );
  await shot(page, "clarification-desktop");
  await audit(page, "#assistant-drawer");
  await expect.poll(() => calls.length).toBe(2);
  await expect(
    panel.getByRole("button", { name: "Anfrage abbrechen", exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Anfrage abbrechen", exact: true })
    .click();
  await expect(panel.locator("#assistant-message")).toBeEnabled();
  await expect(panel.locator("#assistant-message")).toHaveValue(/800 mm/);
  await expect(panel).toContainText("kann Kosten verursachen");
  await panel
    .locator("#assistant-message")
    .fill("Aktuellen Stand erneut prüfen.");
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  await expect(panel).toContainText("Neue Anfrage nach dem Abbruch bestätigt.");
  expect(calls[2].history.filter((m: any) => m.role === "user")).toHaveLength(
    1,
  );
  await pending
    ?.fulfill({
      json: { ok: true, result: { text: "DIESE ALTE ANTWORT NICHT ZEIGEN" } },
    })
    .catch(() => {});
  await expect(panel).not.toContainText("DIESE ALTE ANTWORT");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(
    panel.getByRole("button", { name: "Senden", exact: true }),
  ).toBeInViewport();
  await shot(page, "clarification-mobile");
  await audit(page, "#assistant-drawer");
  await panel
    .getByRole("button", { name: "Assistent schließen", exact: true })
    .click();
});

test("Steinmetz: exact text diff, real proposal application, inline undo and normal Studio undo preserve revisions", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page, "PLANNER");
  const plan = await createPlan(page, "memorial");
  await addStone(page);
  await page
    .locator(".planning-steps")
    .getByRole("button", { name: /Inschrift & Details/ })
    .click();
  await page
    .locator(".step-actions")
    .getByRole("button", { name: "Beschriftung anlegen", exact: true })
    .click();
  const dialog = page.getByRole("dialog"),
    literal = "Anna Müller\n* 12.03.1948  † 01.01.2025",
    updated = "Anna Müller\n* 12.03.1948  † 02.01.2025";
  await dialog
    .getByLabel("Wörtlicher Text / Namen und Daten", { exact: true })
    .fill(literal);
  const saving = savedResponse(page);
  await dialog
    .getByRole("button", { name: "In den Plan übernehmen", exact: true })
    .click();
  await saving;
  let calls = 0;
  await page.route("**/api/v1/ai/chat", async (route) => {
    const body = route.request().postDataJSON(),
      state = await head(plan.variant.id),
      text = state.snapshot.elements.find((e: any) => e.kind === "inscription");
    const ops =
      calls++ === 0
        ? [
            {
              type: "set_inscription_text",
              elementId: text.id,
              exactText: updated,
            },
            {
              type: "set_design_target",
              measureId: text.requestedHeightMeasureId,
              valueMm: "42.5",
            },
          ]
        : [
            {
              type: "set_inscription_layout",
              elementId: text.id,
              originUV: { uMm: "420", vMm: "620" },
            },
          ];
    const proposal = await persistProposal(body, ops);
    await route.fulfill({
      json: {
        ok: true,
        result: {
          text: "Die konkrete Änderung steht in der Vorschau.",
          proposal,
          missingInputs: [],
          assumptions: [],
        },
      },
    });
  });
  const panel = await openAssistant(page);
  await panel
    .getByRole("button", { name: "Bearbeitungsgrenzen ändern", exact: true })
    .click();
  await expect(
    panel.getByLabel("Maßwerte beibehalten", { exact: true }),
  ).not.toBeChecked();
  await expect(
    panel.getByLabel("Wortlaut beibehalten", { exact: true }),
  ).not.toBeChecked();
  await panel.getByLabel("Wortlaut beibehalten", { exact: true }).uncheck();
  await panel.getByLabel("Maßwerte beibehalten", { exact: true }).uncheck();
  await panel
    .locator("#assistant-message")
    .fill(
      "Sterbedatum bewusst korrigieren und Schrifthöhe auf 42,5 mm setzen.",
    );
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  await expect(panel.locator(".planning-proposal")).toContainText("01.01.2025");
  await expect(panel.locator(".planning-proposal")).toContainText("02.01.2025");
  await expect(panel.locator(".planning-proposal")).toContainText("42,5 mm");
  await expect(panel.locator(".preview-pair svg")).toHaveCount(2);
  await shot(page, "proposal-before-after");
  await audit(page, "#assistant-drawer");
  await panel
    .getByRole("button", { name: "Geprüften Vorschlag anwenden", exact: true })
    .click();
  await expect(panel).toContainText("Vom Server bestätigt angewendet.");
  expect(
    (await head(plan.variant.id)).snapshot.elements.find(
      (e: any) => e.kind === "inscription",
    ).exactText,
  ).toBe(updated);
  await panel
    .getByRole("button", { name: "KI-Änderung rückgängig", exact: true })
    .click();
  await expect(panel).toContainText(
    "Änderung zurückgenommen und als neuer Stand gespeichert.",
  );
  expect(
    (await head(plan.variant.id)).snapshot.elements.find(
      (e: any) => e.kind === "inscription",
    ).exactText,
  ).toBe(literal);
  await panel
    .getByRole("button", { name: "Bearbeitungsgrenzen ändern", exact: true })
    .click();
  await panel.getByLabel("Wortlaut beibehalten", { exact: true }).check();
  await panel.getByLabel("Maßwerte beibehalten", { exact: true }).check();
  await panel
    .locator("#assistant-message")
    .fill("Inschrift nur auf der Fläche verschieben.");
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  await panel
    .getByRole("button", { name: "Geprüften Vorschlag anwenden", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "KI-Änderung rückgängig", exact: true }),
  ).toBeEnabled();
  await panel
    .getByRole("button", { name: "Assistent schließen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Rückgängig", exact: true }),
  ).toBeEnabled();
  let persisted = savedResponse(page);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await persisted;
  expect(
    (await head(plan.variant.id)).snapshot.elements.find(
      (e: any) => e.kind === "inscription",
    ).originUV,
  ).not.toEqual({ uMm: "420", vMm: "620" });
  persisted = savedResponse(page);
  await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
  await persisted;
  expect(
    (await head(plan.variant.id)).snapshot.elements.find(
      (e: any) => e.kind === "inscription",
    ).originUV,
  ).toEqual({ uMm: "420", vMm: "620" });
  await page.getByRole("button", { name: "Assistent", exact: true }).click();
  await panel
    .getByRole("button", { name: "KI-Änderung rückgängig", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("weitergearbeitet");
  expect(
    (await head(plan.variant.id)).snapshot.elements.find(
      (e: any) => e.kind === "inscription",
    ).originUV,
  ).toEqual({ uMm: "420", vMm: "620" });
  await shot(page, "undo-later-work-protected");
  await page.reload();
  await expect(page.locator(".lettering-preview text")).toHaveText(
    literal.split("\n"),
  );
});

test("AI: a response based on an earlier plan is labeled stale and cannot be applied", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page, "PLANNER");
  const plan = await createPlan(page, "memorial");
  await addStone(page);
  let delayed: Route | null = null,
    body: any;
  await page.route("**/api/v1/ai/chat", (route) => {
    delayed = route;
    body = route.request().postDataJSON();
  });
  const panel = await openAssistant(page);
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  await expect.poll(() => !!delayed).toBe(true);
  await panel
    .getByRole("button", { name: "Assistent schließen", exact: true })
    .click();
  const thickness = page.getByLabel("Materialstärke", { exact: false }).first(),
    saving = savedResponse(page);
  await thickness.fill("190");
  await thickness.press("Tab");
  await saving;
  await page.getByRole("button", { name: "Assistent", exact: true }).click();
  const original = await withTenant(actor, (db) =>
      one<any>(db, "SELECT snapshot FROM design_revisions WHERE id=$1", [
        body.context.planning_work.revision_id,
      ]),
    ),
    stone = original.snapshot.elements.find(
      (e: any) => e.kind === "stone_piece",
    ),
    proposal = await persistProposal(body, [
      {
        type: "set_design_target",
        measureId: stone.thicknessMeasureId,
        valueMm: "180",
      },
    ]);
  await delayed!.fulfill({
    json: {
      ok: true,
      result: { text: "Antwort zum früheren Stand.", proposal },
    },
  });
  await expect(panel.locator(".reply-stale")).toBeVisible();
  await expect(
    panel.getByRole("button", {
      name: "Geprüften Vorschlag anwenden",
      exact: true,
    }),
  ).toBeDisabled();
  const state = await head(plan.variant.id);
  expect(state.snapshot.measurements[stone.thicknessMeasureId].valueMm).toBe(
    "190",
  );
  await shot(page, "stale-proposal");
});

test("Room studio: first AI draft is reviewable and reversible, technical helpers stay available on demand", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page, "PLANNER");
  const plan = await createPlan(page, "room_plan");
  await page.route("**/api/v1/ai/chat", async (route) => {
    const body = route.request().postDataJSON(),
      operations = planningDraftOperations(
        { snapshot: plan.revision.snapshot },
        {
          kind: "rectangular_room",
          label: "TEST Bad",
          clearWidthMm: "4200",
          clearDepthMm: "3200",
          heightMm: "2600",
          wallThicknessMm: "200",
        },
      ),
      proposal = await persistProposal(body, operations, true);
    await route.fulfill({
      json: {
        ok: true,
        result: {
          text: "Entwurf mit den von Ihnen angegebenen lichten Innenmaßen.",
          proposal,
        },
      },
    });
  });
  const panel = await openAssistant(page);
  await panel
    .locator("#assistant-message")
    .fill(
      "Bad mit lichten Innenmaßen 4200 × 3200 mm, Höhe 2600 mm, Wandstärke 200 mm anlegen.",
    );
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  await expect(panel.locator(".planning-proposal")).toContainText("2600 mm");
  await panel
    .getByRole("button", { name: "Geprüften Vorschlag anwenden", exact: true })
    .click();
  await expect(panel).toContainText("Vom Server bestätigt angewendet.");
  await panel
    .getByRole("button", { name: "Assistent schließen", exact: true })
    .click();
  await studioPanel(page,"elements");await expect(page.locator(".element-tree .subtle")).toHaveCount(0);
  await page.getByLabel(/Technische Hilfselemente/).check();
  await expect(page.locator(".element-tree .subtle")).toHaveCount(4);
  await page.getByLabel(/Technische Hilfselemente/).uncheck();
  await page.getByLabel("Elemente suchen", { exact: true }).fill("Bezug");
  await expect(page.locator(".element-tree .subtle")).toHaveCount(4);
  await page.getByLabel("Elemente suchen", { exact: true }).fill("");
  await shot(page, "room-reduced-elements");
  await audit(page, ".studio-root");
  await page.getByRole("button", { name: "Assistent", exact: true }).click();
  await panel
    .getByRole("button", { name: "KI-Änderung rückgängig", exact: true })
    .click();
  await expect(panel).toContainText("Änderung zurückgenommen");
  expect((await head(plan.variant.id)).snapshot.elements).toHaveLength(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Raum anlegen", exact: true }),
  ).toBeVisible();
});

test("Backoffice: structured draft feedback, safe cancellation and mobile footer remain usable", async ({
  page,
}) => {
  test.setTimeout(150000);
  await login(page, "OFFICE");
  const customer = await command(page, "crm.customer.create", {
    name: "TEST · Rückfragen Büro " + randomUUID().slice(0, 6),
    party_type: "person",
  });
  await page.goto("/quotes?create=1&customer_id=" + customer.id);
  const editor = page.getByRole("dialog");
  await editor.locator("#field-title").fill("TEST · KI-Rückfragen");
  await editor
    .getByRole("button", { name: "Position hinzufügen", exact: true })
    .click();
  await editor.locator("#line-description-0").fill("Waschtischplatte");
  await editor.locator("#line-quantity-0").fill("1");
  await editor.locator("#line-price-0").fill("250,50");
  await editor.locator("#line-tax-0").fill("19");
  let calls: any[] = [],
    delayed: Route | null = null;
  await page.route("**/api/v1/ai/chat", async (route) => {
    calls.push(route.request().postDataJSON());
    if (calls.length === 2) {
      delayed = route;
      return;
    }
    await route.fulfill({
      json: {
        ok: true,
        result: {
          text: "Bitte die vereinbarte Oberfläche konkretisieren.",
          missingInputs: ["Welche Oberfläche wurde vereinbart?"],
          assumptions: ["Der Preis ist eine unbestätigte Eingabe."],
          skillsUsed: [
            {
              id: "schubert-office-drafts-de",
              label: "Büro & Entwürfe",
              version: "1.1.0",
              jurisdiction: "DE",
            },
          ],
        },
      },
    });
  });
  await editor.locator(".draft-review>summary").click();
  await editor
    .getByRole("button", { name: "Eingaben prüfen", exact: true })
    .click();
  await editor.getByText("Verwendete Fachhilfe", { exact: true }).click();
  await expect(editor.locator(".reply-skills")).toContainText(
    "Büro & Entwürfe",
  );
  await editor
    .getByLabel("Welche Oberfläche wurde vereinbart?", { exact: true })
    .fill("Geschliffen, vom Kunden bestätigt.");
  await editor.locator("#field-title").fill("TEST · Aktueller Formularstand");
  await expect(editor.locator(".review-stale")).toBeVisible();
  await editor.getByRole("button",{name:"Antwort senden",exact:true}).click();
  await expect.poll(() => !!delayed).toBe(true);
  expect(calls[1].message).toContain("Geschliffen, vom Kunden bestätigt.");
  expect(calls[1].context.editor.values.title).toBe(
    "TEST · Aktueller Formularstand",
  );
  await editor
    .getByRole("button", { name: "Anfrage abbrechen", exact: true })
    .click();
  await expect(
    editor.getByLabel("Ergänzung für die nächste Prüfung", { exact: true }),
  ).toHaveValue(/Geschliffen/);
  await delayed!
    .fulfill({
      json: { ok: true, result: { text: "ALTE PRÜFUNG NICHT ANZEIGEN" } },
    })
    .catch(() => {});
  await expect(editor).not.toContainText("ALTE PRÜFUNG");
  await page.setViewportSize({ width: 375, height: 812 });
  await editor.locator(".record-editor-footer").scrollIntoViewIfNeeded();
  const close = editor
    .locator(".record-editor-footer")
    .getByRole("button", { name: "Abbrechen", exact: true });
  expect((await close.boundingBox())!.width).toBeGreaterThanOrEqual(90);
  await expect(close).toBeInViewport();
  await shot(page, "office-mobile-footer");
  await editor.locator(".draft-review").scrollIntoViewIfNeeded();
  await shot(page, "office-mobile-clarification");
  await audit(page, ".modal");
  await expect(editor.locator("#line-price-0")).toHaveValue("250,50");
});

test("Design consistency: real dark preference, compact help, reduced motion and short mobile screens", async ({
  page,
}) => {
  test.setTimeout(150000);
  await login(page, "PLANNER");
  await page.goto("/account");
  const settings = page.locator(".appearance-settings");
  await expect(settings).toBeVisible();
  const previous = {
    mode: await settings.locator(".mode-choices input:checked").inputValue(),
    accent: await settings
      .locator(".accent-choices input:checked")
      .inputValue(),
  };
  try {
    await settings.locator('.mode-choices input[value="dark"]').check();
    if (previous.mode !== "dark") {
      await settings
        .getByRole("button", { name: "Darstellung speichern", exact: true })
        .click();
      await expect(settings.getByRole("status")).toContainText("gespeichert");
    }
    await expect(page.locator(".app-shell")).toHaveAttribute(
      "data-appearance-mode",
      "dark",
    );
    await createPlan(page, "memorial");
    await addStone(page);
    await page.route("**/api/v1/ai/chat", (route) =>
      route.fulfill({
        json: {
          ok: true,
          result: {
            text: "Bitte vor der Planung die Grundlage klären.",
            missingInputs: ["Sind die Maße am Einbauort geprüft?"],
            assumptions: ["Die angegebenen Maße sind Planmaße."],
          },
        },
      }),
    );
    const panel = await openAssistant(page);
    await panel.getByRole("button", { name: "Senden", exact: true }).click();
    await expect(
      panel.getByRole("heading", { name: "Noch zu klären", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveAttribute(
      "data-appearance-mode",
      "dark",
    );
    await shot(page, "ai-dark-desktop");
    await audit(page, "#assistant-drawer");
    await panel
      .locator(".assistant-messages")
      .evaluate((node) => (node.scrollTop = 60));
    const lastRead = await panel
      .locator(".assistant-messages")
      .evaluate((node) => node.scrollTop);
    await panel
      .getByRole("button", { name: "Hilfe für diese Seite", exact: true })
      .click();
    await panel
      .getByRole("button", { name: "Kurzhilfe verwenden", exact: true })
      .click();
    await expect(panel.locator(".companion-guide").first()).not.toHaveAttribute(
      "open",
      "",
    );
    await expect(
      panel.getByRole("button", {
        name: "Mehr Erklärung anzeigen",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: /^Chat/ }).click();
    await expect
      .poll(() =>
        panel.locator(".assistant-messages").evaluate((node) => node.scrollTop),
      )
      .toBe(lastRead);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const size of [
      { width: 375, height: 812 },
      { width: 320, height: 640 },
    ]) {
      await page.setViewportSize(size);
      await expect(
        panel.getByRole("button", { name: "Senden", exact: true }),
      ).toBeInViewport();
      await expect(panel.locator(".assistant-messages")).toBeInViewport();
      await shot(page, "ai-dark-mobile-" + size.width);
      await audit(page, "#assistant-drawer");
    }
    await panel
      .getByRole("button", { name: "Bearbeitungsgrenzen ändern", exact: true })
      .click();
    await expect(
      panel.getByLabel("Nur Auswahl bearbeiten", { exact: true }),
    ).toBeFocused();
    await panel
      .getByRole("button", { name: "Zur Nachricht", exact: true })
      .click();
    await expect(panel.locator("#assistant-message")).toBeFocused();
    await expect(
      panel.getByRole("button", { name: "Senden", exact: true }),
    ).toBeInViewport();
    await expect(panel).toHaveCSS("animation-name", "none");
    await panel
      .getByRole("button", { name: "Assistent schließen", exact: true })
      .focus();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(
      page.locator(".tool-hint .selection-properties"),
    ).toHaveText("Natursteinbauteil");
  } finally {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/account");
    await settings
      .locator('.mode-choices input[value="' + previous.mode + '"]')
      .check();
    await settings
      .locator('.accent-choices input[value="' + previous.accent + '"]')
      .check();
    const save = settings.getByRole("button", {
      name: "Darstellung speichern",
      exact: true,
    });
    if (await save.isEnabled()) {
      await save.click();
      await expect(settings.getByRole("status")).toContainText("gespeichert");
    }
    await expect(page.locator(".app-shell")).toHaveAttribute(
      "data-appearance-mode",
      previous.mode,
    );
  }
});
