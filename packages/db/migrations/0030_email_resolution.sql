-- A frozen SMTP handoff is different from delivery into a recipient's inbox.
ALTER TABLE outgoing_messages ADD COLUMN order_id uuid, ADD COLUMN customer_id uuid,
 ADD COLUMN supplier_id uuid, ADD COLUMN parent_message_id uuid,
 ADD COLUMN dispatch_started_at timestamptz, ADD COLUMN dispatch_job_id uuid,
 ADD COLUMN dispatch_fencing_token bigint, ADD COLUMN last_error text;
ALTER TABLE outgoing_messages
 ADD FOREIGN KEY(tenant_id,order_id) REFERENCES orders(tenant_id,id),
 ADD FOREIGN KEY(tenant_id,customer_id) REFERENCES parties(tenant_id,id),
 ADD FOREIGN KEY(tenant_id,supplier_id) REFERENCES parties(tenant_id,id),
 ADD FOREIGN KEY(tenant_id,parent_message_id) REFERENCES outgoing_messages(tenant_id,id),
 ADD FOREIGN KEY(tenant_id,dispatch_job_id) REFERENCES job_runs(tenant_id,id),
 ADD CONSTRAINT mail_party_scope CHECK(supplier_id IS NULL OR(customer_id IS NULL AND order_id IS NULL));
CREATE INDEX outgoing_order_history ON outgoing_messages(tenant_id,legal_entity_id,order_id,created_at DESC);
CREATE INDEX outgoing_customer_history ON outgoing_messages(tenant_id,legal_entity_id,customer_id,created_at DESC);
CREATE INDEX outgoing_supplier_history ON outgoing_messages(tenant_id,legal_entity_id,supplier_id,created_at DESC);
ALTER TABLE threads ADD COLUMN supplier_id uuid;
ALTER TABLE threads ADD FOREIGN KEY(tenant_id,supplier_id) REFERENCES parties(tenant_id,id);
CREATE TABLE mail_delivery_evidence(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'confirmed',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 outgoing_message_id uuid NOT NULL,job_id uuid,outcome text NOT NULL CHECK(outcome IN('accepted','not_accepted')),
 source text NOT NULL CHECK(source IN('smtp','documented_review')),message_id text NOT NULL,mail_content_hash text NOT NULL,
 attachment_snapshot jsonb NOT NULL,accepted_at timestamptz,provider_reference text NOT NULL,
 evidence_document_version_id uuid,evidence_hash text,reason text NOT NULL,content_hash text NOT NULL,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,outgoing_message_id),
 CHECK((outcome='accepted')=(accepted_at IS NOT NULL)),
 CHECK(source<>'documented_review' OR(evidence_document_version_id IS NOT NULL AND evidence_hash IS NOT NULL)),
 FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id),
 FOREIGN KEY(tenant_id,outgoing_message_id) REFERENCES outgoing_messages(tenant_id,id),
 FOREIGN KEY(tenant_id,job_id) REFERENCES job_runs(tenant_id,id),
 FOREIGN KEY(tenant_id,evidence_document_version_id) REFERENCES document_versions(tenant_id,id));
ALTER TABLE mail_delivery_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_delivery_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON mail_delivery_evidence USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE TRIGGER mail_delivery_evidence_immutable BEFORE UPDATE OR DELETE ON mail_delivery_evidence FOR EACH ROW EXECUTE FUNCTION protect_offset_history();
CREATE FUNCTION protect_approved_mail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.approved_at IS NOT NULL AND(TG_OP='DELETE' OR(to_jsonb(OLD)-ARRAY['status','version','updated_at','updated_by','provider_response','sent_at','dispatch_started_at','dispatch_job_id','dispatch_fencing_token','last_error']) IS DISTINCT FROM(to_jsonb(NEW)-ARRAY['status','version','updated_at','updated_by','provider_response','sent_at','dispatch_started_at','dispatch_job_id','dispatch_fencing_token','last_error'])) THEN RAISE EXCEPTION 'approved_mail_content_immutable';END IF;
 RETURN COALESCE(NEW,OLD);END $$;
CREATE TRIGGER approved_mail_content_immutable BEFORE UPDATE OR DELETE ON outgoing_messages FOR EACH ROW EXECUTE FUNCTION protect_approved_mail();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT ON mail_delivery_evidence TO schubert_app;END IF;END $$;
