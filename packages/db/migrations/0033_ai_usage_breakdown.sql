-- Additive telemetry only. Historical calls retain their original accounting.
ALTER TABLE ai_runs ADD COLUMN task_type text;
ALTER TABLE ai_runs ADD COLUMN usage_details jsonb;
ALTER TABLE ai_runs ADD COLUMN pricing_snapshot jsonb;
ALTER TABLE ai_runs ADD COLUMN cost_basis text CHECK (cost_basis IN ('configured_estimate','provider_confirmed','no_charge'));
CREATE INDEX ai_runs_usage_month ON ai_runs(tenant_id,legal_entity_id,created_at DESC);
