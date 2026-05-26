ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS scholarships_is_active_idx
  ON public.scholarships (is_active);
