ALTER TABLE recipient_invoice_profiles ADD COLUMN seller_identifier text;
ALTER TABLE supplier_invoices ADD COLUMN tax_summaries jsonb;
