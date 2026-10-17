ALTER TABLE documents ADD COLUMN source_job_id uuid;
ALTER TABLE documents ADD COLUMN generation_key text;
ALTER TABLE documents ADD CONSTRAINT document_source_job_fk FOREIGN KEY(tenant_id,source_job_id) REFERENCES job_runs(tenant_id,id);
CREATE UNIQUE INDEX document_generation_checkpoint_idx ON documents(tenant_id,legal_entity_id,generation_key) WHERE generation_key IS NOT NULL;
CREATE FUNCTION protect_hr_approved() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.status='approved' THEN RAISE EXCEPTION 'approved_hr_version_immutable';END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER employee_rate_approved BEFORE UPDATE OR DELETE ON employee_cost_rate_versions FOR EACH ROW EXECUTE FUNCTION protect_hr_approved();
CREATE TRIGGER work_schedule_approved BEFORE UPDATE OR DELETE ON work_schedules FOR EACH ROW EXECUTE FUNCTION protect_hr_approved();
CREATE TRIGGER leave_entitlement_approved BEFORE UPDATE OR DELETE ON leave_entitlements FOR EACH ROW EXECUTE FUNCTION protect_hr_approved();
