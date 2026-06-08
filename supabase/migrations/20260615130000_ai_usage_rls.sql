-- Students, school admins, and platform admins can read ai_usage rows they are allowed to see.
-- Inserts remain service-role only (see logStudentAiUsageAndActivity).

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_select_own ON public.ai_usage;
CREATE POLICY ai_usage_select_own
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS ai_usage_select_admins ON public.ai_usage;
CREATE POLICY ai_usage_select_admins
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS ai_usage_select_school_admin_same_school ON public.ai_usage;
CREATE POLICY ai_usage_select_school_admin_same_school
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = ai_usage.student_id
          AND sp.school_id = public.current_school_admin_school_id()
      )
  );

GRANT SELECT ON public.ai_usage TO authenticated;
