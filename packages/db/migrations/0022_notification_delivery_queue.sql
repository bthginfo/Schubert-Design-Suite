ALTER TABLE notification_deliveries ADD COLUMN payload jsonb,ADD COLUMN eligible_at timestamptz NOT NULL DEFAULT now(),ADD COLUMN outgoing_message_id uuid;
CREATE INDEX notification_email_ready_idx ON notification_deliveries(tenant_id,legal_entity_id,user_id,eligible_at) WHERE channel='email' AND status IN('pending','waiting_config');
