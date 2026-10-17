CREATE TABLE recipient_invoice_profiles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 party_id uuid NOT NULL,standard text NOT NULL DEFAULT 'xrechnung_3.0.2',buyer_reference text NOT NULL,process_id text NOT NULL,
 seller_endpoint text NOT NULL,seller_endpoint_scheme text NOT NULL,buyer_endpoint text NOT NULL,buyer_endpoint_scheme text NOT NULL,
 seller_contact text NOT NULL,seller_phone text NOT NULL,seller_email text NOT NULL,transmission_channel text NOT NULL,
 source_document_version_id uuid NOT NULL,valid_from date NOT NULL,valid_until date NOT NULL,approved_by text,approved_at timestamptz,content_hash text,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id),FOREIGN KEY(tenant_id,party_id) REFERENCES parties(tenant_id,id),FOREIGN KEY(tenant_id,source_document_version_id) REFERENCES document_versions(tenant_id,id));
ALTER TABLE invoices ADD COLUMN recipient_profile_version_id uuid;
ALTER TABLE invoices ADD FOREIGN KEY(tenant_id,recipient_profile_version_id) REFERENCES recipient_invoice_profiles(tenant_id,id);
CREATE TABLE order_tax_decisions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 order_id uuid NOT NULL,tax_category text NOT NULL,basis text NOT NULL,source_document_version_id uuid NOT NULL,rule_version_id uuid NOT NULL,
 valid_from date NOT NULL,valid_until date NOT NULL,approved_by text,approved_at timestamptz,content_hash text,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id),FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id),FOREIGN KEY(tenant_id,rule_version_id) REFERENCES rule_versions(tenant_id,id),FOREIGN KEY(tenant_id,source_document_version_id) REFERENCES document_versions(tenant_id,id));
CREATE TABLE business_document_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'confirmed',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 kind text NOT NULL,entity_id uuid NOT NULL,entity_version integer NOT NULL,snapshot jsonb NOT NULL,content_hash text NOT NULL,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,kind,entity_id,entity_version),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id));
ALTER TABLE delivery_note_lines ADD COLUMN order_line_id uuid,ADD COLUMN stock_item_id uuid,ADD COLUMN lot_number text,ADD COLUMN movement_kind text NOT NULL DEFAULT 'delivery';
ALTER TABLE delivery_note_lines ADD FOREIGN KEY(tenant_id,order_line_id) REFERENCES order_lines(tenant_id,id),ADD FOREIGN KEY(tenant_id,stock_item_id) REFERENCES stock_items(tenant_id,id);
ALTER TABLE delivery_notes ADD COLUMN person_name text,ADD COLUMN declaration text,ADD COLUMN evidence_document_version_id uuid,ADD COLUMN confirmed_at timestamptz;
ALTER TABLE acceptance_reports ADD COLUMN person_name text,ADD COLUMN declaration text,ADD COLUMN evidence_document_version_id uuid,ADD COLUMN confirmed_at timestamptz,ADD COLUMN warranty_rule_version_id uuid,ADD COLUMN warranty_started_on date,ADD COLUMN warranty_until date;
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['recipient_invoice_profiles','order_tax_decisions','business_document_versions'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true)) WITH CHECK(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true))',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app')THEN EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO schubert_app',t);END IF;END LOOP;END $$;
CREATE TRIGGER recipient_profile_approved_immutable BEFORE UPDATE OR DELETE ON recipient_invoice_profiles FOR EACH ROW EXECUTE FUNCTION protect_hr_approved();
CREATE TRIGGER tax_decision_approved_immutable BEFORE UPDATE OR DELETE ON order_tax_decisions FOR EACH ROW EXECUTE FUNCTION protect_hr_approved();
CREATE TRIGGER business_document_version_immutable BEFORE UPDATE OR DELETE ON business_document_versions FOR EACH ROW EXECUTE FUNCTION protect_offset_history();
CREATE FUNCTION protect_confirmed_business_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.status='confirmed' THEN RAISE EXCEPTION 'confirmed_business_record_immutable';END IF;RETURN COALESCE(NEW,OLD);END $$;
CREATE TRIGGER delivery_confirmed_immutable BEFORE UPDATE OR DELETE ON delivery_notes FOR EACH ROW EXECUTE FUNCTION protect_confirmed_business_record();
CREATE TRIGGER acceptance_confirmed_immutable BEFORE UPDATE OR DELETE ON acceptance_reports FOR EACH ROW EXECUTE FUNCTION protect_confirmed_business_record();

CREATE TRIGGER rule_approved_immutable BEFORE UPDATE OR DELETE ON rule_versions FOR EACH ROW EXECUTE FUNCTION protect_hr_approved();
CREATE FUNCTION protect_delivery_line() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM delivery_notes WHERE id=COALESCE(NEW.parent_id,OLD.parent_id) AND status='confirmed') THEN RAISE EXCEPTION 'confirmed_delivery_line_immutable';END IF;RETURN COALESCE(NEW,OLD);END $$;
CREATE TRIGGER delivery_line_confirmed BEFORE INSERT OR UPDATE OR DELETE ON delivery_note_lines FOR EACH ROW EXECUTE FUNCTION protect_delivery_line();
