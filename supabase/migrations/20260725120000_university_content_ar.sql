-- Arabic localized content for universities (admin-generated via translation API)
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS content_ar jsonb,
  ADD COLUMN IF NOT EXISTS content_ar_meta jsonb;

COMMENT ON COLUMN public.universities.content_ar IS 'Arabic translations keyed by field name (name, description, tuition_display, etc.)';
COMMENT ON COLUMN public.universities.content_ar_meta IS 'Translation metadata: translated_at, field_hashes for staleness detection';
