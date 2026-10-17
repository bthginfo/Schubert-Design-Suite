ALTER TABLE retention_policies ADD COLUMN approved_at timestamptz, ADD COLUMN content_hash text, ADD COLUMN responsible_person text, ADD COLUMN source_reference text, ADD COLUMN previous_version_id uuid;
ALTER TABLE legal_holds ADD COLUMN released_by text, ADD COLUMN release_reason text;
ALTER TABLE deletion_tombstones ADD COLUMN entity_id uuid, ADD COLUMN related_ids uuid[] NOT NULL DEFAULT '{}', ADD COLUMN deletion_job_id uuid, ADD COLUMN independent_proof jsonb;
CREATE UNIQUE INDEX deletion_tombstone_job ON deletion_tombstones(tenant_id,legal_entity_id,deletion_job_id) WHERE deletion_job_id IS NOT NULL;
ALTER TABLE ai_runs ADD COLUMN source_document_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE ai_proposals ADD COLUMN ai_run_id uuid;
ALTER TABLE ai_proposals ADD FOREIGN KEY(tenant_id,ai_run_id) REFERENCES ai_runs(tenant_id,id);
CREATE INDEX ai_run_document_sources ON ai_runs USING gin(source_document_ids);
CREATE TABLE processing_purposes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'active',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 document_id uuid,party_id uuid,purpose text NOT NULL,legal_basis text NOT NULL,retain_until timestamptz,closed_at timestamptz,closed_by text,closure_reason text,
 UNIQUE(tenant_id,id),CHECK((document_id IS NOT NULL)::int+(party_id IS NOT NULL)::int=1),
 FOREIGN KEY(tenant_id,document_id) REFERENCES documents(tenant_id,id),FOREIGN KEY(tenant_id,party_id) REFERENCES parties(tenant_id,id));
ALTER TABLE processing_purposes ENABLE ROW LEVEL SECURITY;ALTER TABLE processing_purposes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON processing_purposes USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE INDEX processing_purpose_active ON processing_purposes(tenant_id,legal_entity_id,document_id,party_id) WHERE closed_at IS NULL;
CREATE FUNCTION protect_retention_policy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.status='approved' THEN RAISE EXCEPTION 'approved_retention_policy_immutable';END IF;RETURN NEW;END $$;
CREATE TRIGGER retention_policy_immutable BEFORE UPDATE OR DELETE ON retention_policies FOR EACH ROW EXECUTE FUNCTION protect_retention_policy();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON processing_purposes TO schubert_app;END IF;END $$;
