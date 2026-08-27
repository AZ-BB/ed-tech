-- Program Discovery & University Programs: Arabic content overlay columns

ALTER TABLE public.programs_discovery
  ADD COLUMN IF NOT EXISTS content_ar jsonb,
  ADD COLUMN IF NOT EXISTS content_ar_meta jsonb;

ALTER TABLE public.university_programs
  ADD COLUMN IF NOT EXISTS content_ar jsonb,
  ADD COLUMN IF NOT EXISTS content_ar_meta jsonb;
