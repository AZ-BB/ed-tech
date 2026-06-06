ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS tuition_display TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS living_display TEXT DEFAULT NULL;

COMMENT ON COLUMN public.universities.tuition_display IS
  'Human-readable tuition label for students (e.g. from Excel import). Falls back to tuition_per_year when null.';

COMMENT ON COLUMN public.universities.living_display IS
  'Human-readable living cost label for students (e.g. from Excel import). Falls back to estimated_living_cost_per_year when null.';
