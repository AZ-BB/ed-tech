-- School admins must read own + colleague rows at same school WITHOUT self-referencing
-- policies on school_admin_profiles (that pattern causes Postgres 42P17 infinite recursion).

CREATE OR REPLACE FUNCTION public.current_school_admin_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sap.school_id
  FROM public.school_admin_profiles sap
  WHERE sap.id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_school_admin_school_id() IS
    'school_id for the logged-in school admin — bypasses RLS; use inside policies to avoid recursion.';

REVOKE ALL ON FUNCTION public.current_school_admin_school_id () FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_school_admin_school_id () TO authenticated;

ALTER TABLE public.school_admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_admin_profiles_select_own ON public.school_admin_profiles;
DROP POLICY IF EXISTS school_admin_profiles_select_same_school ON public.school_admin_profiles;
DROP POLICY IF EXISTS school_admin_profiles_select_same_school_admins ON public.school_admin_profiles;

CREATE POLICY school_admin_profiles_select_same_school_admins
  ON public.school_admin_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND school_id = public.current_school_admin_school_id ()
  );

GRANT SELECT ON public.school_admin_profiles TO authenticated;

-- schools: platform admins SELECT; students SELECT their school row; school admins SELECT / UPDATE theirs
-- (JOIN via school_admin_profiles + (select auth.uid()) — avoids helper edge cases for reads).

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schools_select_admins_platform ON public.schools;
CREATE POLICY schools_select_admins_platform
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

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

DROP POLICY IF EXISTS schools_select_student_same_school ON public.schools;
CREATE POLICY schools_select_student_same_school
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.student_profiles sp
      WHERE sp.id = auth.uid ()
        AND sp.school_id = schools.id
    )
  );

GRANT SELECT, UPDATE ON public.schools TO authenticated;

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
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
