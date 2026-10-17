ALTER TABLE invoices ADD COLUMN tax_category text;
ALTER TABLE invoices ADD COLUMN tax_exemption_reason text;
ALTER TABLE invoice_lines ADD COLUMN tax_category text;
ALTER TABLE invoice_lines ADD COLUMN tax_exemption_reason text;
ALTER TABLE invoices ADD COLUMN historical_import boolean NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN source_document_version_id uuid;
ALTER TABLE invoices ADD COLUMN legacy_source text;
ALTER TABLE documents ADD COLUMN generation_proof jsonb;
ALTER TABLE audit_events ADD COLUMN audit_sequence bigint GENERATED ALWAYS AS IDENTITY;
ALTER TABLE import_batches ADD COLUMN import_kind text NOT NULL DEFAULT 'customers';
ALTER TABLE import_batches ALTER COLUMN mapping TYPE jsonb USING COALESCE(NULLIF(mapping,''),'{}')::jsonb;
ALTER TABLE import_batches ALTER COLUMN mapping SET DEFAULT '{}';
ALTER TABLE bank_statement_imports ADD COLUMN bank_account_id uuid;
ALTER TABLE bank_statement_imports ADD COLUMN mapping jsonb NOT NULL DEFAULT '{}';
ALTER TABLE bank_statement_imports ADD COLUMN validation_report jsonb;
ALTER TABLE bank_statement_imports ADD COLUMN source_document_version_id uuid;
ALTER TABLE bank_transactions ADD COLUMN counterparty text;
ALTER TABLE bank_transactions ADD COLUMN counterparty_iban text;
ALTER TABLE bank_transactions ADD COLUMN candidates jsonb NOT NULL DEFAULT '[]';
ALTER TABLE bank_transactions ADD COLUMN fingerprint text;
ALTER TABLE bank_transactions ADD COLUMN raw jsonb;
ALTER TABLE bank_transactions ADD COLUMN duplicate_of_id uuid;
ALTER TABLE bank_transactions ADD COLUMN review_reason text;
ALTER TABLE supplier_invoices ADD COLUMN artifact_status text NOT NULL DEFAULT 'pending';
ALTER TABLE supplier_invoices ADD COLUMN source_document_version_id uuid;
ALTER TABLE supplier_invoices ADD COLUMN archive_proof jsonb;
ALTER TABLE dunning_cases ADD COLUMN next_due_date date;
ALTER TABLE dunning_cases ADD COLUMN fee numeric(20,2) NOT NULL DEFAULT 0;
ALTER TABLE dunning_cases ADD COLUMN snapshot jsonb;
ALTER TABLE dunning_cases ADD COLUMN document_id uuid;
ALTER TABLE datev_export_batches ADD COLUMN approved_by text;
ALTER TABLE datev_export_batches ADD COLUMN approved_at timestamptz;
ALTER TABLE datev_export_batches ADD COLUMN import_confirmation text;
ALTER TABLE datev_export_items ADD COLUMN payment_id uuid;
ALTER TABLE datev_export_items ADD COLUMN snapshot jsonb;
ALTER TABLE goods_receipts ADD COLUMN product_id uuid;
ALTER TABLE goods_receipts ADD COLUMN unit text;
CREATE INDEX bank_transaction_fingerprint_idx ON bank_transactions(tenant_id,legal_entity_id,bank_account_id,fingerprint);
CREATE INDEX bank_transaction_external_idx ON bank_transactions(tenant_id,legal_entity_id,bank_account_id,external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX bank_import_source_idx ON bank_statement_imports(tenant_id,legal_entity_id,bank_account_id,content_hash);
CREATE UNIQUE INDEX dunning_receivable_idx ON dunning_cases(tenant_id,legal_entity_id,receivable_id);
CREATE INDEX invoice_credit_reference_idx ON invoices(tenant_id,legal_entity_id,corrects_invoice_id) WHERE issued_at IS NOT NULL;
ALTER TABLE bank_statement_imports ADD CONSTRAINT bank_import_account_fk FOREIGN KEY(tenant_id,bank_account_id) REFERENCES bank_account_versions(tenant_id,id);
ALTER TABLE bank_statement_imports ADD CONSTRAINT bank_import_source_fk FOREIGN KEY(tenant_id,source_document_version_id) REFERENCES document_versions(tenant_id,id);
ALTER TABLE supplier_invoices ADD CONSTRAINT supplier_invoice_source_fk FOREIGN KEY(tenant_id,source_document_version_id) REFERENCES document_versions(tenant_id,id);
CREATE TABLE open_item_offsets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'confirmed',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 target_kind text NOT NULL CHECK(target_kind IN('receivable','payable')),positive_id uuid NOT NULL,negative_id uuid NOT NULL,
 party_id uuid NOT NULL,amount numeric(20,2) NOT NULL CHECK(amount>0),currency char(3) NOT NULL,reason text NOT NULL,
 UNIQUE(tenant_id,id),CHECK(positive_id<>negative_id),FOREIGN KEY(tenant_id,party_id) REFERENCES parties(tenant_id,id)
);
CREATE TABLE dunning_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'confirmed',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 case_id uuid NOT NULL,stage integer NOT NULL,snapshot jsonb NOT NULL,content_hash text NOT NULL,document_id uuid,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,case_id,stage),FOREIGN KEY(tenant_id,case_id) REFERENCES dunning_cases(tenant_id,id)
);
CREATE TABLE archive_objects(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'reserved',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 object_key text NOT NULL,content_hash text NOT NULL,size_bytes bigint NOT NULL CHECK(size_bytes>0),provider text NOT NULL,
 storage_version_id text,retain_until timestamptz NOT NULL,proof jsonb,document_version_id uuid,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,legal_entity_id,object_key),
 FOREIGN KEY(tenant_id,document_version_id) REFERENCES document_versions(tenant_id,id)
);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['open_item_offsets','dunning_events','archive_objects'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true)) WITH CHECK(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true))',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO schubert_app',t);END IF;
 END LOOP;
END $$;
CREATE FUNCTION protect_offset_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'offset_history_immutable';END $$;
CREATE TRIGGER open_item_offset_immutable BEFORE UPDATE OR DELETE ON open_item_offsets FOR EACH ROW EXECUTE FUNCTION protect_offset_history();
