import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { planningDraftOperations } from '@schubert/ai';
import { login } from './login.js';

async function command(page: Page, name: string, payload: Record<string, unknown>, row?: { id: string; version: number }) {
  const response = await page.request.post('/api/v1/commands', {
    headers: { origin: new URL(page.url()).origin },
    data: { name, payload, id: row?.id, expectedVersion: row?.version, idempotencyKey: randomUUID() },
  });
  const body = await response.json();
  expect(response.status(), name + ' ' + (body.error?.message ?? '')).toBe(200);
  return body.result;
}

test('Office to workshop handoff keeps the approval pinned and prefills a personal time entry', async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, 'OWNER');
  const marker = randomUUID().slice(0, 7);
  const customer = await command(page, 'crm.customer.create', {
    name: 'TEST · Kontakt ' + marker, party_type: 'person', phone: '089 555 0412',
    street: 'TEST 12', postal_code: '85435', city: 'Erding', country: 'DE',
  });
  const order = await command(page, 'sales.order.create', {
    title: 'TEST · Aufmaß ' + marker, customer_id: customer.id, currency: 'EUR',
    lines: [{ description: 'Aufmaß und Planung', quantity: '1', unit: 'piece', unit_price: '200', tax_rate: '19' }],
  });
  await command(page, 'sales.order.confirm', {}, order);
  const workPackage = await command(page, 'projects.package.create', {
    name: 'Aufmaß vor Ort', order_id: order.id, kind: 'survey', unit: 'h',
  });
  const name = 'TEST · Badezimmer ' + marker;
  const plan = await command(page, 'planning.project.create', { name, kind: 'room_plan', order_id: order.id });
  const change = await command(page, 'planning.design.change', {
    base_revision_id: plan.revision.id,
    operations: planningDraftOperations({ snapshot: plan.revision.snapshot }, {
      kind: 'rectangular_room', label: 'Bad', clearWidthMm: '4600', clearDepthMm: '3400', heightMm: '2600', wallThicknessMm: '180',
    }),
  }, plan.variant);
  await command(page, 'planning.approval.create', {
    variant_id: plan.variant.id, revision_id: change.revision.id, kind: 'design', statement: 'Die geprüfte Fassung ist zur Abstimmung freigegeben.',
  });

  const berlinDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
  const day = berlinDay.format(new Date());
  const slot = Date.parse(day + 'T12:00:00Z') + (parseInt(marker, 16) % 450) * 60_000;
  const assignment = await command(page, 'workforce.dispatch.create', {
    title: 'TEST · Einsatz ' + marker, order_id: order.id, employee_id: process.env.TEST_WORKSHOP_EMPLOYEE_ID!,
    work_package_id: workPackage.id, starts_at: new Date(slot).toISOString(),
    ends_at: new Date(slot + 5 * 60_000).toISOString(), location: 'Steinweg 12, 85435 Erding',
  });
  await command(page, 'workforce.dispatch.confirmed', {}, assignment);

  await login(page, 'OFFICE');
  await page.goto('/orders/' + order.id);
  const handoff = page.locator('.order-next');
  await expect(handoff.getByRole('heading')).toHaveText('Aufmaß offen');
  await expect(handoff.getByRole('link', { name: 'Plan öffnen' })).toHaveAttribute('href', '/studio/' + plan.project.id);

  await login(page, 'PLANNER');
  await page.goto('/studio/' + plan.project.id + '?variant=' + plan.variant.id);
  await page.locator('#studio-project-actions').click();
  await page.locator('#studio-project-menu').getByRole('button', { name: /^PDF-Vorschau prüfen/ }).click();
  const review = page.getByRole('dialog', { name: 'Planungs-PDF prüfen' });
  await expect(review.getByText('Maßansichten der gespeicherten Revision ' + change.revision.revision_number)).toBeVisible();
  const finding = review.locator('.review-finding').filter({ hasText: '3.580 · Achse' }).first();
  await expect(finding).toBeVisible();
  const previous = await review.getByRole('img').getAttribute('viewBox');
  await finding.click();
  await expect(review.getByRole('img')).not.toHaveAttribute('viewBox', previous!);
  await expect(finding).toHaveAttribute('aria-pressed', 'true');
  const audit = await new AxeBuilder({ page }).include('.pdf-review').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(audit.violations.filter(result => ['critical','serious'].includes(result.impact ?? ''))).toEqual([]);
  await mkdir('work/go-evidence', { recursive: true });
  await page.screenshot({ path: 'work/go-evidence/pdf-review.png', animations: 'disabled' });
  await review.getByRole('button', { name: 'Vorschau schließen' }).click();
  const laterDraft = await command(page, 'planning.revision.checkpoint', {
    base_revision_id: change.revision.id, name: 'Test · Noch nicht freigegeben',
  }, change.variant);

  await page.setViewportSize({ width: 320, height: 760 });
  await login(page, 'WORKSHOP');
  await page.getByRole('link', { name: assignment.title, exact: true }).click();
  await expect(page).toHaveURL('/assignments/' + assignment.id);
  await expect(page.getByRole('heading', { name: assignment.title })).toBeVisible();
  await expect(page.getByText('Steinweg 12, 85435 Erding', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '089 555 0412', exact: true })).toHaveAttribute('href', 'tel:0895550412');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  await page.screenshot({ path: 'work/go-evidence/assignment-mobile.png', animations: 'disabled' });
  const approved = '/api/v1/assignments/' + assignment.id + '/plans/' + change.revision.id;
  await expect(page.getByRole('link', { name: new RegExp('^' + name) })).toHaveAttribute('href', approved);
  const pdf = await page.request.get(approved);
  expect(pdf.ok()).toBe(true);
  expect(pdf.headers()['content-disposition']).toContain('inline');
  const bytes = await pdf.body();
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(3);
  await writeFile('work/go-evidence/assigned-room-plan.pdf', bytes);
  const draftPdf = await page.request.get('/api/v1/assignments/' + assignment.id + '/plans/' + laterDraft.revision.id);
  expect(draftPdf.status()).toBe(404);

  await page.getByRole('link', { name: 'Zeit nachtragen', exact: true }).click();
  const manual = page.getByRole('dialog', { name: 'Zeit nachtragen', exact: true });
  await expect(manual.locator('#manual-date')).toHaveValue(day);
  await expect(manual.locator('#manual-start')).toHaveValue('');
  await expect(manual.locator('#manual-end')).toHaveValue('');
  await expect(manual.locator('#manual-order')).toHaveValue(order.id);
  const entryDay = berlinDay.format(new Date(Date.now() - (2 + parseInt(marker, 16) % 17) * 86_400_000));
  await manual.locator('#manual-date').fill(entryDay);
  await manual.locator('#manual-start').fill('08:14');
  await manual.locator('#manual-end').fill('08:25');
  await manual.getByRole('radio', { name: '0', exact: true }).check();
  await manual.locator('#manual-note').fill('Synthetischer Test · Aufmaß erfasst.');
  const response = page.waitForResponse(result => result.request().method() === 'POST' &&
    new URL(result.url()).pathname === '/api/v1/commands' &&
    result.request().postDataJSON()?.name === 'workforce.time.manual');
  await manual.getByRole('button', { name: 'Zeitraum speichern', exact: true }).click();
  const saved = await response;
  const receipt = await saved.json();
  expect(saved.status(), receipt.error?.message).toBe(200);
  expect(saved.request().postDataJSON().payload.order_id).toBe(order.id);
  expect(receipt.result.employee_id).toBe(process.env.TEST_WORKSHOP_EMPLOYEE_ID);
  await expect(manual).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'Die nacherfasste Zeit wurde gespeichert.' })).toBeVisible();
  await expect(page.locator('#time-day')).toHaveValue(entryDay);
  await expect(page.locator('.time-segment').filter({ hasText: order.title })).toBeVisible();
  await login(page, 'EMPLOYEE');
  await page.goto('/assignments/' + assignment.id);
  await expect(page.getByRole('alert').filter({ hasText: 'Einsatz ist nicht verfügbar' })).toBeVisible();
  expect((await page.request.get(approved)).status()).toBe(404);
  await page.goto('/time?assignment=' + assignment.id);
  await expect(page.getByRole('dialog', { name: 'Zeit nachtragen', exact: true })).toBeHidden();
});
