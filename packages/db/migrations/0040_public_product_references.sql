-- Source facts stay immutable. A technical reviewer creates a separate successor version.
CREATE UNIQUE INDEX product_public_reference_key_idx ON product_variant_versions(tenant_id,legal_entity_id,(validation_report->>'publicSourceKey')) WHERE status='source_reference';
ALTER TABLE product_variant_versions ADD CONSTRAINT public_reference_provenance CHECK(status<>'source_reference' OR (approved_at IS NULL AND content_hash IS NOT NULL AND source_url LIKE 'https://%' AND validation_report->>'kind'='manufacturer_public_reference' AND validation_report->>'sourceHash' ~ '^[a-f0-9]{64}$' AND validation_report->>'publicSourceKey' IS NOT NULL));
CREATE FUNCTION protect_public_product_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='source_reference' THEN RAISE EXCEPTION 'public_product_reference_immutable'; END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER public_product_reference_immutable BEFORE UPDATE OR DELETE ON product_variant_versions FOR EACH ROW EXECUTE FUNCTION protect_public_product_reference();
