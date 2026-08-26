-- Discovery Journey: Arabic content overlay columns

ALTER TABLE public.discovery_modules
  ADD COLUMN IF NOT EXISTS content_ar jsonb,
  ADD COLUMN IF NOT EXISTS content_ar_meta jsonb;

ALTER TABLE public.discovery_settings
  ADD COLUMN IF NOT EXISTS content_ar jsonb,
  ADD COLUMN IF NOT EXISTS content_ar_meta jsonb;
