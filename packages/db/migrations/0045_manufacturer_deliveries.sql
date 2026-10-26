CREATE TABLE manufacturer_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text NOT NULL,status text NOT NULL DEFAULT 'review',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 manufacturer text NOT NULL CHECK(manufacturer='Duravit'),market text NOT NULL CHECK(market='DE'),
 source_document_version_id uuid NOT NULL,source_hash text NOT NULL,source_url text NOT NULL,
 payload jsonb NOT NULL,report jsonb NOT NULL,applied_at timestamptz,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,source_document_version_id) REFERENCES document_versions(tenant_id,id)
);
ALTER TABLE manufacturer_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY manufacturer_deliveries_scope ON manufacturer_deliveries USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE INDEX manufacturer_deliveries_recent ON manufacturer_deliveries(tenant_id,legal_entity_id,created_at DESC,id);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON manufacturer_deliveries TO schubert_app; END IF; END $$;
CREATE FUNCTION protect_manufacturer_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.applied_at IS NOT NULL THEN RAISE EXCEPTION 'Applied delivery is immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER manufacturer_delivery_frozen BEFORE UPDATE ON manufacturer_deliveries FOR EACH ROW EXECUTE FUNCTION protect_manufacturer_delivery();
