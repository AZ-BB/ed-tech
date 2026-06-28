-- Application support plan catalog: readable by portal users (student/advisor/school).

ALTER TABLE public.applications_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applications_plans_select_public ON public.applications_plans;
CREATE POLICY applications_plans_select_public
  ON public.applications_plans
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.applications_plans TO anon, authenticated;
