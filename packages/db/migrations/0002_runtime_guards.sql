-- Authentication lookup metadata is isolated from tenant business records.
CREATE TABLE portal_token_index(token_hash text PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),portal_access_id uuid NOT NULL);
CREATE TABLE portal_session_index(token_hash text PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),portal_access_id uuid NOT NULL,session_id uuid NOT NULL);
CREATE INDEX portal_session_access_idx ON portal_session_index(portal_access_id);
CREATE INDEX time_receipt_command_idx ON command_receipts(tenant_id,actor_scope,(result->>'command_id')) WHERE command_name LIKE 'workforce.time.%';
CREATE INDEX time_sessions_employee_day_idx ON time_sessions(tenant_id,employee_id,started_at DESC);
CREATE INDEX dispatch_employee_window_idx ON dispatch_assignments(tenant_id,employee_id,starts_at,ends_at);
CREATE INDEX stock_reservations_active_idx ON stock_reservations(tenant_id,stock_item_id,order_id) WHERE status='active';
CREATE INDEX doc_scope_idx ON documents(tenant_id,entity_type,entity_id,created_at DESC);
CREATE INDEX invoice_order_state_idx ON invoices(tenant_id,legal_entity_id,order_id,kind) WHERE issued_at IS NOT NULL;
CREATE INDEX receivables_open_due_idx ON receivables(tenant_id,legal_entity_id,due_date) WHERE open_amount>0;
CREATE INDEX payables_open_due_idx ON payables(tenant_id,legal_entity_id,due_date) WHERE open_amount>0;
CREATE INDEX parties_scope_lookup_idx ON parties(tenant_id,legal_entity_id,name);
CREATE UNIQUE INDEX quote_version_revision_unique ON quote_versions(tenant_id,quote_id,revision);
CREATE UNIQUE INDEX design_revision_number_unique ON design_revisions(tenant_id,variant_id,revision_number);
CREATE UNIQUE INDEX time_submission_ledger_unique ON time_account_ledger(tenant_id,submission_id,source_version,kind);
CREATE UNIQUE INDEX labor_submission_allocation_unique ON labor_cost_ledger(tenant_id,submission_id,allocation_id,source_version,kind);
ALTER TABLE time_submissions ADD COLUMN revision_snapshot jsonb;
ALTER TABLE employees ADD COLUMN cost_rate_permission boolean NOT NULL DEFAULT false;
CREATE FUNCTION protect_inserted_invoice_line() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM invoices WHERE id=NEW.parent_id AND issued_at IS NOT NULL) THEN RAISE EXCEPTION 'issued_invoice_line_immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER invoice_line_no_insert AFTER INSERT ON invoice_lines FOR EACH ROW EXECUTE FUNCTION protect_inserted_invoice_line();
CREATE FUNCTION lookup_request_context(actor text,session_ref text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t uuid; m memberships; fresh timestamptz; BEGIN
 SELECT tenant_id INTO t FROM "user" WHERE id=actor; IF t IS NULL THEN RETURN NULL; END IF;
 PERFORM set_config('app.tenant_id',t::text,true); SELECT * INTO m FROM memberships WHERE tenant_id=t AND user_id=actor AND active LIMIT 1;
 IF m.id IS NULL THEN RETURN NULL; END IF;
 SELECT confirmed_at INTO fresh FROM reauth_sessions WHERE session_id=session_ref AND user_id=actor ORDER BY confirmed_at DESC LIMIT 1;
 RETURN to_jsonb(m)||jsonb_build_object('reauthenticated_at',fresh);
END $$;
REVOKE ALL ON FUNCTION lookup_request_context(text,text) FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN
 GRANT SELECT,INSERT,UPDATE,DELETE ON portal_token_index,portal_session_index TO schubert_app;
 GRANT EXECUTE ON FUNCTION lookup_request_context(text,text) TO schubert_app;
END IF; END $$;
