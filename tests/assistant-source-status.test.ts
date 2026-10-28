import { expect, it } from 'vitest';
import { assistantUploadTarget, sourceReady, sourceReferences, type AssistantSource } from '../apps/web/src/lib/client/assistant.ts';
import type { AppData } from '../apps/web/src/lib/client/types.ts';

it('keeps chat uploads in the resolved customer, order or planning record without guessing from URL text', () => {
  const data = { view: 'detail', context: { permissions: ['crm'] }, module: { slug: 'customers', permission: 'crm' }, detail: { id: 'actual-customer', name: 'Karin' }, summary: {}, path: 'customers/forged-url-id' } as AppData;
  expect(assistantUploadTarget(data)).toEqual({ entityType: 'customers', entityId: 'actual-customer', entityName: 'Karin' });
  data.context!.permissions = ['crm.read'];
  expect(assistantUploadTarget(data)).toBeUndefined();
  data.context!.permissions = ['planning']; data.view = 'studio'; data.module = undefined; data.detail = { id: 'actual-project', name: 'Grabmal' };
  expect(assistantUploadTarget(data)).toEqual({ entityType: 'studio', entityId: 'actual-project', entityName: 'Grabmal' });
  data.detail = undefined;
  expect(assistantUploadTarget(data)).toBeUndefined();
});

it('uploaded files cannot be sent while quarantined, paused or blocked, including text-only selection', () => {
  const row: AssistantSource = { key: 'source', documentId: 'saved-original', name: 'Skizze', pageNumber: 1, uploaded: true, includeImage: false };
  for (const stage of ['uploading', 'checking', 'preparing', 'paused', 'blocked'] as const) {
    row.stage = stage;
    expect(sourceReady(row)).toBe(false);
    expect(() => sourceReferences([row])).toThrow();
  }
  row.stage = 'ready';
  expect(sourceReferences([row])).toEqual([{ document_id: row.documentId, page_index: 0, include_image: false }]);
});
