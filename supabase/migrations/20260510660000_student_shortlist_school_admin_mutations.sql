-- School counselors: manage student_shortlist_universities for students at their school.
-- SELECT already exists on student_shortlist_universities (20260510592817).
-- NOTE: Renamed from 20260510630000 — that version was already used by 20260510630000_rls_applications.sql.

CREATE POLICY student_shortlist_universities_insert_school_admin_same_school
  ON public.student_shortlist_universities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_shortlist_universities.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

CREATE POLICY student_shortlist_universities_update_school_admin_same_school
  ON public.student_shortlist_universities
  FOR UPDATE
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_shortlist_universities.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  )
  WITH CHECK (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_shortlist_universities.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

CREATE POLICY student_shortlist_universities_delete_school_admin_same_school
  ON public.student_shortlist_universities
  FOR DELETE
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
