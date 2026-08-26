-- Arabic localized content for university events (admin-generated via translation API)
ALTER TABLE public.university_events
  ADD COLUMN IF NOT EXISTS content_ar jsonb,
  ADD COLUMN IF NOT EXISTS content_ar_meta jsonb;

COMMENT ON COLUMN public.university_events.content_ar IS 'Arabic translations keyed by field name (eventName, shortDescription, etc.)';
COMMENT ON COLUMN public.university_events.content_ar_meta IS 'Translation metadata: translated_at, field_hashes for staleness detection';
