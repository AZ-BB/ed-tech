-- Fix 42P17 infinite recursion: advisor policies queried applications / student_profiles
-- inline, which re-triggered cross-table RLS (e.g. applications_select_school_admin_same_school).
-- Use SECURITY DEFINER helpers (same pattern as current_school_admin_school_id).

CREATE OR REPLACE FUNCTION public.advisor_can_read_student_profile(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_advisor_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.student_id = p_student_id
        AND a.assigned_to = public.current_advisor_id()
    );
$$;

COMMENT ON FUNCTION public.advisor_can_read_student_profile(uuid) IS
  'True when the logged-in advisor is assigned to an application for this student — bypasses RLS.';

CREATE OR REPLACE FUNCTION public.advisor_can_read_school(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_advisor_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.assigned_to = public.current_advisor_id()
        AND (
          a.school_id = p_school_id
          OR EXISTS (
            SELECT 1
            FROM public.student_profiles sp
            WHERE sp.id = a.student_id
              AND sp.school_id = p_school_id
          )
        )
    );
$$;

COMMENT ON FUNCTION public.advisor_can_read_school(uuid) IS
  'True when the logged-in advisor has an assigned application tied to this school — bypasses RLS.';

CREATE OR REPLACE FUNCTION public.advisor_can_read_application(p_application_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_advisor_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = p_application_id
        AND a.assigned_to = public.current_advisor_id()
    );
$$;

COMMENT ON FUNCTION public.advisor_can_read_application(integer) IS
  'True when the logged-in advisor is assigned to this application — bypasses RLS.';

REVOKE ALL ON FUNCTION public.advisor_can_read_student_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advisor_can_read_school(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advisor_can_read_application(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.advisor_can_read_student_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_can_read_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_can_read_application(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- student_profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS student_profiles_select_assigned_advisor ON public.student_profiles;
CREATE POLICY student_profiles_select_assigned_advisor
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (public.advisor_can_read_student_profile(id));

-- ---------------------------------------------------------------------------
-- schools
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS schools_select_assigned_advisor ON public.schools;
CREATE POLICY schools_select_assigned_advisor
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (public.advisor_can_read_school(id));

-- ---------------------------------------------------------------------------
-- application_documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS application_documents_select_assigned_advisor ON public.application_documents;
CREATE POLICY application_documents_select_assigned_advisor
  ON public.application_documents
  FOR SELECT
  TO authenticated
  USING (public.advisor_can_read_application(application_id));

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS payments_select_assigned_advisor ON public.payments;
CREATE POLICY payments_select_assigned_advisor
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    application_id IS NOT NULL
    AND public.advisor_can_read_application(application_id)
  );

-- ---------------------------------------------------------------------------
-- acitivity_logs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS acitivity_logs_select_assigned_advisor ON public.acitivity_logs;
CREATE POLICY acitivity_logs_select_assigned_advisor
  ON public.acitivity_logs
  FOR SELECT
  TO authenticated
  USING (
    public.current_advisor_id() IS NOT NULL
    AND entitiy_type = 'application'
    AND entity_id ~ '^\d+$'
    AND public.advisor_can_read_application(entity_id::integer)
  );
