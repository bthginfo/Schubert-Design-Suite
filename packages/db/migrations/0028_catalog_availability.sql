-- Dated supplier statements belong to an exact frozen variant; they are not stock reservations.
CREATE UNIQUE INDEX IF NOT EXISTS product_versions_legal_scope_identity ON product_variant_versions(tenant_id,legal_entity_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS document_versions_legal_scope_identity ON document_versions(tenant_id,legal_entity_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS parties_legal_scope_identity ON parties(tenant_id,legal_entity_id,id);
CREATE TABLE product_availability_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 number text,name text,title text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 product_variant_version_id uuid NOT NULL,supplier_id uuid,availability_status text NOT NULL,
 checked_on date NOT NULL,valid_until date NOT NULL,available_quantity numeric(20,6),availability_unit text,
 source_document_version_id uuid NOT NULL,revision integer NOT NULL,previous_version_id uuid,
 content_hash text,approved_at timestamptz,approved_by text,evidence_version_id uuid,review_scope text,validation_report jsonb,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,legal_entity_id,id),UNIQUE(tenant_id,legal_entity_id,product_variant_version_id,revision),
 CHECK(availability_status IN('unknown','available','limited','unavailable')),CHECK(valid_until>=checked_on),
 CHECK(available_quantity IS NULL OR available_quantity>0),CHECK(available_quantity IS NULL OR length(trim(availability_unit))>0),
 CHECK(status<>'approved' OR(approved_at IS NOT NULL AND approved_by IS NOT NULL AND content_hash IS NOT NULL AND evidence_version_id IS NOT NULL)),
 FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(tenant_id,legal_entity_id,product_variant_version_id) REFERENCES product_variant_versions(tenant_id,legal_entity_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(tenant_id,legal_entity_id,supplier_id) REFERENCES parties(tenant_id,legal_entity_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(tenant_id,legal_entity_id,source_document_version_id) REFERENCES document_versions(tenant_id,legal_entity_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(tenant_id,legal_entity_id,evidence_version_id) REFERENCES document_versions(tenant_id,legal_entity_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(tenant_id,legal_entity_id,previous_version_id) REFERENCES product_availability_versions(tenant_id,legal_entity_id,id) DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE product_availability_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_availability_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY availability_legal_scope ON product_availability_versions USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE INDEX availability_current_lookup ON product_availability_versions(tenant_id,legal_entity_id,product_variant_version_id,checked_on DESC,revision DESC) WHERE approved_at IS NOT NULL;
CREATE INDEX availability_source_lookup ON product_availability_versions(tenant_id,legal_entity_id,source_document_version_id);
CREATE TRIGGER availability_frozen BEFORE UPDATE OR DELETE ON product_availability_versions FOR EACH ROW EXECUTE FUNCTION protect_catalog_frozen();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON product_availability_versions TO schubert_app; END IF; END $$;
