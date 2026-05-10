-- Application support rows: students own; platform admins full access; school admins read
-- applications tied to their school (via applications.school_id or the student's profile).

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;

-- ---------------------------------------------------------------------------
-- SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS applications_select_own ON public.applications;
CREATE POLICY applications_select_own
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid ());

DROP POLICY IF EXISTS applications_select_admins ON public.applications;
CREATE POLICY applications_select_admins
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

DROP POLICY IF EXISTS applications_select_school_admin_same_school ON public.applications;
CREATE POLICY applications_select_school_admin_same_school
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
    AND (
      (
        applications.school_id IS NOT NULL
        AND applications.school_id = public.current_school_admin_school_id ()
      )
      OR EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = applications.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- INSERT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS applications_insert_own ON public.applications;
CREATE POLICY applications_insert_own
  ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid ()
    AND (
      school_id IS NULL
      OR school_id = (
        SELECT sp.school_id
        FROM public.student_profiles sp
        WHERE sp.id = auth.uid ()
      )
    )
  );

DROP POLICY IF EXISTS applications_insert_admins ON public.applications;
CREATE POLICY applications_insert_admins
  ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

-- ---------------------------------------------------------------------------
-- UPDATE
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS applications_update_own ON public.applications;
CREATE POLICY applications_update_own
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid ())
  WITH CHECK (student_id = auth.uid ());

DROP POLICY IF EXISTS applications_update_admins ON public.applications;
CREATE POLICY applications_update_admins
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

-- ---------------------------------------------------------------------------
-- DELETE
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS applications_delete_own ON public.applications;
CREATE POLICY applications_delete_own
  ON public.applications
  FOR DELETE
  TO authenticated
  USING (student_id = auth.uid ());

DROP POLICY IF EXISTS applications_delete_admins ON public.applications;
CREATE POLICY applications_delete_admins
  ON public.applications
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
