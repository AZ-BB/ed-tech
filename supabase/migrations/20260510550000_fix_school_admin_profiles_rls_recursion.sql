-- Hotfix deployments that already ran the recursive school_admin_profiles policies (42P17).
-- Safe to apply even when 20260510540000 was patched: DROP/CREATE matches final shape.

CREATE OR REPLACE FUNCTION public.current_school_admin_school_id ()
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

REVOKE ALL ON FUNCTION public.current_school_admin_school_id () FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_school_admin_school_id () TO authenticated;

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
