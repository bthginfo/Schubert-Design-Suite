import { z } from 'zod';
import { one } from '@schubert/db';
import { assertVersion, requireRule } from '@schubert/domain';
import { register, getRecord } from './core.js';
import { assertDocumentAccess } from './document-access.js';

export function documentProcessingConfigured() {
  return !!((process.env.DOCUMENT_PROCESSING_WORKER_URL || process.env.DOCUMENT_WORKER_URL || process.env.RENDER_WORKER_URL) && (process.env.DOCUMENT_WORKER_SECRET || process.env.RENDER_WORKER_SECRET));
}

// A user may resume their accessible original's ingestion. This grants neither
// a clean scan nor access to arbitrary jobs, and keeps the original/version.
register('documents.document.resume_processing', 'documents.upload', async r => {
  const payload = z.strictObject({ document_version_id: z.uuid() }).parse(r.payload);
  const doc = await getRecord(r.db, 'documents', r.command.id, true);
  await assertDocumentAccess(r.db, r.ctx, doc, payload.document_version_id);
  assertVersion(doc.version, r.command.expectedVersion);
  requireRule(doc.current_version_id === payload.document_version_id && !doc.archived, 'DOCUMENT_CHANGED', 'Der Dateistand hat sich geändert. Die aktuelle Datei erneut auswählen.', 409);
  const version = await getRecord(r.db, 'document_versions', doc.current_version_id), blob = await getRecord(r.db, 'blob_objects', version.blob_object_id);
  if (doc.status === 'available' && version.status === 'available' && ['clean', 'trusted_generator'].includes(blob.scan_status)) return doc;
  requireRule(documentProcessingConfigured(), 'DOCUMENT_PROCESSING_UNAVAILABLE', 'Die Datei ist privat gespeichert. Die automatische Dateiprüfung ist noch nicht eingerichtet. Die Administration kann die Dokumentverarbeitung verbinden.', 503);
  requireRule(doc.status === 'quarantine' && version.status === 'quarantine' && blob.scan_status === 'quarantine', 'DOCUMENT_BLOCKED', 'Diese Datei wurde gesperrt. Eine korrigierte, unbedenkliche Originaldatei hochladen.');
  const job = await one<any>(r.db, "SELECT * FROM job_runs WHERE job_type='document.ingest' AND payload->>'documentId'=$1 AND payload->>'documentVersionId'=$2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE", [doc.id, version.id]);
  requireRule(job, 'DOCUMENT_PROCESSING_JOB', 'Der Prüfauftrag ist nicht mehr verfügbar. Die Administration kann den Dateistand prüfen.', 409);
  if (job.status === 'running' && job.lease_until && new Date(job.lease_until) > new Date()) return { ...doc, job_id: job.id };
  requireRule(['pending', 'retry', 'failed', 'unavailable', 'running'].includes(job.status), 'DOCUMENT_PROCESSING_STATE', 'Die Dateiprüfung kann in diesem Stand nicht erneut gestartet werden.', 409);
  await r.update('job_runs', job.id, { status: 'pending', attempts: 0, next_attempt_at: new Date(), lease_until: null, queued_at: null, last_error: null }, job.version);
  return { ...doc, job_id: job.id };
});
