CREATE TABLE recommendation_feedback(
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'recorded',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 recommendation_id uuid NOT NULL,outcome text NOT NULL CHECK(outcome IN('done','deferred','not_applicable')),reason text NOT NULL,source_snapshot jsonb NOT NULL,UNIQUE(tenant_id,recommendation_id));
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;ALTER TABLE recommendation_feedback FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON recommendation_feedback USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON recommendation_feedback TO schubert_app;END IF;END $$;
ALTER TABLE purchase_orders ADD COLUMN currency char(3) NOT NULL DEFAULT 'EUR';
INSERT INTO blob_storage_objects(tenant_id,legal_entity_id,storage_key,size_bytes,content_hash,status)
 SELECT DISTINCT ON(tenant_id,storage_key)tenant_id,legal_entity_id,storage_key,size_bytes,content_hash,'stored' FROM blob_objects WHERE status<>'deleted' AND legal_entity_id IS NOT NULL
 ON CONFLICT(tenant_id,storage_key) DO NOTHING;
