-- A glyph's usable geometry and its licence are separate verified facts.
ALTER TABLE glyph_assets ADD COLUMN IF NOT EXISTS rights_verified boolean NOT NULL DEFAULT false;
ALTER TABLE glyph_assets ADD COLUMN IF NOT EXISTS verified_usage text;
COMMENT ON COLUMN glyph_assets.rights_verified IS 'Set only by catalog approval after the private versioned licence document has been read and hashed.';
COMMENT ON COLUMN glyph_assets.verified_usage IS 'Permitted use recorded by the responsible human reviewer.';
