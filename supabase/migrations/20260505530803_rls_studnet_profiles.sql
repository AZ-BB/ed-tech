ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_profiles_select_own ON public.student_profiles;
CREATE POLICY student_profiles_select_own
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS student_profiles_select_school_admin_same_school ON public.student_profiles;
CREATE POLICY student_profiles_select_school_admin_same_school
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.school_admin_profiles sap
      WHERE sap.id = auth.uid()
        AND sap.school_id = student_profiles.school_id
    )
  );

DROP POLICY IF EXISTS student_profiles_select_admins ON public.student_profiles;
CREATE POLICY student_profiles_select_admins
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS student_profiles_insert_own ON public.student_profiles;
CREATE POLICY student_profiles_insert_own
  ON public.student_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS student_profiles_insert_admins ON public.student_profiles;
CREATE POLICY student_profiles_insert_admins
  ON public.student_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS student_profiles_update_own ON public.student_profiles;
CREATE POLICY student_profiles_update_own
  ON public.student_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS student_profiles_update_admins ON public.student_profiles;
CREATE POLICY student_profiles_update_admins
  ON public.student_profiles
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS student_profiles_delete_admins ON public.student_profiles;
CREATE POLICY student_profiles_delete_admins
  ON public.student_profiles
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
