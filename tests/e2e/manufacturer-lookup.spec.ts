import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { login } from "./login.js";

test("the manufacturer catalog supports article adoption, live lookup and official fallback", async ({ page }) => {
  test.skip(process.env.UAT_MANUFACTURER_LIVE !== "true", "Requires read access to the public manufacturer catalogs.");
  test.setTimeout(180_000);
  expect((await page.request.get("/api/v1/internal/manufacturer-catalog")).status()).toBe(401);
  await login(page, "OWNER");
  await page.setViewportSize({ width: 390, height: 844 });
  let modelRequests = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/v1/ai/chat") modelRequests++;
  });
  const response = (mode: "search" | "online", query: string) => page.waitForResponse(item =>
    new URL(item.url()).pathname === "/api/v1/planning/manufacturer-catalog/" + mode &&
    item.request().method() === "POST" && item.request().postDataJSON()?.query === query, { timeout: 60_000 });

  await page.getByRole("button", { name: "Assistent", exact: true }).click();
  const assistant = page.locator("#assistant-drawer");
  await assistant.getByRole("button", { name: "Produkte", exact: true }).click();
  await expect(assistant.getByRole("button", { name: "Im Katalog" })).toHaveAttribute("aria-pressed", "true");
  const catalogInput = assistant.getByRole("searchbox", { name: "Produktname, Artikelnummer oder GTIN" });
  const sku = "KEUCO 00450006000";
  await catalogInput.fill(sku);
  const catalog = response("search", sku);
  await catalogInput.press("Enter");
  const catalogResponse = await catalog;
  expect(catalogResponse.status()).toBe(200);
  const catalogData = (await catalogResponse.json()).result;
  const article = catalogData.items.find((item: { article: string }) => item.article === "00450006000");
  const provider = catalogData.providers.find((item: { id: string }) => item.id === "keuco");
  const card = assistant.getByRole("listitem").filter({ hasText: "Art.-Nr. 00450006000" });
  await expect(card.getByText("GTIN 4017214014095")).toBeVisible();
  await expect(card.getByText("153 mm")).toBeVisible();
  await card.getByRole("button", { name: "In Betriebskatalog übernehmen" }).click();
  const adopted = card.getByRole("link", { name: "Im Betriebskatalog" });
  await expect(adopted).toHaveAttribute("href", /^\/products\/[a-f0-9-]{36}$/);
  const productUrl = (await adopted.getAttribute("href"))!;
  expect((await page.request.get(productUrl)).status()).toBe(200);
  const repeated = await page.request.post("/api/v1/commands", {
    headers: { origin: new URL(page.url()).origin },
    data: {
      name: "catalog.manufacturer_reference.adopt",
      payload: { providerId: provider.id, referenceId: article.id, digest: provider.digest },
      idempotencyKey: randomUUID(),
    },
  });
  expect(repeated.status()).toBe(200);
  expect(productUrl).toBe("/products/" + (await repeated.json()).result.productId);

  await assistant.getByRole("button", { name: "Beim Hersteller suchen" }).click();
  const input = assistant.getByRole("searchbox", { name: "Produktname, Artikelnummer oder Produktlink" });
  const duravitQuery = "ME by Starck Duravit 233555AA00";
  await input.fill(duravitQuery);
  const lookup = response("online", duravitQuery);
  await input.press("Enter");
  expect((await lookup).status()).toBe(200);
  await expect(assistant.getByText("550 × 440 mm")).toBeVisible();
  await expect(assistant.getByRole("link", { name: "Zum Produkt" }).first()).toHaveAttribute("href", /duravit\.com\/de-de\/p\/.*233555/);
  expect(await assistant.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await assistant.getByRole("button", { name: "Assistent schließen" }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/products");
  await page.getByText("Herstellerkatalog durchsuchen", { exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Produktname, Artikelnummer oder GTIN" })).toBeVisible();

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
  await page.getByRole("button", { name: /Herstellerdaten/ }).first().click({ timeout: 45_000 });
  const studio = page.getByRole("dialog", { name: "Herstellerdaten auswählen" });
  await studio.getByRole("button", { name: "Produktkatalog", exact: true }).click();
  await expect(studio.getByRole("button", { name: "Im Katalog" })).toHaveAttribute("aria-pressed", "true");
  await studio.getByRole("button", { name: "Beim Hersteller suchen" }).click();
  const studioInput = studio.getByRole("searchbox", { name: "Produktname, Artikelnummer oder Produktlink" });
  const geberitUrl = "https://catalog.geberit.de/de-DE/product/PRO_2694811";
  await studioInput.fill(geberitUrl);
  const variants = response("online", geberitUrl);
  await studio.getByRole("button", { name: "Suchen", exact: true }).click();
  expect((await variants).status()).toBe(200);
  await expect(studio.getByText("Geberit · Art.-Nr. 502.774.00.1")).toBeVisible();
  await expect(studio.getByText("Geberit · Art.-Nr. 502.774.00.8")).toBeVisible();
  await studioInput.fill("VOLA 111");
  await studioInput.press("Enter");
  await expect(studio.getByRole("link", { name: "VOLA öffnen" })).toHaveAttribute("href", /^https:\/\/de\.vola\.com\//);
  const siteSearch = await studio.getByRole("link", { name: "Websuche auf der Hersteller-Domain" }).getAttribute("href");
  expect(new URL(siteSearch!).searchParams.get("q")).toBe("site:de.vola.com 111");
  expect(modelRequests).toBe(0);
});
