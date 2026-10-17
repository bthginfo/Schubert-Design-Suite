ALTER TABLE payment_allocations ADD COLUMN tax_splits jsonb,ADD COLUMN tax_basis text;
ALTER TABLE invoices ADD COLUMN settlement_rule_version_id uuid;
ALTER TABLE invoice_references ADD COLUMN settlement_evidence jsonb;
ALTER TABLE invoice_tax_summaries ADD COLUMN tax_category text,ADD COLUMN tax_exemption_reason text;
CREATE TABLE payment_tax_reviews(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'approved',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 allocation_id uuid NOT NULL,tax_splits jsonb NOT NULL,basis text NOT NULL,approved_by text NOT NULL,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,allocation_id),FOREIGN KEY(tenant_id,allocation_id) REFERENCES payment_allocations(tenant_id,id));
ALTER TABLE payment_tax_reviews ENABLE ROW LEVEL SECURITY;ALTER TABLE payment_tax_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payment_tax_reviews USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE TRIGGER payment_tax_review_immutable BEFORE UPDATE OR DELETE ON payment_tax_reviews FOR EACH ROW EXECUTE FUNCTION protect_offset_history();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT ON payment_tax_reviews TO schubert_app;END IF;END $$;

ALTER TABLE quote_lines ADD COLUMN tax_category text,ADD COLUMN tax_exemption_reason text;
ALTER TABLE order_lines ADD COLUMN tax_category text,ADD COLUMN tax_exemption_reason text;
ALTER TABLE purchase_order_lines ADD COLUMN tax_category text,ADD COLUMN tax_exemption_reason text;
