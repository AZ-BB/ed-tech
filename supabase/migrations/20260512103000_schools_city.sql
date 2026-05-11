-- City label for school (portal settings / display).
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT NULL;

COMMENT ON COLUMN public.schools.city IS
  'Optional city or locality name for the school (text, not a FK).';
