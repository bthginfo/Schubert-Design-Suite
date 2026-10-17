ALTER TABLE legacy_id_map ADD COLUMN source_hash text;
ALTER TABLE documents ADD COLUMN original_path text,ADD COLUMN import_batch_id uuid;
ALTER TABLE import_batches ADD COLUMN source_document_version_id uuid,ADD COLUMN inventory_hash text,ADD COLUMN cutover_id uuid,ADD COLUMN is_final_delta boolean NOT NULL DEFAULT false;
CREATE TABLE import_archive_entries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'inventoried',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 batch_id uuid NOT NULL,path text NOT NULL,metadata jsonb NOT NULL,document_id uuid,content_hash text,target_type text,target_id uuid,last_error text,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,batch_id,path),FOREIGN KEY(tenant_id,batch_id) REFERENCES import_batches(tenant_id,id),FOREIGN KEY(tenant_id,document_id) REFERENCES documents(tenant_id,id));
CREATE TABLE migration_cutovers(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 source_system text NOT NULL,source_fence_kind text,source_fence_statement text,source_watermark text,evidence_document_version_id uuid,
 fenced_at timestamptz,source_totals jsonb,reconciliation jsonb,released_at timestamptz,released_by text,release_statement text,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,evidence_document_version_id) REFERENCES document_versions(tenant_id,id));
ALTER TABLE import_batches ADD FOREIGN KEY(tenant_id,cutover_id) REFERENCES migration_cutovers(tenant_id,id);
CREATE INDEX import_archive_batch ON import_archive_entries(tenant_id,legal_entity_id,batch_id,status,path);
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['import_archive_entries','migration_cutovers'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true)) WITH CHECK(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true))',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app')THEN EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO schubert_app',t);END IF;END LOOP;END $$;
