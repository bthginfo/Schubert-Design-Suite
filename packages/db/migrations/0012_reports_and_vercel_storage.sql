ALTER TABLE supplier_invoices ADD COLUMN currency char(3) NOT NULL DEFAULT 'EUR';
ALTER TABLE goods_receipts ADD COLUMN purchase_order_line_id uuid;
ALTER TABLE purchase_orders ADD COLUMN confirmed_delivery_date date;
ALTER TABLE purchase_orders ADD COLUMN confirmation_document_version_id uuid;
ALTER TABLE report_snapshots ADD COLUMN definition_versions jsonb NOT NULL DEFAULT '{}';
ALTER TABLE report_snapshots ADD COLUMN currency char(3);
CREATE OR REPLACE FUNCTION protect_report_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'document_id'-'status'-'version'-'updated_at'-'updated_by') IS DISTINCT FROM (to_jsonb(OLD)-'document_id'-'status'-'version'-'updated_at'-'updated_by') THEN RAISE EXCEPTION 'Frozen report content cannot change' USING ERRCODE='23514';END IF;
 IF OLD.document_id IS NOT NULL AND NEW.document_id IS DISTINCT FROM OLD.document_id THEN RAISE EXCEPTION 'Frozen report artifact cannot change' USING ERRCODE='23514';END IF;RETURN NEW;END $$;
CREATE TRIGGER report_snapshot_content BEFORE UPDATE ON report_snapshots FOR EACH ROW EXECUTE FUNCTION protect_report_snapshot();
CREATE TABLE quote_cost_snapshots(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 quote_version_id uuid NOT NULL,lines jsonb NOT NULL,content_hash text NOT NULL,UNIQUE(tenant_id,quote_version_id),FOREIGN KEY(tenant_id,quote_version_id) REFERENCES quote_versions(tenant_id,id));
ALTER TABLE quote_cost_snapshots ENABLE ROW LEVEL SECURITY;ALTER TABLE quote_cost_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON quote_cost_snapshots USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON quote_cost_snapshots TO schubert_app;END IF;END $$;
CREATE TABLE material_requirements(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 order_id uuid NOT NULL,product_id uuid NOT NULL,quantity numeric(20,6) NOT NULL CHECK(quantity>0),unit text NOT NULL,required_on date NOT NULL,source_revision_id uuid,source_document_version_id uuid,approved_at timestamptz,approved_by text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id),FOREIGN KEY(tenant_id,product_id) REFERENCES products(tenant_id,id));
ALTER TABLE material_requirements ENABLE ROW LEVEL SECURITY;ALTER TABLE material_requirements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON material_requirements USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON material_requirements TO schubert_app;END IF;END $$;
CREATE TABLE blob_usage_months(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 period text NOT NULL,transfer_bytes bigint NOT NULL DEFAULT 0,simple_operations bigint NOT NULL DEFAULT 0,advanced_operations bigint NOT NULL DEFAULT 0,UNIQUE(tenant_id,legal_entity_id,period));
ALTER TABLE blob_usage_months ENABLE ROW LEVEL SECURITY;ALTER TABLE blob_usage_months FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON blob_usage_months USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON blob_usage_months TO schubert_app;END IF;END $$;
CREATE TABLE blob_storage_objects(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 storage_key text NOT NULL,size_bytes bigint NOT NULL CHECK(size_bytes>=0),content_hash text,reserved_until timestamptz,UNIQUE(tenant_id,storage_key));
ALTER TABLE blob_storage_objects ENABLE ROW LEVEL SECURITY;ALTER TABLE blob_storage_objects FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON blob_storage_objects USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON blob_storage_objects TO schubert_app;END IF;END $$;
ALTER TABLE notification_preferences ADD COLUMN quiet_start text,ADD COLUMN quiet_end text,ADD COLUMN digest boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX notification_preferences_user_channel_category ON notification_preferences(tenant_id,user_id,channel,category);
CREATE TABLE notification_deliveries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 event_id uuid NOT NULL,policy_version text NOT NULL,user_id text NOT NULL,channel text NOT NULL,action text NOT NULL,notification_id uuid,UNIQUE(tenant_id,event_id,policy_version,user_id,channel,action));
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;ALTER TABLE notification_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_deliveries USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON notification_deliveries TO schubert_app;END IF;END $$;
CREATE TRIGGER quote_cost_snapshot_immutable BEFORE UPDATE OR DELETE ON quote_cost_snapshots FOR EACH ROW EXECUTE FUNCTION protect_offset_history();
CREATE TRIGGER material_requirements_approved BEFORE UPDATE OR DELETE ON material_requirements FOR EACH ROW EXECUTE FUNCTION protect_hr_approved();
CREATE INDEX stock_movements_order_idx ON stock_movements(tenant_id,legal_entity_id,order_id,created_at);
CREATE INDEX reports_invoices_idx ON invoices(tenant_id,legal_entity_id,issued_at,currency) WHERE issued_at IS NOT NULL;
CREATE INDEX reports_estimate_idx ON cost_estimates(tenant_id,legal_entity_id,order_id,as_of DESC) WHERE status='approved';
