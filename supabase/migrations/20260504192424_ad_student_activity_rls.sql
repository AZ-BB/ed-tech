ALTER TABLE student_activities ENABLE ROW LEVEL SECURITY;

-- student_activities: RLS was enabled without policies in an earlier migration.
-- Students may only read/write rows where student_id matches their auth user.
-- Admins may manage all rows (same pattern as universities RLS).

-- SELECT — own rows
DROP POLICY IF EXISTS student_activities_select_own ON public.student_activities;
CREATE POLICY student_activities_select_own
  ON public.student_activities
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- SELECT — platform admins
DROP POLICY IF EXISTS student_activities_select_admins ON public.student_activities;
CREATE POLICY student_activities_select_admins
  ON public.student_activities
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- INSERT — must create only for self
DROP POLICY IF EXISTS student_activities_insert_own ON public.student_activities;
CREATE POLICY student_activities_insert_own
  ON public.student_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS student_activities_insert_admins ON public.student_activities;
CREATE POLICY student_activities_insert_admins
  ON public.student_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- UPDATE — cannot touch other students' rows or reassign student_id away from self
DROP POLICY IF EXISTS student_activities_update_own ON public.student_activities;
CREATE POLICY student_activities_update_own
  ON public.student_activities
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS student_activities_update_admins ON public.student_activities;
CREATE POLICY student_activities_update_admins
  ON public.student_activities
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- DELETE
DROP POLICY IF EXISTS student_activities_delete_own ON public.student_activities;
CREATE POLICY student_activities_delete_own
  ON public.student_activities
  FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS student_activities_delete_admins ON public.student_activities;
CREATE POLICY student_activities_delete_admins
  ON public.student_activities
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
