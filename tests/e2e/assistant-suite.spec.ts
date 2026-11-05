import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { login } from "./login.js";
import { planningDraftOperations } from "@schubert/ai";

async function command(page: Page, name: string, payload: Record<string, unknown>, row?: { id: string; version: number }) {
  const response = await page.request.post("/api/v1/commands", {
    headers: { origin: new URL(page.url()).origin },
    data: { name, payload, id: row?.id, expectedVersion: row?.version, idempotencyKey: randomUUID() },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).result;
}

async function chat(page: Page, text: string) {
  const panel = page.locator("#assistant-drawer");
  await panel.getByRole("textbox", { name: "Nachricht an den Assistenten" }).fill(text);
  const response = page.waitForResponse(request => new URL(request.url()).pathname === "/api/v1/ai/chat" && request.request().method() === "POST");
  await panel.getByRole("button", { name: "Senden", exact: true }).click();
  const result = await response;
  expect(result.status(), "Real chat API with loopback model transport").toBe(200);
  return (await result.json()).result;
}

test.beforeEach(async ({ page }) => {
  test.skip(process.env.UAT_AI_TOOL_PROVIDER !== "synthetic-local", "Requires the local synthetic SDK transport.");
  await login(page);
});

test("The floating chat finds a customer and saves a real invoice draft inside studio fullscreen", async ({ page }) => {
  const customer = await command(page, "crm.customer.create", {
    name: "TEST Kunde " + randomUUID().slice(0, 8), email: "suite-qa@example.invalid",
  });
  const order = await command(page, "sales.order.create", {
    title: "TEST Aufmaß und Zuschnitt", customer_id: customer.id, currency: "EUR",
    lines: [{ description: "Natursteinzuschnitt", quantity: "2", unit: "piece", unit_price: "100", tax_rate: "19" }],
  });
  const plan = await command(page, "planning.project.create", { name: "TEST Plan fürs Büro", kind: "memorial" });
  const path = "/studio/" + plan.project.id;
  await page.goto(path);
  await expect(page.locator(".studio-workspace")).toBeVisible();
  await page.getByRole("button", { name: "Vollbild", exact: true }).click();
  await expect(page.getByRole("button", { name: "Vollbild beenden" })).toBeVisible();
  const fab = page.getByRole("button", { name: "Assistent", exact: true });
  await expect(fab).toBeInViewport();
  await fab.click();
  const panel = page.locator("#assistant-drawer");
  await expect(panel.getByRole("button", { name: "Mit Seitenbezug" })).toHaveAttribute("aria-pressed", "true");
  const found = await chat(page, "TEST Suite Kunde " + customer.id);
  expect(found.recordLinks).toContainEqual(expect.objectContaining({ href: "/customers/" + customer.id }));
  await expect(panel.getByText("suite-qa@example.invalid", { exact: false })).toBeVisible();
  const invoice = await chat(page, "TEST Suite Rechnung " + order.id);
  expect(invoice.proposal.commands[0].input.customer_id).toBe(customer.id);
  await expect(panel.getByText("Natursteinzuschnitt", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Geprüften Vorschlag anwenden" }).click();
  await expect(panel.getByRole("link", { name: "TEST Rechnung aus dem Chat öffnen" })).toHaveAttribute("href", /\/invoices\/[\w-]+/);
  await expect(page).toHaveURL(new RegExp(path + "$"));
  await page.screenshot({ path: "work/suite-assistant-desktop.png", animations: "disabled" });
});

test("The same conversation follows navigation and previews a remote plan before saving", async ({ page }) => {
  const plan = await command(page, "planning.project.create", { name: "TEST Andere Planvariante", kind: "memorial" });
  const saved = await command(page, "planning.design.change", { base_revision_id: plan.revision.id,
    operations: planningDraftOperations({ snapshot: plan.revision.snapshot }, { kind: "memorial_slab", label: "Musterstein", widthMm: "800", heightMm: "1200", thicknessMm: "160" }),
  }, plan.variant);
  const customer = await command(page, "crm.customer.create", { name: "TEST Suite Mobil " + randomUUID().slice(0, 8), email: "suite-mobile@example.invalid" });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Assistent", exact: true }).click();
  const panel = page.locator("#assistant-drawer");
  await expect(panel.getByText("Suite-Chat · Daten dieser Seite sind ausgeblendet.")).toBeVisible();
  await chat(page, "TEST Suite Angebot " + customer.id);
  await panel.getByRole("button", { name: "Geprüften Vorschlag anwenden" }).click();
  await expect(panel.getByRole("link", { name: /öffnen$/ }).last()).toHaveAttribute("href", /\/quotes\//);
  await page.getByRole("link", { name: "SCHUBERT Design Suite · Heute", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(panel.getByText("Dieses Gespräch bleibt beim Seitenwechsel geöffnet.")).toBeVisible();
  await expect(panel.getByText("TEST Angebot aus dem Chat", { exact: true })).toBeVisible();
  await chat(page, "TEST Suite Plan " + saved.variant.id);
  const proposal = panel.locator(".assistant-proposal").last();
  await expect(proposal.getByRole("button", { name: "Geprüften Vorschlag anwenden" })).toBeDisabled();
  await proposal.getByRole("button", { name: "Planvorschau laden" }).click();
  await expect(proposal.getByRole("img", { name: "Vorher · Vorderansicht" })).toBeVisible();
  await expect(proposal.getByText("Im Suite-Chat benannt", { exact: true })).toBeVisible();
  await proposal.getByRole("button", { name: "Geprüften Vorschlag anwenden" }).click();
  await expect(proposal.getByRole("link", { name: "Plan öffnen" })).toHaveAttribute("href", "/studio/" + plan.project.id + "?variant=" + saved.variant.id);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toHaveAttribute("aria-modal", "true");
  const audit = await new AxeBuilder({ page }).include("#assistant-drawer").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: "work/suite-assistant-mobile.png", animations: "disabled" });
  await panel.getByRole("button", { name: "Assistent schließen" }).click();
  const fab = page.getByRole("button", { name: "Assistent", exact: true });
  await expect(fab).toBeInViewport();
  await expect(fab).toHaveCSS("position", "fixed");
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(fab).toBeInViewport();
});
