import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { login } from './login.ts';

test('real customer chat upload is scanned, readable at full size and remains in the customer file after closing', async ({ page }) => {
  test.skip(process.env.UAT_REAL_DOCUMENT_WORKER !== '1', 'Requires the actual private storage and document worker.');
  test.setTimeout(150000);
  await login(page, 'OFFICE');
  const created = await page.request.post('/api/v1/commands', { headers: { origin: new URL(page.url()).origin }, data: { name: 'crm.customer.create', idempotencyKey: crypto.randomUUID(), payload: { name: 'TEST UAT Chat-Kundenakte ' + crypto.randomUUID().slice(0, 8) } } });
  expect(created.ok()).toBe(true);
  const customer = (await created.json()).result;
  const sketch = await page.context().newPage();
  await sketch.setViewportSize({ width: 800, height: 1000 });
  await sketch.setContent('<!doctype html><html lang="de"><meta charset="utf-8"><body style="margin:0;background:white;color:#111;font-family:serif"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="white"/><text x="50" y="60" font-size="24">TEST · Fiktive Kundenzeichnung, kein Aufmaß</text><path d="M230 750 V240 Q400 90 570 240 V750 Z" fill="none" stroke="#222" stroke-width="4"/><text x="400" y="420" text-anchor="middle" font-size="32">Anna Müller</text><text x="400" y="480" text-anchor="middle" font-size="28">* 1948 · † 2025</text><text x="280" y="810" font-size="30">Breite 80 cm</text><text x="45" y="500" font-size="26">Höhe 120 cm</text><text x="240" y="890" font-size="28">Stärke 16 cm</text></svg></body></html>');
  const png = await sketch.screenshot(); await sketch.close();
  await page.goto('/customers/' + customer.id);
  await page.getByRole('button', { name: 'Assistent', exact: true }).click();
  const panel = page.locator('#assistant-drawer');
  await panel.getByRole('button', { name: /^Chat/ }).click();
  const upload = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/uploads' && response.request().method() === 'POST');
  await panel.locator('input[type=file]').setInputFiles({ name: 'TEST-Kundenskizze-80x120.png', mimeType: 'image/png', buffer: png });
  const original = (await (await upload).json()).result;
  expect(original.entity_type).toBe('customers'); expect(original.entity_id).toBe(customer.id);
  await expect(panel).toContainText('Neue Uploads werden bei „' + customer.name + '“ abgelegt');
  await expect(panel).toContainText('Bereit für die KI', { timeout: 100000 });
  const popup = page.waitForEvent('popup');
  await panel.getByRole('link', { name: 'Bildvorlage groß ansehen – öffnet einen neuen Tab', exact: true }).click();
  const enlarged = await popup;
  await enlarged.waitForLoadState();
  await expect.poll(() => enlarged.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 500 && image.naturalHeight > 500)).toBe(true);
  expect(enlarged.url()).toContain('/api/v1/documents/'); expect(enlarged.url()).toContain('version=');
  await enlarged.close();
  await panel.getByRole('button', { name: 'Assistent schließen', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /^Unterlagen 1/ }).click();
  await expect(page.locator(`a[href="/documents/${original.id}"]`)).toBeVisible();
  await mkdir('work/usability-2026-10-28/document-pipeline', { recursive: true });
  await page.screenshot({ path: 'work/usability-2026-10-28/document-pipeline/chat-sketch-kept-in-customer.png', fullPage: true });
  await writeFile('work/usability-2026-10-28/document-pipeline/real-chat-customer-upload.json', JSON.stringify({ customerId: customer.id, original: { id: original.id, entity_type: original.entity_type, entity_id: original.entity_id, content_hash: original.content_hash }, scannerAndPreview: 'actual worker, no mocked transport', liveModelCall: false }, null, 2));
});

test('real document worker blocks the EICAR test original and prevents retry or download', async ({ page }) => {
  test.skip(process.env.UAT_REAL_DOCUMENT_WORKER !== '1', 'Requires an actual private Blob store and ClamAV-backed worker; no simulated scan.');
  test.setTimeout(150000);
  await login(page, 'OFFICE');
  const uploaded = await page.evaluate(async () => {
    const created = await fetch('/api/v1/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'crm.customer.create', idempotencyKey: crypto.randomUUID(), payload: { name: 'TEST UAT ClamAV Dateischutz ' + crypto.randomUUID().slice(0, 8) } }) });
    const customer = (await created.json()).result;
    if (!created.ok || !customer?.id) throw Error('Der isolierte Testkunde konnte nicht angelegt werden.');
    // EICAR is the standard harmless antivirus test string, not executable malware.
    const sample = String.raw`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`;
    const form = new FormData();
    form.append('file', new File([sample], 'TEST-UAT-EICAR-antivirus.txt', { type: 'text/plain' }));
    form.append('entity_type', 'customers');
    form.append('entity_id', customer.id);
    const response = await fetch('/api/v1/uploads', { method: 'POST', body: form });
    return { status: response.status, body: await response.json() };
  });
  expect(uploaded.status).toBe(201);
  const original = uploaded.body.result;
  expect(original.status).toBe('quarantine');
  expect(typeof original.job_id).toBe('string');
  let state: any;
  await expect.poll(async () => {
    const response = await page.request.get('/api/v1/ai/attachments/' + original.id);
    expect(response.status()).toBe(200);
    state = (await response.json()).result;
    return state.status;
  }, { timeout: 100000, intervals: [1000, 2000] }).toBe('blocked');
  expect(state.can_retry).toBe(false);
  expect(state.message).toContain('gesperrt');
  const retry = await page.evaluate(async ({ original, state }) => {
    const response = await fetch('/api/v1/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'documents.document.resume_processing', id: original.id, expectedVersion: state.version, idempotencyKey: crypto.randomUUID(), payload: { document_version_id: state.document_version_id } }) });
    return { status: response.status, body: await response.json() };
  }, { original, state });
  expect(retry.status).toBe(422);
  expect(retry.body.error.code).toBe('DOCUMENT_BLOCKED');
  const download = await page.request.get('/api/v1/documents/' + original.id + '/download');
  expect(download.status()).toBe(409);
  expect((await download.json()).error.code).toBe('DOCUMENT_QUARANTINE');
  await mkdir('work/usability-2026-10-28/document-pipeline', { recursive: true });
  await writeFile('work/usability-2026-10-28/document-pipeline/real-eicar-blocked.json', JSON.stringify({ original: { id: original.id, job_id: original.job_id, current_version_id: original.current_version_id, content_hash: original.content_hash }, state, retry: { status: retry.status, code: retry.body.error.code }, download: { status: download.status() } }, null, 2));
});
