-- Arabic localized content for scholarships (admin-generated via translation API)
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS content_ar jsonb,
  ADD COLUMN IF NOT EXISTS content_ar_meta jsonb;

COMMENT ON COLUMN public.scholarships.content_ar IS 'Arabic translations keyed by field name (name, shortSummary, requiredDocs, etc.)';
COMMENT ON COLUMN public.scholarships.content_ar_meta IS 'Translation metadata: translated_at, field_hashes for staleness detection';
