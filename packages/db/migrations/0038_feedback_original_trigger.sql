-- Generated columns are computed after BEFORE triggers. The immutable reference
-- protects the generated number; do not compare its not-yet-computed NEW value.
CREATE OR REPLACE FUNCTION protect_feedback_original() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-ARRAY['number','status','priority','admin_notes','resolution_ref','version','updated_at','updated_by']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['number','status','priority','admin_notes','resolution_ref','version','updated_at','updated_by']) THEN
  RAISE EXCEPTION 'Feedback original is immutable' USING ERRCODE='23514';
 END IF;RETURN NEW;END $$;
