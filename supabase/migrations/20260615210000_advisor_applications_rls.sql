-- Advisors: read/update assigned applications and related student/school/document/payment/activity data.

CREATE OR REPLACE FUNCTION public.current_advisor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT adv.id
  FROM public.advisors adv
  WHERE lower(adv.email) = lower(auth.jwt() ->> 'email')
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_advisor_id() IS
  'advisors.id for the logged-in advisor (matched by JWT email) — bypasses RLS; use inside policies.';

REVOKE ALL ON FUNCTION public.current_advisor_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_advisor_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- applications — assigned advisor
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS applications_select_assigned_advisor ON public.applications;
CREATE POLICY applications_select_assigned_advisor
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (assigned_to = public.current_advisor_id());

DROP POLICY IF EXISTS applications_update_assigned_advisor ON public.applications;
CREATE POLICY applications_update_assigned_advisor
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (assigned_to = public.current_advisor_id())
  WITH CHECK (assigned_to = public.current_advisor_id());

-- ---------------------------------------------------------------------------
-- student_profiles — students on assigned applications
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS student_profiles_select_assigned_advisor ON public.student_profiles;
CREATE POLICY student_profiles_select_assigned_advisor
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.current_advisor_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.student_id = student_profiles.id
        AND a.assigned_to = public.current_advisor_id()
    )
  );

-- ---------------------------------------------------------------------------
-- schools — schools linked to assigned applications
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS schools_select_assigned_advisor ON public.schools;
CREATE POLICY schools_select_assigned_advisor
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    public.current_advisor_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.assigned_to = public.current_advisor_id()
        AND (
          a.school_id = schools.id
          OR EXISTS (
            SELECT 1
            FROM public.student_profiles sp
            WHERE sp.id = a.student_id
              AND sp.school_id = schools.id
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- application_documents — documents for assigned applications
-- ---------------------------------------------------------------------------
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.application_documents TO authenticated;

DROP POLICY IF EXISTS application_documents_select_admins ON public.application_documents;
CREATE POLICY application_documents_select_admins
  ON public.application_documents
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_documents_select_own_student ON public.application_documents;
CREATE POLICY application_documents_select_own_student
  ON public.application_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_documents.application_id
        AND a.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS application_documents_select_assigned_advisor ON public.application_documents;
CREATE POLICY application_documents_select_assigned_advisor
  ON public.application_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_documents.application_id
        AND a.assigned_to = public.current_advisor_id()
    )
  );

-- ---------------------------------------------------------------------------
-- payments — payments for assigned applications
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.payments TO authenticated;

DROP POLICY IF EXISTS payments_select_admins ON public.payments;
CREATE POLICY payments_select_admins
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS payments_select_own_student ON public.payments;
CREATE POLICY payments_select_own_student
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS payments_select_assigned_advisor ON public.payments;
CREATE POLICY payments_select_assigned_advisor
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = payments.application_id
        AND a.assigned_to = public.current_advisor_id()
    )
  );

-- ---------------------------------------------------------------------------
-- acitivity_logs — application activity for assigned applications
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS acitivity_logs_select_assigned_advisor ON public.acitivity_logs;
CREATE POLICY acitivity_logs_select_assigned_advisor
  ON public.acitivity_logs
  FOR SELECT
  TO authenticated
  USING (
    public.current_advisor_id() IS NOT NULL
    AND entitiy_type = 'application'
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id::text = acitivity_logs.entity_id
        AND a.assigned_to = public.current_advisor_id()
    )
  );
