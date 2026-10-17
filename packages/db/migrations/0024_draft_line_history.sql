CREATE TABLE document_line_revisions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'frozen',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 parent_type text NOT NULL,parent_id uuid NOT NULL,parent_version integer NOT NULL,lines jsonb NOT NULL,content_hash text NOT NULL,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,legal_entity_id,parent_type,parent_id,parent_version));
ALTER TABLE document_line_revisions ENABLE ROW LEVEL SECURITY;ALTER TABLE document_line_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_line_revisions USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE TRIGGER document_line_revision_immutable BEFORE UPDATE OR DELETE ON document_line_revisions FOR EACH ROW EXECUTE FUNCTION protect_offset_history();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT ON document_line_revisions TO schubert_app;END IF;END $$;
