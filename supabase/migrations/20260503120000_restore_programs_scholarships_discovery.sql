-- Drop scholarship-discovery JSON table that reused the name `programs`, then restore
-- the original degree-programs table name `programs` from `academic_programs`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'programs'
      AND column_name = 'slug'
  ) THEN
    DROP TABLE public.programs;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.academic_programs RENAME TO programs;

-- Student discovery: canonical catalog fields in `scholarships.discovery_payload` (JSONB); seeds upsert it.
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS discovery_slug TEXT,
  ADD COLUMN IF NOT EXISTS discovery_payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS scholarships_discovery_slug_uidx
  ON public.scholarships (discovery_slug);
