ALTER TABLE supplier_invoices ADD COLUMN validation_report jsonb;
ALTER TABLE supplier_invoice_allocations ADD COLUMN cost_kind text;
ALTER TABLE time_account_ledger ADD COLUMN leave_request_id uuid;
CREATE UNIQUE INDEX paid_leave_daily_idx ON time_account_ledger(tenant_id,employee_id,leave_request_id,effective_on,kind) WHERE leave_request_id IS NOT NULL;
ALTER TABLE integration_connections ADD COLUMN current_version_id uuid;
ALTER TABLE metric_definitions ADD COLUMN calculation_rule text;
ALTER TABLE metric_definitions ADD COLUMN included_states text[];
ALTER TABLE metric_definitions ADD COLUMN excluded_states text[];
ALTER TABLE metric_definitions ADD COLUMN time_basis text;
CREATE UNIQUE INDEX one_outbox_dispatch_idx ON job_runs(tenant_id,legal_entity_id) WHERE job_type='outbox.dispatch' AND status IN('pending','retry','running');
CREATE TABLE integration_connection_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'frozen',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 connection_id uuid NOT NULL,provider text NOT NULL,configuration jsonb NOT NULL,secret_reference text,fingerprint text NOT NULL,source_version integer NOT NULL,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,connection_id,source_version),FOREIGN KEY(tenant_id,connection_id) REFERENCES integration_connections(tenant_id,id)
);
CREATE TABLE performance_valuations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 order_id uuid NOT NULL,effective_on date NOT NULL,value_net numeric(20,2) NOT NULL,currency char(3) NOT NULL,basis text NOT NULL,
 rule_version_id uuid NOT NULL,approved_by text,approved_at timestamptz,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id),FOREIGN KEY(tenant_id,rule_version_id) REFERENCES rule_versions(tenant_id,id)
);
CREATE TABLE cost_estimates(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 order_id uuid NOT NULL,as_of date NOT NULL,uncommitted_remaining_amount numeric(20,2) NOT NULL CHECK(uncommitted_remaining_amount>=0),
 currency char(3) NOT NULL,cost_level text NOT NULL DEFAULT 'direct',basis text NOT NULL,rule_version_id uuid NOT NULL,
 approved_by text,approved_at timestamptz,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id),FOREIGN KEY(tenant_id,rule_version_id) REFERENCES rule_versions(tenant_id,id)
);
CREATE TABLE liquidity_openings(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 bank_account_id uuid NOT NULL,as_of date NOT NULL,amount numeric(20,2) NOT NULL,currency char(3) NOT NULL,source_document_version_id uuid NOT NULL,
 approved_by text,approved_at timestamptz,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,bank_account_id) REFERENCES bank_account_versions(tenant_id,id),FOREIGN KEY(tenant_id,source_document_version_id) REFERENCES document_versions(tenant_id,id)
);
CREATE TABLE report_snapshots(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'frozen',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 filters jsonb NOT NULL,definition_version text NOT NULL,data_as_of timestamptz NOT NULL,snapshot jsonb NOT NULL,content_hash text NOT NULL,document_id uuid,
 UNIQUE(tenant_id,id)
);
CREATE TABLE backup_manifests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'pending',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 snapshot_at timestamptz NOT NULL,content_hash text,manifest jsonb,archive_proof jsonb,encryption_version text,
 UNIQUE(tenant_id,id)
);
CREATE TABLE restore_checks(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'pending',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 backup_id uuid NOT NULL,report jsonb,completed_at timestamptz,rpo_seconds integer,rto_seconds integer,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,backup_id) REFERENCES backup_manifests(tenant_id,id)
);
CREATE TABLE import_cutovers(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 source_system text NOT NULL,watermark text NOT NULL,legacy_writes_locked boolean NOT NULL DEFAULT false,
 evidence_document_version_id uuid NOT NULL,reconciliation jsonb,approved_by text,approved_at timestamptz,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,evidence_document_version_id) REFERENCES document_versions(tenant_id,id)
);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['integration_connection_versions','performance_valuations','cost_estimates','liquidity_openings','report_snapshots','backup_manifests','restore_checks','import_cutovers'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true)) WITH CHECK(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true))',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO schubert_app',t);END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['performance_valuations','cost_estimates','liquidity_openings','import_cutovers'] LOOP
 EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION protect_hr_approved()',t||'_approved',t);
 END LOOP;
END $$;
CREATE TRIGGER connection_version_immutable BEFORE UPDATE OR DELETE ON integration_connection_versions FOR EACH ROW EXECUTE FUNCTION protect_offset_history();
CREATE TRIGGER report_snapshot_immutable BEFORE DELETE ON report_snapshots FOR EACH ROW EXECUTE FUNCTION protect_offset_history();
