CREATE TABLE manufacturer_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text NOT NULL,manufacturer_name text NOT NULL,article_reference text NOT NULL DEFAULT '',
 kind text NOT NULL CHECK(kind IN('plan','reference','datasheet','model')),
 studio_scope text NOT NULL CHECK(studio_scope IN('both','memorial','room_plan')),
 source_url text NOT NULL DEFAULT '',source_unit text CHECK(source_unit IN('mm','cm','m','in')),notes text NOT NULL DEFAULT '',
 document_version_id uuid,source_hash text,use_planning boolean NOT NULL DEFAULT false,use_ai boolean NOT NULL DEFAULT false,
 rights_statement text NOT NULL DEFAULT '',published_at timestamptz,published_by text,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','available','archived')),
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id),
 FOREIGN KEY(tenant_id,document_version_id) REFERENCES document_versions(tenant_id,id),
 CHECK(status<>'available' OR(document_version_id IS NOT NULL AND source_hash ~ '^[a-f0-9]{64}$' AND published_at IS NOT NULL AND published_by IS NOT NULL AND length(rights_statement)>=20 AND(use_planning OR use_ai)))
);
CREATE INDEX manufacturer_assets_library ON manufacturer_assets(tenant_id,legal_entity_id,status,studio_scope,kind,updated_at DESC,id DESC);
ALTER TABLE manufacturer_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY manufacturer_assets_tenant ON manufacturer_assets USING(
 tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)
) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE FUNCTION protect_manufacturer_asset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.published_at IS NOT NULL AND(to_jsonb(NEW)-ARRAY['status','version','updated_at','updated_by']) IS DISTINCT FROM(to_jsonb(OLD)-ARRAY['status','version','updated_at','updated_by']) THEN
  RAISE EXCEPTION 'Published manufacturer source is immutable; add a new source version' USING ERRCODE='23514';
 END IF;RETURN NEW;END $$;
CREATE TRIGGER manufacturer_asset_original BEFORE UPDATE ON manufacturer_assets FOR EACH ROW EXECUTE FUNCTION protect_manufacturer_asset();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN
 GRANT SELECT,INSERT,UPDATE ON manufacturer_assets TO schubert_app;
 END IF;END $$;
