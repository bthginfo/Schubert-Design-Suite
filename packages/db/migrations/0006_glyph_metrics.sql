-- Nominal cap/font size is not the bounding height of a lowercase glyph.
ALTER TABLE glyph_assets ADD COLUMN IF NOT EXISTS nominal_font_height_mm numeric;
ALTER TABLE glyph_assets ADD CONSTRAINT glyph_nominal_font_height_positive CHECK (nominal_font_height_mm IS NULL OR nominal_font_height_mm>0);
COMMENT ON COLUMN glyph_assets.height_mm IS 'Actual approved outline bounding height in mm; not an inferred cap or font size.';
COMMENT ON COLUMN glyph_assets.nominal_font_height_mm IS 'Manufacturer-confirmed nominal font/article size to which the actual glyph belongs. Required by new approval commands.';
