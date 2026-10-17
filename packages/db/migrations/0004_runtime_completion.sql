CREATE TABLE invoice_artifacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid,
 number text,name text,title text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 invoice_id uuid NOT NULL,document_version_id uuid NOT NULL,kind text NOT NULL,content_hash text NOT NULL,
 archive_key text NOT NULL,storage_version_id text NOT NULL,retain_until timestamptz NOT NULL,lock_mode text NOT NULL,
 lock_verified_at timestamptz NOT NULL,profile text NOT NULL,validator text NOT NULL,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,invoice_id,kind),
 FOREIGN KEY(tenant_id,invoice_id)REFERENCES invoices(tenant_id,id),FOREIGN KEY(tenant_id,document_version_id)REFERENCES document_versions(tenant_id,id)
);
CREATE TABLE time_conflicts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid,
 number text,name text,title text,notes text,status text NOT NULL DEFAULT 'open',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 actor_id text NOT NULL,command_id text NOT NULL,raw_command jsonb NOT NULL,reason text NOT NULL,correction_id uuid,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,actor_id,command_id)
);
ALTER TABLE portal_token_index ADD COLUMN legal_entity_id uuid;
ALTER TABLE portal_session_index ADD COLUMN legal_entity_id uuid;
UPDATE portal_token_index i SET legal_entity_id=a.legal_entity_id FROM portal_accesses a WHERE a.id=i.portal_access_id;
UPDATE portal_session_index i SET legal_entity_id=a.legal_entity_id FROM portal_accesses a WHERE a.id=i.portal_access_id;
ALTER TABLE portal_declarations ADD COLUMN publication_id uuid;
ALTER TABLE portal_declarations ADD COLUMN idempotency_key text;
ALTER TABLE portal_declarations ADD COLUMN payload_hash text;
CREATE UNIQUE INDEX portal_declaration_idem_idx ON portal_declarations(tenant_id,portal_access_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE time_corrections ADD COLUMN original_command_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE time_corrections ADD COLUMN approved_at timestamptz;
ALTER TABLE time_corrections ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE time_account_ledger ADD COLUMN correction_id uuid;
ALTER TABLE labor_cost_ledger ADD COLUMN correction_id uuid;
ALTER TABLE labor_cost_ledger ALTER COLUMN allocation_id DROP NOT NULL;
ALTER TABLE time_account_ledger ALTER COLUMN submission_id DROP NOT NULL;
ALTER TABLE labor_cost_ledger ALTER COLUMN submission_id DROP NOT NULL;
CREATE UNIQUE INDEX time_correction_account_idx ON time_account_ledger(tenant_id,correction_id) WHERE correction_id IS NOT NULL;
CREATE INDEX time_correction_session_idx ON time_corrections(tenant_id,session_id,approved_at DESC) WHERE status='approved';
CREATE INDEX time_review_idx ON time_submissions(tenant_id,legal_entity_id,created_at) WHERE status='submitted';
CREATE INDEX time_correction_review_idx ON time_corrections(tenant_id,legal_entity_id,created_at) WHERE status='requested';
CREATE INDEX job_claim_idx ON job_runs(tenant_id,legal_entity_id,next_attempt_at,created_at) WHERE status IN('pending','retry','running');
CREATE INDEX outbox_pending_idx ON outbox_events(tenant_id,legal_entity_id,created_at) WHERE published_at IS NULL;
CREATE INDEX reauth_session_lookup_idx ON reauth_sessions(tenant_id,user_id,session_id,confirmed_at DESC);
CREATE INDEX document_publication_idx ON portal_publications(tenant_id,portal_access_id,document_version_id) WHERE revoked_at IS NULL;
CREATE INDEX time_conflict_own_idx ON time_conflicts(tenant_id,actor_id,created_at DESC) WHERE status='open';
-- Authentication metadata is tenant scoped; business records also require the legal entity.
DO $$ DECLARE t record; BEGIN FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND EXISTS(SELECT 1 FROM information_schema.columns x WHERE x.table_schema='public' AND x.table_name=c.relname AND x.column_name='tenant_id') AND EXISTS(SELECT 1 FROM information_schema.columns x WHERE x.table_schema='public' AND x.table_name=c.relname AND x.column_name='legal_entity_id') AND c.relname NOT IN('bootstrap_state','memberships','legal_entities','portal_token_index','portal_session_index') LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t.relname);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t.relname);
 EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I',t.relname);
 EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id::text=current_setting(''app.tenant_id'',true) AND (legal_entity_id IS NULL OR legal_entity_id::text=current_setting(''app.legal_entity_id'',true))) WITH CHECK (tenant_id::text=current_setting(''app.tenant_id'',true) AND (legal_entity_id IS NULL OR legal_entity_id::text=current_setting(''app.legal_entity_id'',true)))',t.relname);
 END LOOP; END $$;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app')THEN
 GRANT SELECT,INSERT,UPDATE,DELETE ON invoice_artifacts,time_conflicts TO schubert_app;
END IF; END $$;
