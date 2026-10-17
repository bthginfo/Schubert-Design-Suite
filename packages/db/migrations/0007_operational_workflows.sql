ALTER TABLE labor_cost_ledger ADD COLUMN time_session_id uuid;
ALTER TABLE labor_cost_ledger ADD CONSTRAINT labor_session_fk FOREIGN KEY(tenant_id,time_session_id) REFERENCES time_sessions(tenant_id,id);
CREATE INDEX labor_session_source_idx ON labor_cost_ledger(tenant_id,time_session_id,created_at);
ALTER TABLE time_account_ledger ADD COLUMN effective_on date;
ALTER TABLE portal_declarations ADD COLUMN reference text;
ALTER TABLE portal_declarations ADD COLUMN contact_email text;
ALTER TABLE portal_declarations ADD COLUMN receipt_document_id uuid;
CREATE UNIQUE INDEX public_declaration_idempotency_idx ON portal_declarations(tenant_id,idempotency_key) WHERE portal_access_id IS NULL AND idempotency_key IS NOT NULL;
CREATE INDEX ai_answer_reuse_idx ON ai_runs(tenant_id,legal_entity_id,actor_id,request_hash,model_id,created_at DESC) WHERE status='completed' AND result IS NOT NULL;
CREATE UNIQUE INDEX ai_budget_period_idx ON ai_budgets(tenant_id,legal_entity_id,period);
CREATE INDEX document_extraction_version_idx ON document_extractions(tenant_id,document_version_id,field_name);
CREATE UNIQUE INDEX document_search_version_idx ON search_documents(tenant_id,document_version_id);
CREATE INDEX document_customer_link_idx ON document_links(tenant_id,legal_entity_id,entity_type,entity_id,document_id);
CREATE TABLE upload_intents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'pending',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 actor_id text NOT NULL,portal_access_id uuid,pathname text NOT NULL,original_name text NOT NULL,mime_type text NOT NULL,
 size_bytes bigint NOT NULL CHECK(size_bytes>0 AND size_bytes<=41943040),content_hash text NOT NULL,entity_type text,entity_id uuid,
 expires_at timestamptz NOT NULL,document_id uuid,UNIQUE(tenant_id,id),UNIQUE(tenant_id,pathname),
 FOREIGN KEY(tenant_id,document_id) REFERENCES documents(tenant_id,id),
 FOREIGN KEY(tenant_id,portal_access_id) REFERENCES portal_accesses(tenant_id,id)
);
CREATE TABLE work_calendars(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 region text NOT NULL,year integer NOT NULL CHECK(year BETWEEN 2000 AND 2100),holiday_dates text,holidays jsonb NOT NULL DEFAULT '[]',
 approved_at timestamptz,approved_by text,reason text,UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX approved_work_calendar_idx ON work_calendars(tenant_id,legal_entity_id,region,year) WHERE approved_at IS NOT NULL;
CREATE TABLE time_account_openings(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 employee_id uuid NOT NULL,as_of date NOT NULL,hours numeric(20,6) NOT NULL,seconds integer,reason text NOT NULL,
 source_document_version_id uuid,approved_at timestamptz,approved_by text,UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,employee_id) REFERENCES employees(tenant_id,id),
 FOREIGN KEY(tenant_id,source_document_version_id) REFERENCES document_versions(tenant_id,id)
);
CREATE UNIQUE INDEX approved_account_opening_idx ON time_account_openings(tenant_id,employee_id) WHERE approved_at IS NOT NULL;
CREATE TABLE time_account_adjustments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'draft',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 employee_id uuid NOT NULL,effective_on date NOT NULL,hours numeric(20,6) NOT NULL,seconds integer,kind text NOT NULL,reason text NOT NULL,
 source_document_version_id uuid,approved_at timestamptz,approved_by text,UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,employee_id) REFERENCES employees(tenant_id,id),
 FOREIGN KEY(tenant_id,source_document_version_id) REFERENCES document_versions(tenant_id,id)
);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['upload_intents','work_calendars','time_account_openings','time_account_adjustments'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true)) WITH CHECK(tenant_id::text=current_setting(''app.tenant_id'',true) AND legal_entity_id::text=current_setting(''app.legal_entity_id'',true))',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO schubert_app',t);END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['work_calendars','time_account_openings','time_account_adjustments'] LOOP
 EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION protect_catalog_frozen()',t||'_frozen',t);
 END LOOP;
END $$;
CREATE FUNCTION public_intake_context() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('tenant_id',tenant_id,'legal_entity_id',legal_entity_id) FROM bootstrap_state WHERE id=1 AND completed
$$;
REVOKE ALL ON FUNCTION public_intake_context() FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app')THEN GRANT EXECUTE ON FUNCTION public_intake_context() TO schubert_app;END IF;END $$;
