ALTER TABLE job_runs ADD COLUMN queued_at timestamptz;
ALTER TABLE job_runs ADD COLUMN queue_message_id text;
CREATE INDEX job_dispatch_idx ON job_runs(tenant_id,legal_entity_id,next_attempt_at) WHERE status IN('pending','retry');
