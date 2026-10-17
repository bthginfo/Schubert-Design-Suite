-- Reviewed forward-only initial migration. Generated from versioned relational definitions.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE tenants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,timezone text NOT NULL DEFAULT 'Europe/Berlin',locale text NOT NULL DEFAULT 'de-DE',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE bootstrap_state(id integer PRIMARY KEY CHECK(id=1),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid,completed boolean NOT NULL DEFAULT false);
CREATE TABLE "user"(id text PRIMARY KEY,name text NOT NULL,email text UNIQUE NOT NULL,"emailVerified" boolean NOT NULL DEFAULT false,image text,"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE "session"(id text PRIMARY KEY,"expiresAt" timestamptz NOT NULL,token text NOT NULL UNIQUE,"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now(),"ipAddress" text,"userAgent" text,"userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE);
CREATE TABLE account(id text PRIMARY KEY,"accountId" text NOT NULL,"providerId" text NOT NULL,"userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,"accessToken" text,"refreshToken" text,"idToken" text,"accessTokenExpiresAt" timestamptz,"refreshTokenExpiresAt" timestamptz,scope text,password text,"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE verification(id text PRIMARY KEY,identifier text NOT NULL,value text NOT NULL,"expiresAt" timestamptz NOT NULL,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
CREATE TABLE "rateLimit"(id text PRIMARY KEY,key text NOT NULL UNIQUE,count integer NOT NULL,"lastRequest" bigint NOT NULL);

CREATE TABLE parties ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"party_type" text,
"email" text,
"phone" text,
"street" text,
"postal_code" text,
"city" text,
"country" text,
"vat_id" text,
"payment_days" numeric(20,6),
"is_customer" boolean DEFAULT false,
"is_supplier" boolean DEFAULT false,
"merged_into_id" uuid,
"active" boolean DEFAULT true,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX parties_tenant_status_idx ON parties(tenant_id,status,created_at,id);
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON parties USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE inquiries ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"customer_id" uuid,
"channel" text,
"business_unit" text,
"description" text,
"requested_date" date,
"next_contact" date,
"assigned_to" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX inquiries_tenant_status_idx ON inquiries(tenant_id,status,created_at,id);
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON inquiries USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE quotes ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"customer_id" uuid NOT NULL,
"order_id" uuid,
"valid_until" date,
"service_date" date,
"due_date" date,
"terms" text,
"current_revision" integer DEFAULT 0,
"published_version_id" uuid,
"accepted_version_id" uuid,
"net_total" numeric(20,2),
"tax_total" numeric(20,2),
"gross_total" numeric(20,2),
"currency" char(3) DEFAULT 'EUR',UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX quotes_tenant_status_idx ON quotes(tenant_id,status,created_at,id);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON quotes USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE orders ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"customer_id" uuid NOT NULL,
"site_id" uuid,
"grave_plot_id" uuid,
"business_unit" text,
"due_date" date,
"assigned_to" uuid,
"budget_net" numeric(20,2),
"quote_version_id" uuid,
"commercial_status" text DEFAULT 'draft',
"planning_status" text DEFAULT 'survey_open',
"procurement_status" text DEFAULT 'no_need',
"execution_status" text DEFAULT 'unplanned',
"acceptance_status" text DEFAULT 'open',
"billing_status" text DEFAULT 'not_due',
"payment_status" text DEFAULT 'open',
"currency" char(3) DEFAULT 'EUR',
"confirmed_snapshot" jsonb,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX orders_tenant_status_idx ON orders(tenant_id,status,created_at,id);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE work_packages ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"order_id" uuid,
"kind" text,
"planned_hours" numeric(20,6),
"planned_quantity" numeric(20,6),
"unit" text,
"due_date" date,
"assigned_to" uuid,
"completion_criteria" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX work_packages_tenant_status_idx ON work_packages(tenant_id,status,created_at,id);
ALTER TABLE work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON work_packages USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE change_orders ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"order_id" uuid,
"reason" text,
"amount_net" numeric(20,6),
"days_effect" numeric(20,6),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX change_orders_tenant_status_idx ON change_orders(tenant_id,status,created_at,id);
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON change_orders USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE delivery_notes ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"order_id" uuid,
"delivery_date" date,
"recipient" text,
"address" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX delivery_notes_tenant_status_idx ON delivery_notes(tenant_id,status,created_at,id);
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON delivery_notes USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE acceptance_reports ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"order_id" uuid,
"acceptance_date" date,
"participants" text,
"reservations" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX acceptance_reports_tenant_status_idx ON acceptance_reports(tenant_id,status,created_at,id);
ALTER TABLE acceptance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE acceptance_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON acceptance_reports USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE defects ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"order_id" uuid,
"description" text,
"due_date" date,
"assigned_to" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX defects_tenant_status_idx ON defects(tenant_id,status,created_at,id);
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON defects USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE invoices ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"customer_id" uuid NOT NULL,
"order_id" uuid,
"service_date" date,
"due_date" date,
"terms" text,
"kind" text NOT NULL DEFAULT 'normal',
"corrects_invoice_id" uuid,
"legal_status" text DEFAULT 'draft',
"artifact_status" text DEFAULT 'pending',
"delivery_status" text DEFAULT 'not_sent',
"payment_status" text DEFAULT 'open',
"snapshot" jsonb,
"content_hash" text,
"issued_at" timestamptz,
"net_total" numeric(20,2),
"tax_total" numeric(20,2),
"gross_total" numeric(20,2),
"prepaid_total" numeric(20,2) DEFAULT 0,
"payable_total" numeric(20,2),
"currency" char(3) DEFAULT 'EUR',
"validation_report" jsonb,
"rule_version_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX invoices_tenant_status_idx ON invoices(tenant_id,status,created_at,id);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE payments ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"direction" text NOT NULL,
"party_id" uuid NOT NULL,
"amount" numeric(20,2) NOT NULL,
"currency" char(3) DEFAULT 'EUR',
"booking_date" date NOT NULL,
"bank_reference" text,
"reference" text,
"source" text,
"bank_account_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX payments_tenant_status_idx ON payments(tenant_id,status,created_at,id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payments USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE supplier_invoices ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"supplier_id" uuid NOT NULL,
"supplier_number" text NOT NULL,
"invoice_date" date,
"service_date" date,
"due_date" date,
"purchase_order_id" uuid,
"order_id" uuid,
"document_id" uuid,
"net_total" numeric(20,6),
"tax_total" numeric(20,6),
"gross_total" numeric(20,6),
"payment_blocked" boolean,
"normalized_number" text NOT NULL,
"kind" text DEFAULT 'invoice',
"payment_status" text DEFAULT 'open',
"content_hash" text,
"approved_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX supplier_invoices_tenant_status_idx ON supplier_invoices(tenant_id,status,created_at,id);
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON supplier_invoices USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE purchase_orders ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"supplier_id" uuid NOT NULL,
"order_id" uuid,
"delivery_date" date,
"address" text,
"net_total" numeric(20,2),
"tax_total" numeric(20,2),
"gross_total" numeric(20,2),
"frozen_snapshot" jsonb,
"content_hash" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX purchase_orders_tenant_status_idx ON purchase_orders(tenant_id,status,created_at,id);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON purchase_orders USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE products ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"sku" text,
"manufacturer_id" uuid,
"kind" text,
"unit" text,
"description" text,
"width_mm" numeric(20,6),
"height_mm" numeric(20,6),
"depth_mm" numeric(20,6),
"surface" text,
"active" boolean,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX products_tenant_status_idx ON products(tenant_id,status,created_at,id);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON products USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE price_import_batches ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"supplier_id" uuid,
"document_id" uuid,
"valid_from" date,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX price_import_batches_tenant_status_idx ON price_import_batches(tenant_id,status,created_at,id);
ALTER TABLE price_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_import_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON price_import_batches USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE stock_items ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"product_id" uuid,
"kind" text,
"location_id" uuid,
"lot_number" text,
"quantity" numeric(20,6) NOT NULL DEFAULT 0,
"unit" text,
"width_mm" numeric(20,6),
"height_mm" numeric(20,6),
"thickness_mm" numeric(20,6),
"cost_total" numeric(20,2),
"grain_direction" numeric(20,6),
"defects" text,
"reserved_quantity" numeric(20,6) NOT NULL DEFAULT 0,
"owner_party_id" uuid,
"lot_id" uuid,
"contour" jsonb,
"qr_token" text,
"is_owned" boolean DEFAULT true,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX stock_items_tenant_status_idx ON stock_items(tenant_id,status,created_at,id);
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stock_items USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE inventory_counts ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"location_id" uuid,
"count_date" date,
"blind" boolean,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX inventory_counts_tenant_status_idx ON inventory_counts(tenant_id,status,created_at,id);
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON inventory_counts USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE documents ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_kind" text,
"original_name" text NOT NULL,
"mime_type" text NOT NULL,
"size_bytes" bigint NOT NULL,
"content_hash" text NOT NULL,
"current_version_id" uuid,
"entity_type" text,
"entity_id" uuid,
"visibility" text DEFAULT 'internal',
"manually_named" boolean DEFAULT false,
"archived" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX documents_tenant_status_idx ON documents(tenant_id,status,created_at,id);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE import_batches ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"source_system" text,
"document_id" uuid,
"mapping" text,
"content_hash" text,
"checkpoint" integer DEFAULT 0,
"mapping_version" text,
"validation_report" jsonb,
"committed_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX import_batches_tenant_status_idx ON import_batches(tenant_id,status,created_at,id);
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON import_batches USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE employees ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"email" text,
"user_id" text,
"team_name" text,
"employment_start" date,
"employment_end" date,
"weekly_hours" numeric(20,6),
"work_pattern" text,
"holiday_region" text,
"annual_leave" numeric(20,6),
"active" boolean DEFAULT true,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX employees_tenant_status_idx ON employees(tenant_id,status,created_at,id);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employees USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE dispatch_assignments ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid,
"order_id" uuid,
"work_package_id" uuid,
"starts_at" timestamptz,
"ends_at" timestamptz,
"equipment_id" uuid,
"location" text,
"required_skill" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX dispatch_assignments_tenant_status_idx ON dispatch_assignments(tenant_id,status,created_at,id);
ALTER TABLE dispatch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON dispatch_assignments USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE leave_requests ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid,
"kind" text,
"starts_on" date,
"ends_on" date,
"days" numeric(20,6),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX leave_requests_tenant_status_idx ON leave_requests(tenant_id,status,created_at,id);
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leave_requests USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE tasks ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"order_id" uuid,
"assigned_to" uuid,
"due_date" date,
"priority" text,
"description" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX tasks_tenant_status_idx ON tasks(tenant_id,status,created_at,id);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tasks USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE equipment ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"kind" text,
"serial_number" text,
"inspection_due" date,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX equipment_tenant_status_idx ON equipment(tenant_id,status,created_at,id);
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON equipment USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE sites ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"customer_id" uuid,
"street" text,
"postal_code" text,
"city" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX sites_tenant_status_idx ON sites(tenant_id,status,created_at,id);
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sites USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE cemeteries ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"city" text,
"administration" text,
"source_url" text,
"rules_valid_until" date,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX cemeteries_tenant_status_idx ON cemeteries(tenant_id,status,created_at,id);
ALTER TABLE cemeteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cemeteries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON cemeteries USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE grave_plots ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"cemetery_id" uuid,
"grave_number" text,
"grave_type" text,
"customer_id" uuid,
"usage_until" date,
"permit_required" boolean,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX grave_plots_tenant_status_idx ON grave_plots(tenant_id,status,created_at,id);
ALTER TABLE grave_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE grave_plots FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON grave_plots USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE font_variants ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"font_family_id" uuid,
"selection_ref" text NOT NULL,
"supply_form" text NOT NULL,
"source_url" text NOT NULL,
"thumbnail_url" text NOT NULL,
"thumbnail_material" text,
"observed_at" date,
"geometry_status" text DEFAULT 'raster_reference',
"rights_status" text DEFAULT 'review_required',
"material_references" jsonb,
"catalog_heights" jsonb,
"source_hash" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX font_variants_tenant_status_idx ON font_variants(tenant_id,status,created_at,id);
ALTER TABLE font_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE font_variants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON font_variants USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE rule_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"domain" text,
"source_url" text,
"valid_from" date,
"valid_until" date,
"review_due" date,
"content" text,
"approved_by" text,
"approved_at" timestamptz,
"rule_version" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX rule_versions_tenant_status_idx ON rule_versions(tenant_id,status,created_at,id);
ALTER TABLE rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON rule_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE audit_events ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"action" text NOT NULL,
"aggregate_type" text NOT NULL,
"aggregate_id" uuid,
"aggregate_version" integer,
"actor_id" text NOT NULL,
"actor_type" text NOT NULL,
"correlation_id" text NOT NULL,
"reason" text,
"payload_hash" text NOT NULL,
"previous_hash" text,
"entry_hash" text NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX audit_events_tenant_status_idx ON audit_events(tenant_id,status,created_at,id);
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_events USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE job_runs ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"event_id" uuid,
"actor_id" text,
"job_type" text NOT NULL,
"payload" jsonb NOT NULL,
"attempts" integer NOT NULL DEFAULT 0,
"max_attempts" integer NOT NULL DEFAULT 5,
"lease_until" timestamptz,
"fencing_token" bigint NOT NULL DEFAULT 0,
"next_attempt_at" timestamptz DEFAULT now(),
"last_error" text,
"result" jsonb,
"checkpoint" jsonb,
"started_at" timestamptz,
"finished_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX job_runs_tenant_status_idx ON job_runs(tenant_id,status,created_at,id);
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON job_runs USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE notifications ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"user_id" text,
"event_id" uuid,
"policy_version" text,
"link" text,
"dedup_key" text NOT NULL,
"read_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX notifications_tenant_status_idx ON notifications(tenant_id,status,created_at,id);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notifications USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE legal_entities ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"company_name" text,
"street" text,
"postal_code" text,
"city" text,
"country" text,
"vat_id" text,
"tax_number" text,
"register_number" text,
"iban" text,
"bic" text,
"bank_holder" text,
"billing_approved" boolean DEFAULT false,
"tax_approved" boolean DEFAULT false,
"archive_verified" boolean DEFAULT false,
"einvoice_verified" boolean DEFAULT false,
"datev_approved" boolean DEFAULT false,
"manufacturing_approved" boolean DEFAULT false,
"contract_approved" boolean DEFAULT false,
"currency" char(3) DEFAULT 'EUR',
"invoice_prefix" text DEFAULT 'RE',
"invoice_year" integer,
"datev_advisor" text,
"datev_client" text,
"datev_account_length" integer,
"datev_mapping" jsonb,
"tax_profile" text,
"archive_region" text,
"backup_region" text,
"approved_at" timestamptz,
"approved_by" text,
"recovery_locked" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX legal_entities_tenant_status_idx ON legal_entities(tenant_id,status,created_at,id);
ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_entities FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON legal_entities USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE brands ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"logo_document_id" uuid,
"letterhead_version" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX brands_tenant_status_idx ON brands(tenant_id,status,created_at,id);
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON brands USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE business_units ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX business_units_tenant_status_idx ON business_units(tenant_id,status,created_at,id);
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_units FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON business_units USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE locations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"address" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX locations_tenant_status_idx ON locations(tenant_id,status,created_at,id);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON locations USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE memberships ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"user_id" text NOT NULL,
"role" text NOT NULL,
"permissions" text[] NOT NULL DEFAULT '{}',
"active" boolean NOT NULL DEFAULT true,
"permission_version" integer NOT NULL DEFAULT 1,
"employee_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX memberships_tenant_status_idx ON memberships(tenant_id,status,created_at,id);
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON memberships USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE contacts ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"party_id" uuid NOT NULL,
"email" text,
"phone" text,
"purpose" text,
"confirmed" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX contacts_tenant_status_idx ON contacts(tenant_id,status,created_at,id);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contacts USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE addresses ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"party_id" uuid NOT NULL,
"kind" text,
"street" text,
"postal_code" text,
"city" text,
"country" text,
"valid_from" date,
"valid_until" date,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX addresses_tenant_status_idx ON addresses(tenant_id,status,created_at,id);
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON addresses USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE party_roles ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"party_id" uuid NOT NULL,
"role" text NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX party_roles_tenant_status_idx ON party_roles(tenant_id,status,created_at,id);
ALTER TABLE party_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON party_roles USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE party_relationships ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"from_party_id" uuid NOT NULL,
"to_party_id" uuid NOT NULL,
"kind" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX party_relationships_tenant_status_idx ON party_relationships(tenant_id,status,created_at,id);
ALTER TABLE party_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_relationships FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON party_relationships USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE bank_account_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"party_id" uuid,
"iban" text NOT NULL,
"bic" text,
"holder" text,
"source_document_id" uuid,
"verified_by" text,
"verified_at" timestamptz,
"valid_from" date,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX bank_account_versions_tenant_status_idx ON bank_account_versions(tenant_id,status,created_at,id);
ALTER TABLE bank_account_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bank_account_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE quote_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"quote_id" uuid NOT NULL,
"revision" integer NOT NULL,
"content_hash" text NOT NULL,
"snapshot" jsonb NOT NULL,
"valid_until" date,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX quote_versions_tenant_status_idx ON quote_versions(tenant_id,status,created_at,id);
ALTER TABLE quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON quote_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE quote_acceptances ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"quote_id" uuid NOT NULL,
"quote_version_id" uuid NOT NULL,
"content_hash" text NOT NULL,
"person_name" text NOT NULL,
"statement" text NOT NULL,
"channel" text,
"identity_assurance" text,
"order_id" uuid,
"evidence_document_id" uuid,
"accepted_at" timestamptz DEFAULT now(),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX quote_acceptances_tenant_status_idx ON quote_acceptances(tenant_id,status,created_at,id);
ALTER TABLE quote_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_acceptances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON quote_acceptances USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE quote_lines ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"parent_id" uuid NOT NULL,
"position" integer NOT NULL,
"description" text NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"unit" text NOT NULL,
"unit_price" numeric(20,6) NOT NULL,
"tax_rate" numeric(8,4) NOT NULL,
"discount_percent" numeric(8,4) DEFAULT 0,
"net_amount" numeric(20,2) NOT NULL,
"line_type" text DEFAULT 'item',
"optional" boolean DEFAULT false,
"selected" boolean DEFAULT true,
"product_id" uuid,
"price_version_id" uuid,
"cost_unit" numeric(20,6),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX quote_lines_tenant_status_idx ON quote_lines(tenant_id,status,created_at,id);
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON quote_lines USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE invoice_lines ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"parent_id" uuid NOT NULL,
"position" integer NOT NULL,
"description" text NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"unit" text NOT NULL,
"unit_price" numeric(20,6) NOT NULL,
"tax_rate" numeric(8,4) NOT NULL,
"discount_percent" numeric(8,4) DEFAULT 0,
"net_amount" numeric(20,2) NOT NULL,
"line_type" text DEFAULT 'item',
"optional" boolean DEFAULT false,
"selected" boolean DEFAULT true,
"product_id" uuid,
"price_version_id" uuid,
"cost_unit" numeric(20,6),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX invoice_lines_tenant_status_idx ON invoice_lines(tenant_id,status,created_at,id);
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoice_lines USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE purchase_order_lines ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"parent_id" uuid NOT NULL,
"position" integer NOT NULL,
"description" text NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"unit" text NOT NULL,
"unit_price" numeric(20,6) NOT NULL,
"tax_rate" numeric(8,4) NOT NULL,
"discount_percent" numeric(8,4) DEFAULT 0,
"net_amount" numeric(20,2) NOT NULL,
"line_type" text DEFAULT 'item',
"optional" boolean DEFAULT false,
"selected" boolean DEFAULT true,
"product_id" uuid,
"price_version_id" uuid,
"cost_unit" numeric(20,6),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX purchase_order_lines_tenant_status_idx ON purchase_order_lines(tenant_id,status,created_at,id);
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON purchase_order_lines USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE change_order_lines ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"parent_id" uuid NOT NULL,
"position" integer NOT NULL,
"description" text NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"unit" text NOT NULL,
"unit_price" numeric(20,6) NOT NULL,
"tax_rate" numeric(8,4) NOT NULL,
"discount_percent" numeric(8,4) DEFAULT 0,
"net_amount" numeric(20,2) NOT NULL,
"line_type" text DEFAULT 'item',
"optional" boolean DEFAULT false,
"selected" boolean DEFAULT true,
"product_id" uuid,
"price_version_id" uuid,
"cost_unit" numeric(20,6),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX change_order_lines_tenant_status_idx ON change_order_lines(tenant_id,status,created_at,id);
ALTER TABLE change_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_order_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON change_order_lines USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE delivery_note_lines ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"parent_id" uuid NOT NULL,
"position" integer NOT NULL,
"description" text NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"unit" text NOT NULL,
"unit_price" numeric(20,6) NOT NULL,
"tax_rate" numeric(8,4) NOT NULL,
"discount_percent" numeric(8,4) DEFAULT 0,
"net_amount" numeric(20,2) NOT NULL,
"line_type" text DEFAULT 'item',
"optional" boolean DEFAULT false,
"selected" boolean DEFAULT true,
"product_id" uuid,
"price_version_id" uuid,
"cost_unit" numeric(20,6),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX delivery_note_lines_tenant_status_idx ON delivery_note_lines(tenant_id,status,created_at,id);
ALTER TABLE delivery_note_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON delivery_note_lines USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE supplier_invoice_lines ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"parent_id" uuid NOT NULL,
"position" integer NOT NULL,
"description" text NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"unit" text NOT NULL,
"unit_price" numeric(20,6) NOT NULL,
"tax_rate" numeric(8,4) NOT NULL,
"discount_percent" numeric(8,4) DEFAULT 0,
"net_amount" numeric(20,2) NOT NULL,
"line_type" text DEFAULT 'item',
"optional" boolean DEFAULT false,
"selected" boolean DEFAULT true,
"product_id" uuid,
"price_version_id" uuid,
"cost_unit" numeric(20,6),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX supplier_invoice_lines_tenant_status_idx ON supplier_invoice_lines(tenant_id,status,created_at,id);
ALTER TABLE supplier_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON supplier_invoice_lines USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE order_lines ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"parent_id" uuid NOT NULL,
"position" integer NOT NULL,
"description" text NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"unit" text NOT NULL,
"unit_price" numeric(20,6) NOT NULL,
"tax_rate" numeric(8,4) NOT NULL,
"discount_percent" numeric(8,4) DEFAULT 0,
"net_amount" numeric(20,2) NOT NULL,
"line_type" text DEFAULT 'item',
"optional" boolean DEFAULT false,
"selected" boolean DEFAULT true,
"product_id" uuid,
"price_version_id" uuid,
"cost_unit" numeric(20,6),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX order_lines_tenant_status_idx ON order_lines(tenant_id,status,created_at,id);
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON order_lines USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE order_confirmations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"order_id" uuid NOT NULL,
"content_hash" text NOT NULL,
"snapshot" jsonb NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX order_confirmations_tenant_status_idx ON order_confirmations(tenant_id,status,created_at,id);
ALTER TABLE order_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_confirmations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON order_confirmations USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE invoice_tax_summaries ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"invoice_id" uuid NOT NULL,
"tax_rate" numeric(8,4) NOT NULL,
"net_amount" numeric(20,2) NOT NULL,
"tax_amount" numeric(20,2) NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX invoice_tax_summaries_tenant_status_idx ON invoice_tax_summaries(tenant_id,status,created_at,id);
ALTER TABLE invoice_tax_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_tax_summaries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoice_tax_summaries USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE invoice_references ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"invoice_id" uuid NOT NULL,
"reference_invoice_id" uuid NOT NULL,
"kind" text NOT NULL,
"received_amount" numeric(20,2) NOT NULL,
"tax_rate" numeric(8,4),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX invoice_references_tenant_status_idx ON invoice_references(tenant_id,status,created_at,id);
ALTER TABLE invoice_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_references FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoice_references USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE number_counters ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"scope" text NOT NULL,
"year" integer NOT NULL,
"last_value" integer NOT NULL DEFAULT 0,
"locked" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX number_counters_tenant_status_idx ON number_counters(tenant_id,status,created_at,id);
ALTER TABLE number_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_counters FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON number_counters USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE issuance_evidence ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"invoice_id" uuid NOT NULL,
"invoice_number" text NOT NULL,
"content_hash" text NOT NULL,
"archive_manifest_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX issuance_evidence_tenant_status_idx ON issuance_evidence(tenant_id,status,created_at,id);
ALTER TABLE issuance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuance_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON issuance_evidence USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE receivables ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"invoice_id" uuid NOT NULL,
"party_id" uuid NOT NULL,
"original_amount" numeric(20,2) NOT NULL,
"open_amount" numeric(20,2) NOT NULL,
"currency" char(3) DEFAULT 'EUR',
"due_date" date,
"disputed" boolean DEFAULT false,
"transferred_to_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX receivables_tenant_status_idx ON receivables(tenant_id,status,created_at,id);
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON receivables USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE payables ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"invoice_id" uuid NOT NULL,
"party_id" uuid NOT NULL,
"original_amount" numeric(20,2) NOT NULL,
"open_amount" numeric(20,2) NOT NULL,
"currency" char(3) DEFAULT 'EUR',
"due_date" date,
"disputed" boolean DEFAULT false,
"transferred_to_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX payables_tenant_status_idx ON payables(tenant_id,status,created_at,id);
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payables USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE payment_allocations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"payment_id" uuid NOT NULL,
"target_kind" text NOT NULL,
"receivable_id" uuid,
"payable_id" uuid,
"amount" numeric(20,2) NOT NULL,
"kind" text DEFAULT 'cash',
"reason" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX payment_allocations_tenant_status_idx ON payment_allocations(tenant_id,status,created_at,id);
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payment_allocations USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE bank_statement_imports ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_id" uuid NOT NULL,
"content_hash" text NOT NULL,
"mapping_version" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX bank_statement_imports_tenant_status_idx ON bank_statement_imports(tenant_id,status,created_at,id);
ALTER TABLE bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_imports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bank_statement_imports USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE bank_transactions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"import_id" uuid NOT NULL,
"bank_account_id" uuid,
"external_id" text,
"booking_date" date,
"value_date" date,
"amount" numeric(20,2),
"currency" char(3),
"reference" text,
"payment_id" uuid,
"duplicate_review" boolean DEFAULT true,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX bank_transactions_tenant_status_idx ON bank_transactions(tenant_id,status,created_at,id);
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bank_transactions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE dunning_cases ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"receivable_id" uuid NOT NULL,
"stage" integer DEFAULT 0,
"blocked" boolean DEFAULT false,
"reason" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX dunning_cases_tenant_status_idx ON dunning_cases(tenant_id,status,created_at,id);
ALTER TABLE dunning_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_cases FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON dunning_cases USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE accounting_periods ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"starts_on" date NOT NULL,
"ends_on" date NOT NULL,
"locked" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX accounting_periods_tenant_status_idx ON accounting_periods(tenant_id,status,created_at,id);
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON accounting_periods USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE datev_export_batches ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"starts_on" date,
"ends_on" date,
"mapping_version" text,
"content_hash" text,
"manifest" jsonb,
"document_id" uuid,
"import_confirmed_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX datev_export_batches_tenant_status_idx ON datev_export_batches(tenant_id,status,created_at,id);
ALTER TABLE datev_export_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE datev_export_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON datev_export_batches USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE datev_export_items ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"batch_id" uuid NOT NULL,
"invoice_id" uuid,
"supplier_invoice_id" uuid,
"amount" numeric(20,2),
"account" text,
"counter_account" text,
"tax_key" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX datev_export_items_tenant_status_idx ON datev_export_items(tenant_id,status,created_at,id);
ALTER TABLE datev_export_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE datev_export_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON datev_export_items USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE manufacturers ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"source_url" text,
"source_label" text,
"observed_at" date,
"identity_status" text DEFAULT 'reference',
"rights_status" text DEFAULT 'review_required',UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX manufacturers_tenant_status_idx ON manufacturers(tenant_id,status,created_at,id);
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON manufacturers USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE product_categories ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"parent_id" uuid,
"active" boolean DEFAULT true,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX product_categories_tenant_status_idx ON product_categories(tenant_id,status,created_at,id);
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON product_categories USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE product_variants ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"product_id" uuid NOT NULL,
"sku" text,
"active_version_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX product_variants_tenant_status_idx ON product_variants(tenant_id,status,created_at,id);
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON product_variants USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE product_variant_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"product_variant_id" uuid NOT NULL,
"revision" integer,
"width_mm" numeric(20,2),
"height_mm" numeric(20,2),
"depth_mm" numeric(20,2),
"source_document_id" uuid,
"content_hash" text,
"properties" jsonb,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX product_variant_versions_tenant_status_idx ON product_variant_versions(tenant_id,status,created_at,id);
ALTER TABLE product_variant_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON product_variant_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE product_assets ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"product_variant_version_id" uuid,
"document_id" uuid,
"kind" text,
"accuracy" text,
"rights_verified" boolean DEFAULT false,
"geometry_verified" boolean DEFAULT false,
"content_hash" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX product_assets_tenant_status_idx ON product_assets(tenant_id,status,created_at,id);
ALTER TABLE product_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON product_assets USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE material_specs ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"kind" text,
"active_version_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX material_specs_tenant_status_idx ON material_specs(tenant_id,status,created_at,id);
ALTER TABLE material_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_specs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON material_specs USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE material_spec_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"material_spec_id" uuid NOT NULL,
"surface" text,
"thickness_mm" numeric(20,2),
"density_kg_m3" numeric(20,6),
"source_document_id" uuid,
"properties" jsonb,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX material_spec_versions_tenant_status_idx ON material_spec_versions(tenant_id,status,created_at,id);
ALTER TABLE material_spec_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_spec_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON material_spec_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE supplier_price_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"supplier_id" uuid NOT NULL,
"product_id" uuid NOT NULL,
"sku" text,
"amount" numeric(20,6) NOT NULL,
"currency" char(3) DEFAULT 'EUR',
"basis_quantity" numeric(20,6) NOT NULL DEFAULT 1,
"unit" text NOT NULL,
"min_quantity" numeric(20,6) DEFAULT 0,
"valid_from" date NOT NULL,
"valid_until" date,
"batch_id" uuid,
"source_document_id" uuid,
"source_locator" text,
"active" boolean DEFAULT true,
"previous_version_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX supplier_price_versions_tenant_status_idx ON supplier_price_versions(tenant_id,status,created_at,id);
ALTER TABLE supplier_price_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON supplier_price_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE sales_price_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"product_id" uuid NOT NULL,
"amount" numeric(20,6),
"currency" char(3) DEFAULT 'EUR',
"basis_quantity" numeric(20,6) DEFAULT 1,
"unit" text,
"valid_from" date,
"valid_until" date,
"source_version_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX sales_price_versions_tenant_status_idx ON sales_price_versions(tenant_id,status,created_at,id);
ALTER TABLE sales_price_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_price_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sales_price_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE price_import_rows ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"batch_id" uuid NOT NULL,
"row_number" integer NOT NULL,
"product_id" uuid,
"sku" text,
"description" text,
"amount" numeric(20,6),
"basis_quantity" numeric(20,6),
"unit" text,
"currency" char(3),
"previous_amount" numeric(20,6),
"source_locator" text,
"errors" text[],
"approved" boolean DEFAULT false,
"raw" jsonb,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX price_import_rows_tenant_status_idx ON price_import_rows(tenant_id,status,created_at,id);
ALTER TABLE price_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_import_rows FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON price_import_rows USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE goods_receipts ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"purchase_order_id" uuid NOT NULL,
"stock_item_id" uuid NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"receipt_date" timestamptz DEFAULT now(),
"source_document_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX goods_receipts_tenant_status_idx ON goods_receipts(tenant_id,status,created_at,id);
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON goods_receipts USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE supplier_invoice_allocations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"supplier_invoice_id" uuid NOT NULL,
"order_id" uuid,
"stock_item_id" uuid,
"cost_center" text,
"amount" numeric(20,2) NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX supplier_invoice_allocations_tenant_status_idx ON supplier_invoice_allocations(tenant_id,status,created_at,id);
ALTER TABLE supplier_invoice_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_allocations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON supplier_invoice_allocations USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE stock_locations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"code" text,
"address" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX stock_locations_tenant_status_idx ON stock_locations(tenant_id,status,created_at,id);
ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_locations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stock_locations USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE stock_lots ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"supplier_id" uuid,
"material_spec_version_id" uuid,
"received_at" date,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX stock_lots_tenant_status_idx ON stock_lots(tenant_id,status,created_at,id);
ALTER TABLE stock_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_lots FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stock_lots USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE stock_movements ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"stock_item_id" uuid NOT NULL,
"order_id" uuid,
"kind" text NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"unit" text NOT NULL,
"cost_amount" numeric(20,2),
"source_location_id" uuid,
"target_location_id" uuid,
"reason" text NOT NULL,
"source_document_id" uuid,
"cutting_job_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX stock_movements_tenant_status_idx ON stock_movements(tenant_id,status,created_at,id);
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stock_movements USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE stock_reservations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"stock_item_id" uuid NOT NULL,
"order_id" uuid NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"expires_at" timestamptz,
"released_at" timestamptz,
"contour" jsonb,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX stock_reservations_tenant_status_idx ON stock_reservations(tenant_id,status,created_at,id);
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stock_reservations USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE cutting_jobs ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"stock_item_id" uuid NOT NULL,
"order_id" uuid,
"input_quantity" numeric(20,6),
"input_cost" numeric(20,2),
"rule_version_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX cutting_jobs_tenant_status_idx ON cutting_jobs(tenant_id,status,created_at,id);
ALTER TABLE cutting_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON cutting_jobs USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE cutting_outputs ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"cutting_job_id" uuid NOT NULL,
"stock_item_id" uuid,
"kind" text NOT NULL,
"quantity" numeric(20,6) NOT NULL,
"cost_amount" numeric(20,2) NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX cutting_outputs_tenant_status_idx ON cutting_outputs(tenant_id,status,created_at,id);
ALTER TABLE cutting_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_outputs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON cutting_outputs USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE inventory_count_lines ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"inventory_count_id" uuid NOT NULL,
"stock_item_id" uuid NOT NULL,
"expected_quantity" numeric(20,6) NOT NULL,
"counted_quantity" numeric(20,6),
"movement_sequence" bigint,
"counted_by" text,
"reason" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX inventory_count_lines_tenant_status_idx ON inventory_count_lines(tenant_id,status,created_at,id);
ALTER TABLE inventory_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON inventory_count_lines USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE qr_labels ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"token" text NOT NULL,
"entity_type" text NOT NULL,
"entity_id" uuid NOT NULL,
"revoked_at" timestamptz,
"printed_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX qr_labels_tenant_status_idx ON qr_labels(tenant_id,status,created_at,id);
ALTER TABLE qr_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_labels FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON qr_labels USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE equipment_maintenance ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"equipment_id" uuid NOT NULL,
"due_date" date,
"completed_at" date,
"document_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX equipment_maintenance_tenant_status_idx ON equipment_maintenance(tenant_id,status,created_at,id);
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON equipment_maintenance USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE buildings ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"site_id" uuid NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX buildings_tenant_status_idx ON buildings(tenant_id,status,created_at,id);
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON buildings USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE floors ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"building_id" uuid NOT NULL,
"level_mm" numeric(20,2),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX floors_tenant_status_idx ON floors(tenant_id,status,created_at,id);
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON floors USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE rooms ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"floor_id" uuid NOT NULL,
"site_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX rooms_tenant_status_idx ON rooms(tenant_id,status,created_at,id);
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON rooms USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE cemetery_rule_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"cemetery_id" uuid NOT NULL,
"document_id" uuid NOT NULL,
"valid_from" date,
"valid_until" date,
"approved_by" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX cemetery_rule_versions_tenant_status_idx ON cemetery_rule_versions(tenant_id,status,created_at,id);
ALTER TABLE cemetery_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cemetery_rule_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON cemetery_rule_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE memorial_people ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"grave_plot_id" uuid NOT NULL,
"exact_name" text NOT NULL,
"birth_display" text,
"death_display" text,
"date_accuracy" text,
"confirmed" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX memorial_people_tenant_status_idx ON memorial_people(tenant_id,status,created_at,id);
ALTER TABLE memorial_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_people FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON memorial_people USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE grave_permissions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"grave_plot_id" uuid NOT NULL,
"revision_id" uuid,
"document_id" uuid,
"approved_at" timestamptz,
"authority" text,
"conditions" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX grave_permissions_tenant_status_idx ON grave_permissions(tenant_id,status,created_at,id);
ALTER TABLE grave_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grave_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON grave_permissions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE measurements ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"planning_project_id" uuid NOT NULL,
"value_mm" numeric(20,2),
"semantic" text NOT NULL,
"review_status" text NOT NULL,
"is_estimated" boolean DEFAULT true,
"method" text,
"measured_by" text,
"measured_at" timestamptz,
"evidence_document_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX measurements_tenant_status_idx ON measurements(tenant_id,status,created_at,id);
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON measurements USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE planning_projects ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"kind" text NOT NULL,
"order_id" uuid,
"site_id" uuid,
"grave_plot_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX planning_projects_tenant_status_idx ON planning_projects(tenant_id,status,created_at,id);
ALTER TABLE planning_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_projects FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON planning_projects USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE design_variants ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"planning_project_id" uuid NOT NULL,
"head_revision_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX design_variants_tenant_status_idx ON design_variants(tenant_id,status,created_at,id);
ALTER TABLE design_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_variants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON design_variants USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE design_revisions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"variant_id" uuid NOT NULL,
"parent_revision_id" uuid,
"snapshot" jsonb NOT NULL,
"content_hash" text NOT NULL,
"schema_version" integer NOT NULL DEFAULT 1,
"revision_number" integer NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX design_revisions_tenant_status_idx ON design_revisions(tenant_id,status,created_at,id);
ALTER TABLE design_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON design_revisions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE design_commands ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"variant_id" uuid NOT NULL,
"base_revision_id" uuid NOT NULL,
"revision_id" uuid NOT NULL,
"operations" jsonb NOT NULL,
"undo_of_command_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX design_commands_tenant_status_idx ON design_commands(tenant_id,status,created_at,id);
ALTER TABLE design_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_commands FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON design_commands USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE design_conflicts ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"variant_id" uuid NOT NULL,
"base_revision_id" uuid,
"proposed_operations" jsonb,
"resolved_by_command_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX design_conflicts_tenant_status_idx ON design_conflicts(tenant_id,status,created_at,id);
ALTER TABLE design_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_conflicts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON design_conflicts USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE design_approvals ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"variant_id" uuid NOT NULL,
"revision_id" uuid NOT NULL,
"kind" text NOT NULL,
"statement" text NOT NULL,
"content_hash" text NOT NULL,
"identity_assurance" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX design_approvals_tenant_status_idx ON design_approvals(tenant_id,status,created_at,id);
ALTER TABLE design_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_approvals FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON design_approvals USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE manufacturing_releases ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"variant_id" uuid NOT NULL,
"revision_id" uuid NOT NULL,
"content_hash" text NOT NULL,
"render_manifest_id" uuid,
"reason" text NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX manufacturing_releases_tenant_status_idx ON manufacturing_releases(tenant_id,status,created_at,id);
ALTER TABLE manufacturing_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_releases FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON manufacturing_releases USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE release_packages ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"release_id" uuid NOT NULL,
"revision_id" uuid NOT NULL,
"manifest_hash" text,
"validation_report" jsonb,
"package_ready" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX release_packages_tenant_status_idx ON release_packages(tenant_id,status,created_at,id);
ALTER TABLE release_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON release_packages USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE bom_snapshots ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"revision_id" uuid NOT NULL,
"content_hash" text NOT NULL,
"lines" jsonb NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX bom_snapshots_tenant_status_idx ON bom_snapshots(tenant_id,status,created_at,id);
ALTER TABLE bom_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bom_snapshots USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE render_manifests ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"revision_id" uuid NOT NULL,
"content_hash" text NOT NULL,
"generator_version" text NOT NULL,
"manifest" jsonb NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX render_manifests_tenant_status_idx ON render_manifests(tenant_id,status,created_at,id);
ALTER TABLE render_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_manifests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON render_manifests USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE render_jobs ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"revision_id" uuid NOT NULL,
"profile" text,
"job_run_id" uuid,
"connection_version_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX render_jobs_tenant_status_idx ON render_jobs(tenant_id,status,created_at,id);
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON render_jobs USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE render_artifacts ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"revision_id" uuid NOT NULL,
"document_id" uuid NOT NULL,
"content_hash" text,
"kind" text,
"width_px" integer,
"height_px" integer,
"accuracy" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX render_artifacts_tenant_status_idx ON render_artifacts(tenant_id,status,created_at,id);
ALTER TABLE render_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_artifacts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON render_artifacts USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE font_families ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"manufacturer_id" uuid,
"source_url" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX font_families_tenant_status_idx ON font_families(tenant_id,status,created_at,id);
ALTER TABLE font_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE font_families FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON font_families USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE glyph_assets ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"font_variant_id" uuid NOT NULL,
"text" text NOT NULL,
"asset_document_id" uuid,
"geometry_verified" boolean DEFAULT false,
"width_mm" numeric(20,2),
"height_mm" numeric(20,2),
"fastening_data" jsonb,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX glyph_assets_tenant_status_idx ON glyph_assets(tenant_id,status,created_at,id);
ALTER TABLE glyph_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE glyph_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON glyph_assets USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE employment_periods ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"starts_on" date NOT NULL,
"ends_on" date,
"weekly_hours" numeric(8,2),
"holiday_region" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX employment_periods_tenant_status_idx ON employment_periods(tenant_id,status,created_at,id);
ALTER TABLE employment_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_periods FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employment_periods USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE work_schedules ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"valid_from" date NOT NULL,
"valid_until" date,
"mon" numeric(6,2),
"tue" numeric(6,2),
"wed" numeric(6,2),
"thu" numeric(6,2),
"fri" numeric(6,2),
"sat" numeric(6,2),
"sun" numeric(6,2),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX work_schedules_tenant_status_idx ON work_schedules(tenant_id,status,created_at,id);
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON work_schedules USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE employee_skills ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"skill" text NOT NULL,
"valid_until" date,
"evidence_document_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX employee_skills_tenant_status_idx ON employee_skills(tenant_id,status,created_at,id);
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_skills USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE employee_cost_rate_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"valid_from" date NOT NULL,
"valid_until" date,
"rate" numeric(20,6) NOT NULL,
"currency" char(3) DEFAULT 'EUR',
"kind" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX employee_cost_rate_versions_tenant_status_idx ON employee_cost_rate_versions(tenant_id,status,created_at,id);
ALTER TABLE employee_cost_rate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_cost_rate_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_cost_rate_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE leave_entitlements ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"year" integer NOT NULL,
"days" numeric(8,2) NOT NULL,
"kind" text NOT NULL,
"rule_version_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX leave_entitlements_tenant_status_idx ON leave_entitlements(tenant_id,status,created_at,id);
ALTER TABLE leave_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_entitlements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leave_entitlements USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE leave_ledger ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"request_id" uuid,
"year" integer NOT NULL,
"days" numeric(8,2) NOT NULL,
"kind" text NOT NULL,
"reason" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX leave_ledger_tenant_status_idx ON leave_ledger(tenant_id,status,created_at,id);
ALTER TABLE leave_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_ledger FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leave_ledger USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE time_sessions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"started_at" timestamptz NOT NULL,
"ended_at" timestamptz,
"active" boolean NOT NULL DEFAULT true,
"device_id" text,
"timezone" text DEFAULT 'Europe/Berlin',
"current_order_id" uuid,
"current_activity" text,
"received_at" timestamptz DEFAULT now(),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX time_sessions_tenant_status_idx ON time_sessions(tenant_id,status,created_at,id);
ALTER TABLE time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON time_sessions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE time_segments ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"time_session_id" uuid NOT NULL,
"employee_id" uuid NOT NULL,
"kind" text NOT NULL,
"started_at" timestamptz NOT NULL,
"ended_at" timestamptz,
"received_at" timestamptz DEFAULT now(),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX time_segments_tenant_status_idx ON time_segments(tenant_id,status,created_at,id);
ALTER TABLE time_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_segments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON time_segments USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE time_allocations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"time_segment_id" uuid NOT NULL,
"time_session_id" uuid NOT NULL,
"employee_id" uuid NOT NULL,
"order_id" uuid,
"work_package_id" uuid,
"cost_center" text,
"activity" text,
"started_at" timestamptz NOT NULL,
"ended_at" timestamptz,
"billable" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX time_allocations_tenant_status_idx ON time_allocations(tenant_id,status,created_at,id);
ALTER TABLE time_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_allocations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON time_allocations USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE time_submissions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"starts_on" date NOT NULL,
"ends_on" date NOT NULL,
"session_ids" uuid[] NOT NULL,
"approved_by" text,
"approved_at" timestamptz,
"warnings" text[],
"reason" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX time_submissions_tenant_status_idx ON time_submissions(tenant_id,status,created_at,id);
ALTER TABLE time_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_submissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON time_submissions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE time_corrections ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"session_id" uuid NOT NULL,
"old_snapshot" jsonb NOT NULL,
"new_snapshot" jsonb NOT NULL,
"reason" text NOT NULL,
"approved_by" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX time_corrections_tenant_status_idx ON time_corrections(tenant_id,status,created_at,id);
ALTER TABLE time_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_corrections FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON time_corrections USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE time_account_ledger ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"submission_id" uuid NOT NULL,
"seconds" integer NOT NULL,
"kind" text NOT NULL,
"source_version" integer NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX time_account_ledger_tenant_status_idx ON time_account_ledger(tenant_id,status,created_at,id);
ALTER TABLE time_account_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_account_ledger FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON time_account_ledger USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE labor_cost_ledger ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"submission_id" uuid NOT NULL,
"allocation_id" uuid NOT NULL,
"order_id" uuid,
"seconds" integer NOT NULL,
"rate_version_id" uuid,
"amount" numeric(20,2),
"source_version" integer NOT NULL,
"kind" text NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX labor_cost_ledger_tenant_status_idx ON labor_cost_ledger(tenant_id,status,created_at,id);
ALTER TABLE labor_cost_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_cost_ledger FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON labor_cost_ledger USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE time_quantity_entries ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"work_package_id" uuid,
"order_id" uuid,
"quantity" numeric(20,6) NOT NULL,
"unit" text NOT NULL,
"activity" text,
"performed_on" date NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX time_quantity_entries_tenant_status_idx ON time_quantity_entries(tenant_id,status,created_at,id);
ALTER TABLE time_quantity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_quantity_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON time_quantity_entries USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE work_reports ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"employee_id" uuid NOT NULL,
"order_id" uuid,
"work_package_id" uuid,
"performed_on" date,
"description" text,
"document_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX work_reports_tenant_status_idx ON work_reports(tenant_id,status,created_at,id);
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON work_reports USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE document_versions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_id" uuid NOT NULL,
"blob_object_id" uuid NOT NULL,
"content_hash" text NOT NULL,
"revision" integer NOT NULL,
"kind" text DEFAULT 'original',UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX document_versions_tenant_status_idx ON document_versions(tenant_id,status,created_at,id);
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_versions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE blob_objects ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"storage_key" text NOT NULL,
"provider" text NOT NULL,
"content_hash" text NOT NULL,
"mime_type" text NOT NULL,
"size_bytes" bigint NOT NULL,
"storage_version_id" text,
"retention_policy_version" text,
"retention_basis" text,
"retention_started_at" timestamptz,
"retain_until" timestamptz,
"lock_mode" text,
"lock_verified_at" timestamptz,
"scan_status" text DEFAULT 'quarantine',UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX blob_objects_tenant_status_idx ON blob_objects(tenant_id,status,created_at,id);
ALTER TABLE blob_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE blob_objects FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON blob_objects USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE document_links ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_id" uuid NOT NULL,
"entity_type" text NOT NULL,
"entity_id" uuid NOT NULL,
"purpose" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX document_links_tenant_status_idx ON document_links(tenant_id,status,created_at,id);
ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_links FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_links USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE document_extractions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_version_id" uuid NOT NULL,
"field_name" text NOT NULL,
"value" text,
"source_locator" text,
"parser_version" text,
"reviewed_by" text,
"source_kind" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX document_extractions_tenant_status_idx ON document_extractions(tenant_id,status,created_at,id);
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_extractions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE search_documents ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_id" uuid NOT NULL,
"document_version_id" uuid NOT NULL,
"content" text,
"search_vector" tsvector,
"scope" text NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX search_documents_tenant_status_idx ON search_documents(tenant_id,status,created_at,id);
ALTER TABLE search_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON search_documents USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE retention_policies ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_kind" text NOT NULL,
"years" integer,
"basis" text NOT NULL,
"approved_by" text,
"valid_from" date,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX retention_policies_tenant_status_idx ON retention_policies(tenant_id,status,created_at,id);
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON retention_policies USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE retention_assignments ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_version_id" uuid NOT NULL,
"policy_id" uuid NOT NULL,
"started_at" timestamptz NOT NULL,
"retain_until" timestamptz NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX retention_assignments_tenant_status_idx ON retention_assignments(tenant_id,status,created_at,id);
ALTER TABLE retention_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON retention_assignments USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE legal_holds ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_id" uuid NOT NULL,
"reason" text NOT NULL,
"review_due" date,
"released_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX legal_holds_tenant_status_idx ON legal_holds(tenant_id,status,created_at,id);
ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_holds FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON legal_holds USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE deletion_jobs ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"document_id" uuid,
"party_id" uuid,
"reason" text NOT NULL,
"decision" jsonb,
"approved_by" text,
"approved_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX deletion_jobs_tenant_status_idx ON deletion_jobs(tenant_id,status,created_at,id);
ALTER TABLE deletion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON deletion_jobs USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE deletion_tombstones ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"object_hash" text NOT NULL,
"entity_type" text NOT NULL,
"deleted_at" timestamptz NOT NULL DEFAULT now(),
"review_due" date,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX deletion_tombstones_tenant_status_idx ON deletion_tombstones(tenant_id,status,created_at,id);
ALTER TABLE deletion_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_tombstones FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON deletion_tombstones USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE staging_records ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"batch_id" uuid NOT NULL,
"row_number" integer NOT NULL,
"entity_type" text NOT NULL,
"legacy_id" text,
"data" jsonb NOT NULL,
"errors" text[],
"approved" boolean DEFAULT false,
"committed_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX staging_records_tenant_status_idx ON staging_records(tenant_id,status,created_at,id);
ALTER TABLE staging_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staging_records USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE import_files ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"batch_id" uuid NOT NULL,
"document_id" uuid,
"original_path" text NOT NULL,
"content_hash" text NOT NULL,
"size_bytes" bigint,
"checkpoint" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX import_files_tenant_status_idx ON import_files(tenant_id,status,created_at,id);
ALTER TABLE import_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_files FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON import_files USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE legacy_id_map ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"source_system" text NOT NULL,
"entity_type" text NOT NULL,
"legacy_id" text NOT NULL,
"entity_id" uuid NOT NULL,
"batch_id" uuid NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX legacy_id_map_tenant_status_idx ON legacy_id_map(tenant_id,status,created_at,id);
ALTER TABLE legacy_id_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_id_map FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON legacy_id_map USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE portal_accesses ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"customer_id" uuid NOT NULL,
"token_hash" text NOT NULL,
"password_hash" text NOT NULL,
"contact_name" text,
"identity_assurance" text NOT NULL,
"expires_at" timestamptz,
"revoked_at" timestamptz,
"allow_binding" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX portal_accesses_tenant_status_idx ON portal_accesses(tenant_id,status,created_at,id);
ALTER TABLE portal_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_accesses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON portal_accesses USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE portal_sessions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"portal_access_id" uuid NOT NULL,
"token_hash" text NOT NULL,
"expires_at" timestamptz NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX portal_sessions_tenant_status_idx ON portal_sessions(tenant_id,status,created_at,id);
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON portal_sessions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE portal_grants ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"portal_access_id" uuid NOT NULL,
"entity_type" text NOT NULL,
"entity_id" uuid NOT NULL,
"capabilities" text[] NOT NULL,
"revoked_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX portal_grants_tenant_status_idx ON portal_grants(tenant_id,status,created_at,id);
ALTER TABLE portal_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON portal_grants USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE portal_publications ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"portal_access_id" uuid NOT NULL,
"entity_type" text NOT NULL,
"entity_id" uuid NOT NULL,
"revision_id" uuid,
"document_version_id" uuid,
"content_hash" text NOT NULL,
"audience" text NOT NULL,
"published_at" timestamptz DEFAULT now(),
"revoked_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX portal_publications_tenant_status_idx ON portal_publications(tenant_id,status,created_at,id);
ALTER TABLE portal_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_publications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON portal_publications USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE portal_declarations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"portal_access_id" uuid,
"order_id" uuid,
"quote_version_id" uuid,
"kind" text NOT NULL,
"statement" text NOT NULL,
"person_name" text,
"identity_assurance" text,
"content_hash" text,
"received_at" timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX portal_declarations_tenant_status_idx ON portal_declarations(tenant_id,status,created_at,id);
ALTER TABLE portal_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_declarations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON portal_declarations USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE threads ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"order_id" uuid,
"customer_id" uuid,
"visibility" text NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX threads_tenant_status_idx ON threads(tenant_id,status,created_at,id);
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON threads USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE messages ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"thread_id" uuid NOT NULL,
"portal_access_id" uuid,
"body" text NOT NULL,
"sender_name" text,
"visibility" text NOT NULL,
"revision_id" uuid,
"element_id" text,
"position" jsonb,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX messages_tenant_status_idx ON messages(tenant_id,status,created_at,id);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON messages USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE outgoing_messages ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"recipient" text NOT NULL,
"sender" text NOT NULL,
"reply_to" text,
"subject" text NOT NULL,
"body" text NOT NULL,
"attachment_version_ids" uuid[] DEFAULT '{}',
"content_hash" text,
"message_id" text NOT NULL,
"approved_by" text,
"approved_at" timestamptz,
"provider_response" text,
"sent_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX outgoing_messages_tenant_status_idx ON outgoing_messages(tenant_id,status,created_at,id);
ALTER TABLE outgoing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON outgoing_messages USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE delivery_attempts ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"outgoing_message_id" uuid NOT NULL,
"attempt" integer NOT NULL,
"started_at" timestamptz NOT NULL,
"finished_at" timestamptz,
"result" text,
"safe_error" text,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX delivery_attempts_tenant_status_idx ON delivery_attempts(tenant_id,status,created_at,id);
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON delivery_attempts USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE email_templates ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"kind" text NOT NULL,
"subject" text NOT NULL,
"body" text NOT NULL,
"allowed_variables" text[],
"active" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX email_templates_tenant_status_idx ON email_templates(tenant_id,status,created_at,id);
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON email_templates USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE notification_preferences ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"user_id" text NOT NULL,
"channel" text NOT NULL,
"category" text NOT NULL,
"enabled" boolean DEFAULT true,
"quiet_from" time,
"quiet_until" time,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX notification_preferences_tenant_status_idx ON notification_preferences(tenant_id,status,created_at,id);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_preferences USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE integration_connections ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"provider" text NOT NULL,
"secret_reference" text,
"fingerprint" text,
"configuration" jsonb,
"checked_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX integration_connections_tenant_status_idx ON integration_connections(tenant_id,status,created_at,id);
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON integration_connections USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE ai_runs ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"actor_id" text NOT NULL,
"capability" text NOT NULL,
"model_id" text NOT NULL,
"connection_version_id" uuid,
"request_hash" text NOT NULL,
"provider_id" text,
"input_tokens" integer,
"output_tokens" integer,
"cost_reserved" numeric(20,6),
"cost_actual" numeric(20,6),
"result" jsonb,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX ai_runs_tenant_status_idx ON ai_runs(tenant_id,status,created_at,id);
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_runs USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE ai_proposals ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"actor_id" text NOT NULL,
"entity_type" text,
"entity_id" uuid,
"base_version" integer,
"action_type" text NOT NULL,
"commands" jsonb NOT NULL,
"evidence" jsonb,
"assumptions" text[],
"missing_inputs" text[],
"validation" jsonb,
"expires_at" timestamptz,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX ai_proposals_tenant_status_idx ON ai_proposals(tenant_id,status,created_at,id);
ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_proposals FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_proposals USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE ai_budgets ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"period" text NOT NULL,
"limit_amount" numeric(20,6) NOT NULL,
"reserved" numeric(20,6) NOT NULL DEFAULT 0,
"spent" numeric(20,6) NOT NULL DEFAULT 0,
"currency" char(3) DEFAULT 'EUR',UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX ai_budgets_tenant_status_idx ON ai_budgets(tenant_id,status,created_at,id);
ALTER TABLE ai_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budgets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_budgets USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE ai_budget_reservations ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"run_id" uuid NOT NULL,
"budget_id" uuid NOT NULL,
"amount" numeric(20,6) NOT NULL,
"settled" boolean DEFAULT false,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX ai_budget_reservations_tenant_status_idx ON ai_budget_reservations(tenant_id,status,created_at,id);
ALTER TABLE ai_budget_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_budget_reservations USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE metric_definitions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"key" text NOT NULL,
"definition" text NOT NULL,
"unit" text NOT NULL,
"source_tables" text[] NOT NULL,
"permission" text NOT NULL,
"definition_version" text NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX metric_definitions_tenant_status_idx ON metric_definitions(tenant_id,status,created_at,id);
ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_definitions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON metric_definitions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE data_quality_issues ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"entity_type" text NOT NULL,
"entity_id" uuid,
"code" text NOT NULL,
"severity" text NOT NULL,
"description" text NOT NULL,
"assigned_to" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX data_quality_issues_tenant_status_idx ON data_quality_issues(tenant_id,status,created_at,id);
ALTER TABLE data_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_issues FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON data_quality_issues USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE command_receipts ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"actor_scope" text NOT NULL,
"command_name" text NOT NULL,
"idempotency_key" text NOT NULL,
"payload_hash" text NOT NULL,
"result" jsonb NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX command_receipts_tenant_status_idx ON command_receipts(tenant_id,status,created_at,id);
ALTER TABLE command_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON command_receipts USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE outbox_events ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"event_type" text NOT NULL,
"aggregate_type" text NOT NULL,
"aggregate_id" uuid NOT NULL,
"aggregate_version" integer NOT NULL,
"event_sequence" integer NOT NULL DEFAULT 0,
"actor_id" text NOT NULL,
"correlation_id" text NOT NULL,
"payload" jsonb NOT NULL,
"published_at" timestamptz,
"attempts" integer NOT NULL DEFAULT 0,
"lease_until" timestamptz,
"fencing_token" bigint NOT NULL DEFAULT 0,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX outbox_events_tenant_status_idx ON outbox_events(tenant_id,status,created_at,id);
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON outbox_events USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE consumer_inbox ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"consumer_name" text NOT NULL,
"event_id" uuid NOT NULL,
"processed_at" timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX consumer_inbox_tenant_status_idx ON consumer_inbox(tenant_id,status,created_at,id);
ALTER TABLE consumer_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_inbox FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON consumer_inbox USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE audit_anchors ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"last_event_id" uuid NOT NULL,
"entry_hash" text NOT NULL,
"document_id" uuid,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX audit_anchors_tenant_status_idx ON audit_anchors(tenant_id,status,created_at,id);
ALTER TABLE audit_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_anchors FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_anchors USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE module_settings ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"module" text NOT NULL,
"enabled" boolean NOT NULL DEFAULT true,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX module_settings_tenant_status_idx ON module_settings(tenant_id,status,created_at,id);
ALTER TABLE module_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON module_settings USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));

CREATE TABLE reauth_sessions ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
"tenant_id" uuid NOT NULL,
"legal_entity_id" uuid,
"number" text,
"name" text,
"title" text,
"notes" text,
"status" text NOT NULL DEFAULT 'draft',
"version" integer NOT NULL DEFAULT 1,
"created_at" timestamptz NOT NULL DEFAULT now(),
"updated_at" timestamptz NOT NULL DEFAULT now(),
"created_by" text,
"updated_by" text,
"session_id" text NOT NULL,
"user_id" text NOT NULL,
"confirmed_at" timestamptz NOT NULL,UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT);
CREATE INDEX reauth_sessions_tenant_status_idx ON reauth_sessions(tenant_id,status,created_at,id);
ALTER TABLE reauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reauth_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON reauth_sessions USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
ALTER TABLE inquiries ADD FOREIGN KEY(tenant_id,customer_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE inquiries ADD FOREIGN KEY(tenant_id,assigned_to) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quotes ADD FOREIGN KEY(tenant_id,customer_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quotes ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE orders ADD FOREIGN KEY(tenant_id,customer_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE orders ADD FOREIGN KEY(tenant_id,site_id) REFERENCES sites(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE orders ADD FOREIGN KEY(tenant_id,grave_plot_id) REFERENCES grave_plots(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE orders ADD FOREIGN KEY(tenant_id,assigned_to) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE work_packages ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE work_packages ADD FOREIGN KEY(tenant_id,assigned_to) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE change_orders ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE delivery_notes ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE acceptance_reports ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE defects ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE defects ADD FOREIGN KEY(tenant_id,assigned_to) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE invoices ADD FOREIGN KEY(tenant_id,customer_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE invoices ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE invoices ADD FOREIGN KEY(tenant_id,corrects_invoice_id) REFERENCES invoices(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE payments ADD FOREIGN KEY(tenant_id,party_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE supplier_invoices ADD FOREIGN KEY(tenant_id,supplier_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE supplier_invoices ADD FOREIGN KEY(tenant_id,purchase_order_id) REFERENCES purchase_orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE supplier_invoices ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE supplier_invoices ADD FOREIGN KEY(tenant_id,document_id) REFERENCES documents(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE purchase_orders ADD FOREIGN KEY(tenant_id,supplier_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE purchase_orders ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE price_import_batches ADD FOREIGN KEY(tenant_id,supplier_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE price_import_batches ADD FOREIGN KEY(tenant_id,document_id) REFERENCES documents(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE stock_items ADD FOREIGN KEY(tenant_id,product_id) REFERENCES products(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE import_batches ADD FOREIGN KEY(tenant_id,document_id) REFERENCES documents(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE dispatch_assignments ADD FOREIGN KEY(tenant_id,employee_id) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE dispatch_assignments ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE dispatch_assignments ADD FOREIGN KEY(tenant_id,work_package_id) REFERENCES work_packages(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE dispatch_assignments ADD FOREIGN KEY(tenant_id,equipment_id) REFERENCES equipment(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE leave_requests ADD FOREIGN KEY(tenant_id,employee_id) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE tasks ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE tasks ADD FOREIGN KEY(tenant_id,assigned_to) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sites ADD FOREIGN KEY(tenant_id,customer_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE grave_plots ADD FOREIGN KEY(tenant_id,cemetery_id) REFERENCES cemeteries(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE grave_plots ADD FOREIGN KEY(tenant_id,customer_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE memberships ADD FOREIGN KEY(tenant_id,employee_id) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_versions ADD FOREIGN KEY(tenant_id,quote_id) REFERENCES quotes(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_acceptances ADD FOREIGN KEY(tenant_id,quote_id) REFERENCES quotes(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_acceptances ADD FOREIGN KEY(tenant_id,quote_version_id) REFERENCES quote_versions(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_acceptances ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE orders ADD FOREIGN KEY(tenant_id,quote_version_id) REFERENCES quote_versions(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE order_confirmations ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE receivables ADD FOREIGN KEY(tenant_id,invoice_id) REFERENCES invoices(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE receivables ADD FOREIGN KEY(tenant_id,party_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE payables ADD FOREIGN KEY(tenant_id,invoice_id) REFERENCES supplier_invoices(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE payables ADD FOREIGN KEY(tenant_id,party_id) REFERENCES parties(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE payment_allocations ADD FOREIGN KEY(tenant_id,payment_id) REFERENCES payments(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE payment_allocations ADD FOREIGN KEY(tenant_id,receivable_id) REFERENCES receivables(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE payment_allocations ADD FOREIGN KEY(tenant_id,payable_id) REFERENCES payables(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE stock_movements ADD FOREIGN KEY(tenant_id,stock_item_id) REFERENCES stock_items(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE stock_movements ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE stock_reservations ADD FOREIGN KEY(tenant_id,stock_item_id) REFERENCES stock_items(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE stock_reservations ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE design_variants ADD FOREIGN KEY(tenant_id,planning_project_id) REFERENCES planning_projects(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE design_revisions ADD FOREIGN KEY(tenant_id,variant_id) REFERENCES design_variants(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE design_variants ADD FOREIGN KEY(tenant_id,head_revision_id) REFERENCES design_revisions(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE design_approvals ADD FOREIGN KEY(tenant_id,revision_id) REFERENCES design_revisions(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE manufacturing_releases ADD FOREIGN KEY(tenant_id,revision_id) REFERENCES design_revisions(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE documents ADD FOREIGN KEY(tenant_id,current_version_id) REFERENCES document_versions(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE document_versions ADD FOREIGN KEY(tenant_id,document_id) REFERENCES documents(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE document_versions ADD FOREIGN KEY(tenant_id,blob_object_id) REFERENCES blob_objects(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE time_sessions ADD FOREIGN KEY(tenant_id,employee_id) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE time_segments ADD FOREIGN KEY(tenant_id,time_session_id) REFERENCES time_sessions(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE time_allocations ADD FOREIGN KEY(tenant_id,time_segment_id) REFERENCES time_segments(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE time_allocations ADD FOREIGN KEY(tenant_id,time_session_id) REFERENCES time_sessions(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE time_allocations ADD FOREIGN KEY(tenant_id,employee_id) REFERENCES employees(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE time_allocations ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE portal_grants ADD FOREIGN KEY(tenant_id,portal_access_id) REFERENCES portal_accesses(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE portal_publications ADD FOREIGN KEY(tenant_id,portal_access_id) REFERENCES portal_accesses(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE quote_lines ADD FOREIGN KEY(tenant_id,parent_id) REFERENCES quotes(tenant_id,id) ON DELETE RESTRICT;
ALTER TABLE invoice_lines ADD FOREIGN KEY(tenant_id,parent_id) REFERENCES invoices(tenant_id,id) ON DELETE RESTRICT;
ALTER TABLE order_lines ADD FOREIGN KEY(tenant_id,parent_id) REFERENCES orders(tenant_id,id) ON DELETE RESTRICT;
ALTER TABLE purchase_order_lines ADD FOREIGN KEY(tenant_id,parent_id) REFERENCES purchase_orders(tenant_id,id) ON DELETE RESTRICT;
ALTER TABLE supplier_invoice_lines ADD FOREIGN KEY(tenant_id,parent_id) REFERENCES supplier_invoices(tenant_id,id) ON DELETE RESTRICT;
ALTER TABLE change_order_lines ADD FOREIGN KEY(tenant_id,parent_id) REFERENCES change_orders(tenant_id,id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX parties_number_unique ON parties(tenant_id,number) WHERE number IS NOT NULL;
CREATE UNIQUE INDEX invoices_number_unique ON invoices(legal_entity_id,number) WHERE number IS NOT NULL;
CREATE UNIQUE INDEX counters_unique ON number_counters(tenant_id,legal_entity_id,scope,year);
CREATE UNIQUE INDEX membership_unique ON memberships(tenant_id,user_id);
CREATE UNIQUE INDEX receipt_unique ON command_receipts(tenant_id,actor_scope,command_name,idempotency_key);
CREATE UNIQUE INDEX inbox_unique ON consumer_inbox(tenant_id,consumer_name,event_id);
CREATE UNIQUE INDEX outbox_unique ON outbox_events(tenant_id,aggregate_type,aggregate_id,aggregate_version,event_sequence);
CREATE UNIQUE INDEX quote_acceptance_unique ON quote_acceptances(tenant_id,quote_version_id);
CREATE UNIQUE INDEX order_quote_unique ON orders(tenant_id,quote_version_id) WHERE quote_version_id IS NOT NULL;
CREATE UNIQUE INDEX supplier_invoice_unique ON supplier_invoices(tenant_id,supplier_id,normalized_number,kind);
CREATE UNIQUE INDEX time_one_active ON time_sessions(tenant_id,employee_id) WHERE active;
CREATE UNIQUE INDEX import_legacy_unique ON legacy_id_map(tenant_id,source_system,entity_type,legacy_id);
CREATE UNIQUE INDEX notification_dedup_unique ON notifications(tenant_id,dedup_key);
CREATE UNIQUE INDEX bank_payment_dedup ON payments(tenant_id,legal_entity_id,bank_account_id,bank_reference) WHERE bank_reference IS NOT NULL;
CREATE UNIQUE INDEX font_selection_unique ON font_variants(tenant_id,selection_ref,supply_form);
CREATE INDEX parties_name_trgm ON parties USING gin(name gin_trgm_ops);
CREATE INDEX search_documents_fts ON search_documents USING gin(search_vector);
CREATE INDEX jobs_ready_idx ON job_runs(status,next_attempt_at,lease_until);
ALTER TABLE payments ADD CHECK(amount>0), ADD CHECK(direction IN ('incoming','outgoing'));
ALTER TABLE payment_allocations ADD CHECK(amount>0),ADD CHECK((target_kind='receivable' AND receivable_id IS NOT NULL AND payable_id IS NULL) OR (target_kind='payable' AND payable_id IS NOT NULL AND receivable_id IS NULL));
ALTER TABLE stock_items ADD CHECK(quantity>=0),ADD CHECK(reserved_quantity>=0 AND reserved_quantity<=quantity);
ALTER TABLE stock_reservations ADD CHECK(quantity>0);
ALTER TABLE supplier_price_versions ADD CHECK(basis_quantity>0),ADD CHECK(amount>=0);
ALTER TABLE time_segments ADD CHECK(ended_at IS NULL OR ended_at>=started_at);
ALTER TABLE time_allocations ADD CHECK(ended_at IS NULL OR ended_at>=started_at);
ALTER TABLE time_sessions ADD CHECK(ended_at IS NULL OR ended_at>=started_at);
ALTER TABLE dispatch_assignments ADD CHECK(ends_at>starts_at);
ALTER TABLE time_segments ADD CONSTRAINT no_overlapping_time_segments EXCLUDE USING gist(tenant_id WITH =,employee_id WITH =,tstzrange(started_at,ended_at,'[)') WITH &&) WHERE(ended_at IS NOT NULL);
ALTER TABLE time_allocations ADD CONSTRAINT no_overlapping_allocations EXCLUDE USING gist(tenant_id WITH =,time_segment_id WITH =,tstzrange(started_at,ended_at,'[)') WITH &&) WHERE(ended_at IS NOT NULL);
CREATE FUNCTION protect_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable_business_record'; END $$;
CREATE TRIGGER quote_versions_immutable BEFORE UPDATE OR DELETE ON quote_versions FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER quote_acceptances_immutable BEFORE UPDATE OR DELETE ON quote_acceptances FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER order_confirmations_immutable BEFORE UPDATE OR DELETE ON order_confirmations FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER design_revisions_immutable BEFORE UPDATE OR DELETE ON design_revisions FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER design_approvals_immutable BEFORE UPDATE OR DELETE ON design_approvals FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER manufacturing_releases_immutable BEFORE UPDATE OR DELETE ON manufacturing_releases FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER stock_movements_immutable BEFORE UPDATE OR DELETE ON stock_movements FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER payment_allocations_immutable BEFORE UPDATE OR DELETE ON payment_allocations FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER issuance_evidence_immutable BEFORE UPDATE OR DELETE ON issuance_evidence FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER invoice_references_immutable BEFORE UPDATE OR DELETE ON invoice_references FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER time_account_ledger_immutable BEFORE UPDATE OR DELETE ON time_account_ledger FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER labor_cost_ledger_immutable BEFORE UPDATE OR DELETE ON labor_cost_ledger FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION protect_immutable();
CREATE FUNCTION protect_issued_invoice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.issued_at IS NOT NULL AND (TG_OP='DELETE' OR (to_jsonb(OLD)-ARRAY['artifact_status','delivery_status','payment_status','updated_at','updated_by','version']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['artifact_status','delivery_status','payment_status','updated_at','updated_by','version'])) THEN RAISE EXCEPTION 'issued_invoice_immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER invoice_immutable BEFORE UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION protect_issued_invoice();
CREATE FUNCTION protect_invoice_line() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM invoices WHERE id=OLD.parent_id AND issued_at IS NOT NULL) THEN RAISE EXCEPTION 'issued_invoice_line_immutable'; END IF; RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER invoice_line_immutable BEFORE UPDATE OR DELETE ON invoice_lines FOR EACH ROW EXECUTE FUNCTION protect_invoice_line();
CREATE FUNCTION lookup_membership(actor text) RETURNS SETOF memberships LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ SELECT * FROM memberships WHERE user_id=actor AND active LIMIT 1 $$;
REVOKE ALL ON FUNCTION lookup_membership(text) FROM PUBLIC;
ALTER TABLE "user" ADD COLUMN tenant_id uuid REFERENCES tenants(id);
DROP FUNCTION lookup_membership(text);
CREATE FUNCTION lookup_membership(actor text) RETURNS SETOF memberships LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ DECLARE t uuid; BEGIN SELECT tenant_id INTO t FROM "user" WHERE id=actor; IF t IS NULL THEN RETURN; END IF; PERFORM set_config('app.tenant_id',t::text,true); RETURN QUERY SELECT * FROM memberships WHERE tenant_id=t AND user_id=actor AND active LIMIT 1; END $$;
REVOKE ALL ON FUNCTION lookup_membership(text) FROM PUBLIC;
