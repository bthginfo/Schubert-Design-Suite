import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { insert, one, rows, update, withTenant } from '@schubert/db';
import type { ActorContext } from '@schubert/contracts';
import { assistantAttachmentStatus, baseData, executeCommand, processPending, processOutbox } from '@schubert/application';

// This suite checks permissions, job recovery and status metadata in real PG.
// It does not pretend these metadata-only fixtures have been scanned or read by AI.
export async function usabilityDocumentIntegration(
  actor: (role: string) => ActorContext,
  test: (label: string, run: () => Promise<void>) => Promise<void>,
) {
  const office = actor('Office'), owner = actor('Owner');
  const envKeys = ['DOCUMENT_PROCESSING_WORKER_URL', 'DOCUMENT_WORKER_URL', 'RENDER_WORKER_URL', 'DOCUMENT_WORKER_SECRET', 'RENDER_WORKER_SECRET'];
  const prior = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const fixture = async (status = 'quarantine', scan = 'quarantine', jobStatus = 'failed') => withTenant(office, async db => {
    const base = baseData(office), hash = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    const blob = await insert(db, 'blob_objects', { ...base, storage_key: office.tenantId + '/synthetic-metadata-only/' + randomUUID(), provider: 'vercel_blob', content_hash: hash, mime_type: 'image/png', size_bytes: 90, scan_status: scan, status });
    const doc = await insert(db, 'documents', { ...base, name: 'TEST UAT Dateiprüfung · Metadaten', original_name: 'metadata-only.png', mime_type: 'image/png', size_bytes: 90, content_hash: hash, status, visibility: 'internal' });
    const version = await insert(db, 'document_versions', { ...base, document_id: doc.id, blob_object_id: blob.id, content_hash: hash, revision: 1, status });
    const current = await update(db, 'documents', doc.id, { current_version_id: version.id });
    const job = await insert(db, 'job_runs', { ...base, name: 'TEST Originalprüfung · kein Scan in Metadaten-Suite', job_type: 'document.ingest', payload: { documentId: doc.id, documentVersionId: version.id }, status: jobStatus, attempts: 5, last_error: 'TEST unterbrochener Prüfauftrag' });
    return { doc: current, version, blob, job };
  });
  const resume = (source: Awaited<ReturnType<typeof fixture>>, ctx = office, key = randomUUID(), versionId = source.version.id, expectedVersion = source.doc.version) => executeCommand(ctx, { name: 'documents.document.resume_processing', id: source.doc.id, expectedVersion, idempotencyKey: key, payload: { document_version_id: versionId } });
  try {
    for (const key of envKeys) delete process.env[key];
    await test('UAT missing document worker immediately reports unavailable and preserves the original', async () => {
      const source = await fixture();
      const status = await assistantAttachmentStatus(office, source.doc.id);
      assert.equal(status.status, 'unavailable'); assert.equal(status.can_retry, false); assert.match(status.message!, /Administration/);
      await assert.rejects(() => resume(source), (e: any) => e.code === 'DOCUMENT_PROCESSING_UNAVAILABLE');
      const saved = await withTenant(office, db => one<any>(db, 'SELECT status,attempts FROM job_runs WHERE id=$1', [source.job.id]));
      assert.deepEqual(saved, { status: 'failed', attempts: 5 });
    });
    // Enable configuration checks only; no provider/worker is invoked in this suite.
    process.env.DOCUMENT_PROCESSING_WORKER_URL = 'http://127.0.0.1:8084';
    process.env.DOCUMENT_WORKER_SECRET = 'synthetic-metadata-configuration-not-a-live-worker';
    await test('UAT Office can resume exactly its saved original once without recreating file, version or job', async () => {
      const source = await fixture(), key = randomUUID();
      const status = await assistantAttachmentStatus(office, source.doc.id);
      assert.equal(status.can_retry, true); assert.equal(status.document_version_id, source.version.id); assert.equal(status.version, source.doc.version);
      const result = await resume(source, office, key), replay = await resume(source, office, key);
      assert.equal(result.id, source.doc.id); assert.equal(result.job_id, source.job.id); assert.deepEqual(replay, JSON.parse(JSON.stringify(result)));
      const state = await withTenant(office, async db => ({
        jobs: await rows<any>(db, "SELECT id,status,attempts FROM job_runs WHERE job_type='document.ingest' AND payload->>'documentId'=$1", [source.doc.id]),
        versions: await rows<any>(db, 'SELECT id,status FROM document_versions WHERE document_id=$1', [source.doc.id]),
        events: await rows<any>(db, "SELECT id FROM outbox_events WHERE event_type='documents.document.resume_processing.v1' AND aggregate_id=$1", [source.doc.id]),
      }));
      assert.deepEqual(state.jobs, [{ id: source.job.id, status: 'pending', attempts: 0 }]);
      assert.deepEqual(state.versions, [{ id: source.version.id, status: 'quarantine' }]);
      assert.equal(state.events.length, 1);
    });
    await test('UAT a live scanner lease is never reset by a second user action', async () => {
      const source = await fixture('quarantine', 'quarantine', 'running');
      await withTenant(office, db => update(db, 'job_runs', source.job.id, { lease_until: new Date(Date.now() + 300000), fencing_token: 8, attempts: 2 }));
      assert.equal((await assistantAttachmentStatus(office, source.doc.id)).can_retry, false);
      await resume(source);
      const saved = await withTenant(office, db => one<any>(db, 'SELECT status,attempts,fencing_token FROM job_runs WHERE id=$1', [source.job.id]));
      assert.deepEqual(saved, { status: 'running', attempts: 2, fencing_token: '8' });
    });
    await test('UAT blocked original cannot be retried or mislabeled as paused', async () => {
      const source = await fixture('blocked', 'blocked');
      const status = await assistantAttachmentStatus(office, source.doc.id);
      assert.equal(status.status, 'blocked'); assert.equal(status.can_retry, false); assert.match(status.message!, /gesperrt/);
      await assert.rejects(() => resume(source), (e: any) => e.code === 'DOCUMENT_BLOCKED');
    });
    await test('UAT recovering a document does not grant access to an unassigned employee or another tenant', async () => {
      const source = await fixture();
      await assert.rejects(() => resume(source, actor('Employee')), (e: any) => e.status === 403 || e.status === 404);
      await assert.rejects(() => assistantAttachmentStatus({ ...office, tenantId: randomUUID() }, source.doc.id), (e: any) => e.status === 404);
      const saved = await withTenant(office, db => one<any>(db, 'SELECT status FROM job_runs WHERE id=$1', [source.job.id])); assert.equal(saved.status, 'failed');
    });
    await test('UAT resume is bound to the exact current version and cannot reset a different file job', async () => {
      const source = await fixture();
      const other = await withTenant(office, db => insert(db, 'job_runs', { ...baseData(office), name: 'TEST anderer Dateistand', job_type: 'document.ingest', payload: { documentId: source.doc.id, documentVersionId: randomUUID() }, status: 'failed', created_at: new Date(Date.now() + 1000) }));
      assert.equal((await resume(source)).job_id, source.job.id);
      const untouched = await withTenant(office, db => one<any>(db, 'SELECT status FROM job_runs WHERE id=$1', [other.id])); assert.equal(untouched.status, 'failed');
      await assert.rejects(() => resume(source, office, randomUUID(), randomUUID()), (e: any) => e.code === 'DOCUMENT_CHANGED');
      await assert.rejects(() => resume(source, office, randomUUID(), source.version.id, source.doc.version - 1), (e: any) => e.code === 'VERSION_CONFLICT');
    });
    await test('UAT an old event with a missing aggregate cannot block subsequent notifications or file processing', async () => {
      const event = await withTenant(owner, db => insert(db, 'outbox_events', { ...baseData(owner), event_type: 'sales.quote.accept.v1', aggregate_type: 'quotes', aggregate_id: randomUUID(), aggregate_version: 1, event_sequence: 0, actor_id: owner.actorId, correlation_id: owner.correlationId, payload: {}, status: 'pending', created_at: new Date('1999-01-01T00:00:00Z') }));
      await processOutbox(owner, 100);
      const state = await withTenant(owner, async db => ({ event: await one<any>(db, 'SELECT status,published_at FROM outbox_events WHERE id=$1', [event.id]), deliveries: await rows(db, 'SELECT id FROM notification_deliveries WHERE event_id=$1', [event.id]) }));
      assert.equal(state.event.status, 'published'); assert.ok(state.event.published_at); assert.equal(state.deliveries.length, 0);
    });
    await test('UAT targeted background processing completes only the requested job', async () => {
      const jobs = await withTenant(owner, async db => Promise.all([1, 2].map(index => insert(db, 'job_runs', { ...baseData(owner), name: 'TEST gezielter Systemtest ' + index, job_type: 'system.probe', payload: {}, status: 'pending' }))));
      await processPending(owner, 1, jobs[1].id);
      const saved = await withTenant(owner, db => rows<any>(db, 'SELECT id,status FROM job_runs WHERE id=ANY($1::uuid[]) ORDER BY id', [jobs.map(job => job.id)]));
      assert.equal(saved.find(job => job.id === jobs[0].id).status, 'pending'); assert.equal(saved.find(job => job.id === jobs[1].id).status, 'completed');
    });
  } finally {
    for (const key of envKeys) { if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key]; }
  }
}
