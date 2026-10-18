CREATE TABLE user_onboarding(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 actor_id text NOT NULL,name text,title text,number text,notes text,status text NOT NULL CHECK(status IN('in_progress','completed','deferred')),
 step integer NOT NULL DEFAULT 0 CHECK(step BETWEEN 0 AND 20),guide_version integer NOT NULL DEFAULT 1,
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,legal_entity_id,actor_id),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id));
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding FORCE ROW LEVEL SECURITY;
CREATE POLICY own_onboarding ON user_onboarding USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true) AND actor_id=current_setting('app.actor_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true) AND actor_id=current_setting('app.actor_id',true));
ALTER TABLE legal_entities ADD COLUMN training_mode boolean NOT NULL DEFAULT false;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON user_onboarding TO schubert_app; END IF; END $$;
