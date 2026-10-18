CREATE TABLE numbering_profiles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'active',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 scope text NOT NULL,template text NOT NULL,padding integer NOT NULL CHECK(padding BETWEEN 1 AND 10),annual boolean NOT NULL DEFAULT true,
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,legal_entity_id,scope),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id));
CREATE TABLE numbering_allocations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 scope text NOT NULL,number text NOT NULL,sequence integer NOT NULL,year integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),actor_id text NOT NULL,
 UNIQUE(tenant_id,legal_entity_id,scope,number),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id));
ALTER TABLE numbering_profiles ENABLE ROW LEVEL SECURITY;ALTER TABLE numbering_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE numbering_allocations ENABLE ROW LEVEL SECURITY;ALTER TABLE numbering_allocations FORCE ROW LEVEL SECURITY;
CREATE POLICY entity_numbering_profiles ON numbering_profiles USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE POLICY entity_numbering_allocations ON numbering_allocations USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE TRIGGER numbering_history_immutable BEFORE UPDATE OR DELETE ON numbering_allocations FOR EACH ROW EXECUTE FUNCTION protect_immutable();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT,UPDATE ON numbering_profiles TO schubert_app;GRANT SELECT,INSERT ON numbering_allocations TO schubert_app;END IF;END $$;
