ALTER TABLE open_item_offsets ADD COLUMN effective_on date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE dunning_cases ADD COLUMN rule_version_id uuid;
ALTER TABLE stock_movements ADD COLUMN source_movement_id uuid;
ALTER TABLE supplier_invoice_lines ADD COLUMN purchase_order_line_id uuid;
