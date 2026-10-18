ALTER TABLE legal_entities ADD COLUMN feedback_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE legal_entities ADD COLUMN feedback_version integer NOT NULL DEFAULT 1;
CREATE TABLE feedback_reports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 reference bigint GENERATED ALWAYS AS IDENTITY,number text GENERATED ALWAYS AS ('FB-' || reference::text) STORED,
 actor_id text NOT NULL,submitter_name text NOT NULL,submitter_role text NOT NULL,
 category text NOT NULL CHECK(category IN('bug','usability','idea','other')),message text NOT NULL CHECK(length(message) BETWEEN 5 AND 5000),expected text NOT NULL DEFAULT '' CHECK(length(expected)<=2000),
 page_path text NOT NULL,page_label text NOT NULL,context jsonb,server_release text NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN('new','triaged','planned','in_progress','resolved','closed')),
 priority text NOT NULL DEFAULT 'normal' CHECK(priority IN('normal','high','urgent')),admin_notes text NOT NULL DEFAULT '',resolution_ref text NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id));
CREATE INDEX feedback_queue ON feedback_reports(tenant_id,legal_entity_id,status,created_at DESC,id DESC);
CREATE INDEX feedback_recent ON feedback_reports(tenant_id,legal_entity_id,created_at DESC,id DESC);
ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;ALTER TABLE feedback_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY feedback_read ON feedback_reports FOR SELECT USING(
 tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)
 AND(current_user='schubert_backup' OR actor_id=current_setting('app.actor_id',true) OR EXISTS(SELECT 1 FROM memberships WHERE user_id=current_setting('app.actor_id',true) AND active AND role='SuperAdmin')));
CREATE POLICY feedback_insert ON feedback_reports FOR INSERT WITH CHECK(
 tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)
 AND actor_id=current_setting('app.actor_id',true) AND EXISTS(SELECT 1 FROM memberships WHERE user_id=current_setting('app.actor_id',true) AND active AND role NOT IN('PortalContact','PortalShared')));
CREATE POLICY feedback_manage ON feedback_reports FOR UPDATE USING(
 tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)
 AND EXISTS(SELECT 1 FROM memberships WHERE user_id=current_setting('app.actor_id',true) AND active AND role='SuperAdmin'));
CREATE FUNCTION protect_feedback_original() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-ARRAY['status','priority','admin_notes','resolution_ref','version','updated_at','updated_by']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','priority','admin_notes','resolution_ref','version','updated_at','updated_by']) THEN
  RAISE EXCEPTION 'Feedback original is immutable' USING ERRCODE='23514';
 END IF;RETURN NEW;END $$;
CREATE TRIGGER feedback_original BEFORE UPDATE ON feedback_reports FOR EACH ROW EXECUTE FUNCTION protect_feedback_original();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN
 GRANT SELECT,INSERT,UPDATE ON feedback_reports TO schubert_app;GRANT USAGE ON SEQUENCE feedback_reports_reference_seq TO schubert_app;
 END IF;END $$;
