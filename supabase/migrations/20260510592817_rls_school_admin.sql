-- School admins: read/update students at their school + SELECT on student-linked rows.
-- Uses public.current_school_admin_school_id() from 20260510580234 (SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- student_profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS student_profiles_select_school_admin_same_school ON public.student_profiles;
CREATE POLICY student_profiles_select_school_admin_same_school
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND school_id = public.current_school_admin_school_id ()
  );

DROP POLICY IF EXISTS student_profiles_update_school_admin_same_school ON public.student_profiles;
CREATE POLICY student_profiles_update_school_admin_same_school
  ON public.student_profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND school_id = public.current_school_admin_school_id ()
  )
  WITH CHECK (
    public.current_school_admin_school_id () IS NOT NULL
      AND school_id = public.current_school_admin_school_id ()
  );

-- ---------------------------------------------------------------------------
-- student_activities (activity feed / last active)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS student_activities_select_school_admin_same_school ON public.student_activities;
CREATE POLICY student_activities_select_school_admin_same_school
  ON public.student_activities
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_activities.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

-- ---------------------------------------------------------------------------
-- student_shortlist_universities
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS student_shortlist_universities_select_school_admin_same_school
  ON public.student_shortlist_universities;
CREATE POLICY student_shortlist_universities_select_school_admin_same_school
  ON public.student_shortlist_universities
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_shortlist_universities.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

-- ---------------------------------------------------------------------------
-- school_students (invite list for the admin's school)
-- ---------------------------------------------------------------------------
ALTER TABLE public.school_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_students_select_school_admin_same_school ON public.school_students;
CREATE POLICY school_students_select_school_admin_same_school
  ON public.school_students
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND school_id = public.current_school_admin_school_id ()
  );

DROP POLICY IF EXISTS school_students_insert_school_admin_same_school ON public.school_students;
CREATE POLICY school_students_insert_school_admin_same_school
  ON public.school_students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_school_admin_school_id () IS NOT NULL
      AND school_id = public.current_school_admin_school_id ()
  );

GRANT SELECT, INSERT ON public.school_students TO authenticated;

-- ---------------------------------------------------------------------------
-- acitivity_logs — rows tied to a student at the same school
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS acitivity_logs_select_school_admin_students_same_school ON public.acitivity_logs;
CREATE POLICY acitivity_logs_select_school_admin_students_same_school
  ON public.acitivity_logs
  FOR SELECT
  TO authenticated
  USING (
    student_id IS NOT NULL
      AND public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = acitivity_logs.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

-- ---------------------------------------------------------------------------
-- My Applications workspace (read-only for school admins)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS student_application_profile_select_school_admin_same_school
  ON public.student_application_profile;
CREATE POLICY student_application_profile_select_school_admin_same_school
  ON public.student_application_profile
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_application_profile.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

DROP POLICY IF EXISTS student_my_application_documents_select_school_admin_same_school
  ON public.student_my_application_documents;
CREATE POLICY student_my_application_documents_select_school_admin_same_school
  ON public.student_my_application_documents
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_my_application_documents.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

DROP POLICY IF EXISTS student_my_application_essays_select_school_admin_same_school
  ON public.student_my_application_essays;
CREATE POLICY student_my_application_essays_select_school_admin_same_school
  ON public.student_my_application_essays
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_my_application_essays.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

DROP POLICY IF EXISTS student_my_application_recommendations_select_school_admin_same_school
  ON public.student_my_application_recommendations;
CREATE POLICY student_my_application_recommendations_select_school_admin_same_school
  ON public.student_my_application_recommendations
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_my_application_recommendations.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

DROP POLICY IF EXISTS student_my_application_tasks_select_school_admin_same_school
  ON public.student_my_application_tasks;
CREATE POLICY student_my_application_tasks_select_school_admin_same_school
  ON public.student_my_application_tasks
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_my_application_tasks.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

-- ---------------------------------------------------------------------------
-- Advisor / ambassador sessions booked by students at this school
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS advisor_sessions_select_school_admin_same_school ON public.advisor_sessions;
CREATE POLICY advisor_sessions_select_school_admin_same_school
  ON public.advisor_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = advisor_sessions.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

DROP POLICY IF EXISTS ambassador_session_requests_select_school_admin_same_school
  ON public.ambassador_session_requests;
CREATE POLICY ambassador_session_requests_select_school_admin_same_school
  ON public.ambassador_session_requests
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = ambassador_session_requests.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );
