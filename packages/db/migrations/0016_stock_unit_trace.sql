ALTER TABLE stock_items ADD COLUMN currency char(3) NOT NULL DEFAULT 'EUR';
ALTER TABLE goods_receipts ADD COLUMN stock_quantity numeric(20,6),ADD COLUMN stock_unit text,ADD COLUMN conversion_proof jsonb;
ALTER TABLE stock_movements ADD COLUMN goods_receipt_id uuid;
