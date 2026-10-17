-- Own selling prices are reviewed independently of supplier purchase prices.
ALTER TABLE sales_price_versions
  ADD COLUMN revision integer NOT NULL DEFAULT 1,
  ADD COLUMN previous_version_id uuid,
  ADD COLUMN source_document_version_id uuid,
  ADD COLUMN price_basis text,
  ADD COLUMN tax_rate numeric(8,4),
  ADD COLUMN min_quantity numeric(20,6) NOT NULL DEFAULT 0,
  ADD COLUMN approved_by text,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN content_hash text;
ALTER TABLE sales_price_versions ADD CONSTRAINT sales_price_positive_basis CHECK(basis_quantity>0),
  ADD CONSTRAINT sales_price_nonnegative CHECK(amount>=0 AND min_quantity>=0),
  ADD CONSTRAINT sales_price_dates CHECK(valid_until IS NULL OR valid_until>=valid_from),
  ADD CONSTRAINT sales_price_review_complete CHECK(approved_at IS NULL OR(amount IS NOT NULL AND tax_rate IS NOT NULL AND tax_rate>=0 AND tax_rate<=100 AND unit IS NOT NULL AND valid_from IS NOT NULL AND approved_by IS NOT NULL AND price_basis IS NOT NULL AND content_hash IS NOT NULL));
CREATE INDEX sales_price_lookup_idx ON sales_price_versions(tenant_id,legal_entity_id,product_id,valid_from DESC) WHERE approved_at IS NOT NULL;
CREATE INDEX sales_price_previous_idx ON sales_price_versions(tenant_id,previous_version_id) WHERE previous_version_id IS NOT NULL;
CREATE FUNCTION protect_reviewed_sales_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.approved_at IS NOT NULL THEN RAISE EXCEPTION 'reviewed_sales_price_immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sales_price_reviewed_immutable BEFORE UPDATE OR DELETE ON sales_price_versions FOR EACH ROW EXECUTE FUNCTION protect_reviewed_sales_price();
DO $$ DECLARE line_table text; BEGIN
  FOREACH line_table IN ARRAY ARRAY['quote_lines','invoice_lines','purchase_order_lines','change_order_lines','delivery_note_lines','supplier_invoice_lines','order_lines'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN price_applied_at timestamptz',line_table);
  END LOOP;
END $$;
