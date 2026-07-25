-- Shared Arabic names for majors/programs (translate once, reuse across universities)

ALTER TABLE public.majors
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

COMMENT ON COLUMN public.majors.name_ar IS 'Arabic display name; translated once and reused for all universities';
COMMENT ON COLUMN public.programs.name_ar IS 'Arabic display name; translated once and reused for all universities';
