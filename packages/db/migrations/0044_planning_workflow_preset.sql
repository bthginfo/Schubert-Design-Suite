ALTER TABLE planning_projects ADD COLUMN workflow_preset text;
ALTER TABLE planning_projects ADD CONSTRAINT planning_workflow_preset CHECK (workflow_preset IS NULL OR (kind='memorial' AND workflow_preset IN ('memorial_new','memorial_existing')) OR (kind='room_plan' AND workflow_preset IN ('room_bath','stone_countertop','stone_sill')));
