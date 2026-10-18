CREATE TABLE demo_datasets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text NOT NULL,title text,number text,notes text,status text NOT NULL DEFAULT 'active',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 records jsonb NOT NULL DEFAULT '[]',coverage jsonb NOT NULL DEFAULT '{}',dataset_version integer NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,legal_entity_id,name),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id));
ALTER TABLE demo_datasets ENABLE ROW LEVEL SECURITY;ALTER TABLE demo_datasets FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_demo_dataset ON demo_datasets USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON demo_datasets TO schubert_app;END IF;END $$;
