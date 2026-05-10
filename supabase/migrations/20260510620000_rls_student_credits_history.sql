-- Credit ledger: students see own rows; school admins see rows for their school; platform admins see all.

ALTER TABLE public.student_credits_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.student_credits_history TO authenticated;

DROP POLICY IF EXISTS student_credits_history_select_own ON public.student_credits_history;
CREATE POLICY student_credits_history_select_own
  ON public.student_credits_history
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS student_credits_history_select_school_admin_same_school
  ON public.student_credits_history;
CREATE POLICY student_credits_history_select_school_admin_same_school
  ON public.student_credits_history
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
    AND school_id = public.current_school_admin_school_id ()
  );

DROP POLICY IF EXISTS student_credits_history_select_admins ON public.student_credits_history;
CREATE POLICY student_credits_history_select_admins
  ON public.student_credits_history
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
