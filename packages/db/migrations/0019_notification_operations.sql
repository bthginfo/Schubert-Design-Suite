ALTER TABLE notifications ADD COLUMN category text,ADD COLUMN available_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE tasks ADD COLUMN action_link text,ADD COLUMN source_event_id uuid;
CREATE UNIQUE INDEX task_source_event_unique ON tasks(tenant_id,legal_entity_id,source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX notifications_user_available_idx ON notifications(tenant_id,legal_entity_id,user_id,available_at DESC) WHERE status='unread';
