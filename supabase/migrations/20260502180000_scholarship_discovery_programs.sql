-- Scholarship discovery uses table `programs` (slug + JSONB).
-- The legacy degree-programs table from init is renamed to `academic_programs`.

DROP TABLE IF EXISTS programssss;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'programs'
      AND column_name = 'major_id'
  ) THEN
    ALTER TABLE public.programs RENAME TO academic_programs;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS programs (
    slug TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS programs_discovery_updated_at_idx
    ON programs (updated_at DESC);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "programs_discovery_select_authenticated" ON programs;

CREATE POLICY "programs_discovery_select_authenticated"
    ON programs
    FOR SELECT
    TO authenticated
    USING (true);

GRANT SELECT ON programs TO authenticated;
GRANT ALL ON programs TO service_role;
