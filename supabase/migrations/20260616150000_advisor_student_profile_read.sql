-- Advisors: read student application profile and shortlist for assigned students.

DROP POLICY IF EXISTS student_application_profile_select_assigned_advisor
  ON public.student_application_profile;
CREATE POLICY student_application_profile_select_assigned_advisor
  ON public.student_application_profile
  FOR SELECT
  TO authenticated
  USING (public.advisor_can_read_student_profile(student_id));

DROP POLICY IF EXISTS student_shortlist_universities_select_assigned_advisor
  ON public.student_shortlist_universities;
CREATE POLICY student_shortlist_universities_select_assigned_advisor
  ON public.student_shortlist_universities
  FOR SELECT
  TO authenticated
  USING (public.advisor_can_read_student_profile(student_id));
