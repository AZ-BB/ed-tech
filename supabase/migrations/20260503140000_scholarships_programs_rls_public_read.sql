-- RLS on scholarships and programs: anyone (anon + authenticated) may read.
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scholarships_select_public" ON public.scholarships;
CREATE POLICY "scholarships_select_public"
  ON public.scholarships
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "programs_select_public" ON public.programs;
CREATE POLICY "programs_select_public"
  ON public.programs
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.scholarships TO anon, authenticated;
GRANT SELECT ON public.programs TO anon, authenticated;
