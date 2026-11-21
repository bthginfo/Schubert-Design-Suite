import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './login.js';
import { chooseSelect } from './select-choice.js';

const evidence = 'work/liquid-glass-review';
async function checkLayout(page: Page, selector: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  const result = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
}

test('Planning starts at the chosen task, previews entered dimensions and preserves edits through selection tools', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(evidence, { recursive: true });
  await login(page, 'PLANNER');
  await page.goto('/studio');
  const name = 'TEST · Bedienung und Glas ' + randomUUID().slice(0, 6);
  await page.getByLabel('Projektname', { exact: true }).fill(name);
  await page.getByRole('button', { name: /Grabmalstudio/ }).click();
  await chooseSelect(page, page.getByLabel('Vorhaben', { exact: false }), 'memorial_new');
  await expect(page.getByRole('button', { name: 'Mit Maßen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Planung beginnen', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ has: page.locator('.draft-preview') });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Breite (mm)', { exact: true }).fill('800');
  await dialog.getByLabel('Höhe (mm)', { exact: true }).fill('1200');
  await dialog.getByLabel('Materialstärke (mm)', { exact: true }).fill('160');
  await expect(dialog.getByRole('img', { name: 'Bauteilform aus den eingegebenen Maßen', exact: true })).toBeVisible();
  await expect(dialog.locator('.draft-preview dl')).toContainText('800');
  await page.screenshot({ path: evidence + '/stone-live-preview.png' });
  await checkLayout(page, 'dialog');
  await dialog.getByRole('button', { name: 'In den Plan übernehmen', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled({ timeout: 30_000 });
  const planUrl = page.url();
  await expect(page.getByRole('button', { name: 'Auswahl bearbeiten', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Auswahl einpassen', exact: true }).click();
  await expect(page.locator('.zoom-control span')).not.toHaveText('100 %');
  await page.getByRole('button', { name: 'Auswahl bearbeiten', exact: true }).click();
  await expect(page.locator('.inspector-section input:focus')).toHaveCount(1);
  await page.getByRole('button', { name: 'Auswahl duplizieren', exact: true }).click();
  await expect(page.locator('.plan-shape')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled({ timeout: 30_000 });
  await page.goto(planUrl);
  await expect(page.locator('.plan-shape')).toHaveCount(2);
  await page.locator('.plan-shape').first().focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
  await expect(page.locator('.studio-root')).toHaveClass(/is-fullscreen/);
  expect(await page.locator('.studio-root').evaluate(node => Math.abs(node.getBoundingClientRect().height - innerHeight))).toBeLessThanOrEqual(1);
  await page.screenshot({ path: evidence + '/planner-fullscreen.png' });
  await page.getByRole('button', { name: 'Vollbild beenden', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await checkLayout(page, '.studio-root');
  await expect(page.getByRole('button', { name: 'Auswahl bearbeiten', exact: true })).toBeVisible();
  await page.screenshot({ path: evidence + '/planner-mobile.png' });
});

test('Existing plan or photo opens the source workflow immediately after project creation', async ({ page }) => {
  await login(page, 'PLANNER');
  await page.goto('/studio');
  await page.getByRole('button', { name: /Raum & Naturstein/ }).click();
  await page.getByLabel('Projektname', { exact: true }).fill('TEST · Quellenstart ' + randomUUID().slice(0, 6));
  await page.getByRole('button', { name: 'Mit Plan / Foto', exact: true }).click();
  await page.getByRole('button', { name: 'Planung beginnen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Mit einer belegten Quelle beginnen.' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Raum anlegen', exact: true })).toBeVisible();
});

test('The office opens real draft forms from its main actions and stays readable in dark mode', async ({ page }) => {
  await login(page, 'OWNER');
  await page.goto('/office');
  await expect(page.locator('.hub-card')).toHaveCount(2);
  await expect(page.locator('.hub-row')).toHaveCount(4);
  await page.screenshot({ path: evidence + '/office-light.png' });
  await checkLayout(page, '.workspace-hub');
  await page.getByRole('link', { name: 'Angebot anlegen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Angebot anlegen', exact: true })).toBeVisible();
  await expect(page.locator('.editor-outline [aria-current="location"]')).toHaveCount(1);
  await checkLayout(page, '.modal');
  await page.screenshot({ path: evidence + '/quote-form.png' });
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.goto('/account');
  const appearance = page.locator('.appearance-settings');
  await appearance.getByRole('radio', { name: /^Dunkel / }).check();
  await appearance.getByRole('radio', { name: 'Hellblau', exact: true }).check();
  await appearance.getByRole('button', { name: 'Darstellung speichern', exact: true }).click();
  await expect(appearance.getByRole('status')).toContainText('gespeichert');
  try {
    await page.goto('/office');
    await expect(page.locator('.app-shell')).toHaveAttribute('data-appearance-mode', 'dark');
    await checkLayout(page, '.workspace-hub');
    await page.screenshot({ path: evidence + '/office-dark.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await checkLayout(page, '.workspace-hub');
    await page.screenshot({ path: evidence + '/office-mobile-dark.png' });
  } finally {
    await page.goto('/account');
    await appearance.getByRole('button', { name: 'Schubert-Standard auswählen' }).click();
    await appearance.getByRole('button', { name: 'Darstellung speichern', exact: true }).click();
    await expect(appearance.getByRole('status')).toContainText('gespeichert');
  }
});
