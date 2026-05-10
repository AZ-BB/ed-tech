-- School admins: reliably read/update their school's `schools` row under RLS.
-- Reapplies SELECT with EXISTS(...) (supersedes helper-based predicates from earlier hotfixes).

GRANT SELECT, UPDATE ON public.schools TO authenticated;

DROP POLICY IF EXISTS schools_select_school_admin_same_school ON public.schools;
CREATE POLICY schools_select_school_admin_same_school
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.school_admin_profiles sap
      WHERE sap.id = (SELECT auth.uid ())
        AND sap.school_id = schools.id
    )
  );

DROP POLICY IF EXISTS schools_update_school_admin_same_school ON public.schools;
CREATE POLICY schools_update_school_admin_same_school
  ON public.schools
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.school_admin_profiles sap
      WHERE sap.id = (SELECT auth.uid ())
        AND sap.school_id = schools.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.school_admin_profiles sap
      WHERE sap.id = (SELECT auth.uid ())
        AND sap.school_id = schools.id
    )
  );

DROP POLICY IF EXISTS schools_update_admins_platform ON public.schools;
CREATE POLICY schools_update_admins_platform
  ON public.schools
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
