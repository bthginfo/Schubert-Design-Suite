-- Inquiry → Quote → Order: a quote keeps a tenant-local reference to the inquiry it was made from.
ALTER TABLE quotes ADD COLUMN inquiry_id uuid;
ALTER TABLE quotes ADD FOREIGN KEY(tenant_id,inquiry_id) REFERENCES inquiries(tenant_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX quotes_inquiry_idx ON quotes(tenant_id,inquiry_id) WHERE inquiry_id IS NOT NULL;
