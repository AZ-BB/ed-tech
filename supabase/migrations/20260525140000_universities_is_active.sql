ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS universities_is_active_idx
  ON public.universities (is_active);
