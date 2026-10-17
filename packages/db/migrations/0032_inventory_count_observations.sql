CREATE TABLE inventory_count_observations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),legal_entity_id uuid NOT NULL,
 name text,title text,number text,notes text,status text NOT NULL DEFAULT 'recorded',version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text,updated_by text,
 line_id uuid NOT NULL,quantity numeric(20,6) NOT NULL CHECK(quantity>=0),actor_id text NOT NULL,observed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,legal_entity_id) REFERENCES legal_entities(tenant_id,id),FOREIGN KEY(tenant_id,line_id) REFERENCES inventory_count_lines(tenant_id,id));
CREATE INDEX count_observation_line_idx ON inventory_count_observations(tenant_id,legal_entity_id,line_id,created_at);
ALTER TABLE inventory_count_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_observations FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped_count_observation ON inventory_count_observations USING(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true)) WITH CHECK(tenant_id::text=current_setting('app.tenant_id',true) AND legal_entity_id::text=current_setting('app.legal_entity_id',true));
CREATE TRIGGER count_observations_immutable BEFORE UPDATE OR DELETE ON inventory_count_observations FOR EACH ROW EXECUTE FUNCTION protect_immutable();
ALTER TABLE inventory_count_lines ADD COLUMN resolved_observation_id uuid;
ALTER TABLE inventory_count_lines ADD FOREIGN KEY(tenant_id,resolved_observation_id) REFERENCES inventory_count_observations(tenant_id,id);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='schubert_app') THEN GRANT SELECT,INSERT ON inventory_count_observations TO schubert_app;END IF;END $$;
