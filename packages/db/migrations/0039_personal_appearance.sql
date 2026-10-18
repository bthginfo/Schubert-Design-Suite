CREATE TABLE user_preferences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 actor_id text NOT NULL,accent text NOT NULL DEFAULT 'forest' CHECK(accent IN('forest','ocean','violet','rose','clay','slate')),
 mode text NOT NULL DEFAULT 'light' CHECK(mode IN('light','dark','system')),
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'active',
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,legal_entity_id,actor_id),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id));
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY own_preferences ON user_preferences USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true) AND (actor_id=current_setting('app.actor_id',true) OR current_user='schubert_backup')) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true) AND actor_id=current_setting('app.actor_id',true));
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON user_preferences TO schubert_app; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_backup') THEN GRANT SELECT ON user_preferences TO schubert_backup; END IF;
END $$;
