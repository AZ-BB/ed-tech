-- School admin profiles: peers at the same school can SELECT each other; each admin can UPDATE only their own row.
-- Uses SECURITY DEFINER helper so policies do not reference school_admin_profiles in a self-recursive way (42P17).

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

DROP POLICY IF EXISTS school_admin_profiles_select_same_school_admins ON public.school_admin_profiles;
CREATE POLICY school_admin_profiles_select_same_school_admins
  ON public.school_admin_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND school_id = public.current_school_admin_school_id ()
  );

DROP POLICY IF EXISTS school_admin_profiles_update_own ON public.school_admin_profiles;
CREATE POLICY school_admin_profiles_update_own
  ON public.school_admin_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid ()))
  WITH CHECK (id = (SELECT auth.uid ()));

CREATE OR REPLACE FUNCTION public.school_admin_profiles_prevent_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'school_admin_profiles.id cannot be changed';
  END IF;
  IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    RAISE EXCEPTION 'school_admin_profiles.school_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.school_admin_profiles_prevent_identity_change () FROM PUBLIC;

DROP TRIGGER IF EXISTS school_admin_profiles_guard_identity ON public.school_admin_profiles;
CREATE TRIGGER school_admin_profiles_guard_identity
  BEFORE UPDATE ON public.school_admin_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.school_admin_profiles_prevent_identity_change();

GRANT SELECT, UPDATE ON public.school_admin_profiles TO authenticated;

-- `schools` policies for school admins were dropped in 20260510570000; restore so FK embeds + portal updates work.

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

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
