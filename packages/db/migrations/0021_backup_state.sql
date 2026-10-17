CREATE TABLE backup_states(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'dirty',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 dirty_version bigint NOT NULL DEFAULT 0,backed_version bigint NOT NULL DEFAULT 0,last_changed_at timestamptz NOT NULL DEFAULT now(),last_snapshot_at timestamptz,last_manifest_id uuid,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,legal_entity_id));
ALTER TABLE backup_states ENABLE ROW LEVEL SECURITY;ALTER TABLE backup_states FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON backup_states USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON backup_states TO schubert_app;END IF;END $$;
CREATE UNIQUE INDEX one_active_backup_per_entity ON job_runs(tenant_id,legal_entity_id,job_type) WHERE job_type='backup.create' AND status IN('pending','retry','running');
