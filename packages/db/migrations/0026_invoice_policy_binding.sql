ALTER TABLE invoices ADD COLUMN planned_transmission_date date,ADD COLUMN recipient_regime text,ADD COLUMN retention_policy_id uuid;
ALTER TABLE invoices ADD FOREIGN KEY(tenant_id,rule_version_id) REFERENCES rule_versions(tenant_id,id);
ALTER TABLE invoices ADD FOREIGN KEY(tenant_id,retention_policy_id) REFERENCES retention_policies(tenant_id,id);
ALTER TABLE legal_entities ADD COLUMN previous_year_turnover numeric(20,2),ADD COLUMN turnover_year integer;
