-- Arabic localized content for webinars (admin-generated via translation API)
ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS content_ar jsonb,
  ADD COLUMN IF NOT EXISTS content_ar_meta jsonb;

COMMENT ON COLUMN public.webinars.content_ar IS 'Arabic translations keyed by field name (title, description, agenda, speakerName, etc.)';
COMMENT ON COLUMN public.webinars.content_ar_meta IS 'Translation metadata: translated_at, field_hashes for staleness detection';
