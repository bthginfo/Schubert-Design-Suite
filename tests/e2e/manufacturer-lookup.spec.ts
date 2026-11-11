import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { login } from "./login.js";

test("manufacturer lookup in the Companion and the Studio uses live catalog data", async ({ page }) => {
  test.skip(process.env.UAT_MANUFACTURER_LIVE !== "true", "Requires read access to the public manufacturer catalogs.");
  await login(page, "OWNER");
  await page.setViewportSize({ width: 390, height: 844 });
  let modelRequests = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/v1/ai/chat") modelRequests++;
  });
  const response = () => page.waitForResponse(item =>
    new URL(item.url()).pathname === "/api/v1/planning/manufacturer-products/search" && item.request().method() === "POST");

  await page.getByRole("button", { name: "Assistent", exact: true }).click();
  const assistant = page.locator("#assistant-drawer");
  await assistant.getByRole("button", { name: "Produkte", exact: true }).click();
  const input = assistant.getByRole("searchbox", { name: "Produktname, Artikelnummer oder Produktlink" });
  await input.fill("ME by Starck Duravit 233555AA00");
  const lookup = response();
  await input.press("Enter");
  expect((await lookup).status()).toBe(200);
  await expect(assistant.getByText("550 × 440 mm")).toBeVisible();
  await expect(assistant.getByRole("link", { name: "Zum Produkt" }).first()).toHaveAttribute("href", /duravit\.com\/de-de\/p\/.*233555/);
  expect(await assistant.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await assistant.getByRole("button", { name: "Assistent schließen" }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });

  const created = await page.request.post("/api/v1/commands", {
    headers: { origin: new URL(page.url()).origin },
    data: {
      name: "planning.project.create",
      payload: { name: "TEST Herstellersuche " + randomUUID().slice(0, 8), kind: "room_plan" },
      idempotencyKey: randomUUID(),
    },
  });
  expect(created.status()).toBe(200);
  const { project, variant } = (await created.json()).result;
  await page.goto("/studio/" + project.id + "?variant=" + variant.id);
  await page.getByRole("button", { name: /Herstellerdaten/ }).first().click();
  const studio = page.getByRole("dialog", { name: "Herstellerdaten auswählen" });
  await studio.getByRole("button", { name: "Beim Hersteller suchen" }).click();
  await studio.getByRole("searchbox", { name: "Produktname, Artikelnummer oder Produktlink" })
    .fill("https://catalog.geberit.de/de-DE/product/PRO_2694811");
  const variants = response();
  await studio.getByRole("button", { name: "Suchen", exact: true }).click();
  expect((await variants).status()).toBe(200);
  await expect(studio.getByText("Geberit · Art.-Nr. 502.774.00.1")).toBeVisible();
  await expect(studio.getByText("Geberit · Art.-Nr. 502.774.00.8")).toBeVisible();
  expect(modelRequests).toBe(0);
});
