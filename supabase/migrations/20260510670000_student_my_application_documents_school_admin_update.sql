-- School counselors: update document checklist rows for students at their school.

CREATE POLICY student_my_application_documents_update_school_admin_same_school
  ON public.student_my_application_documents
  FOR UPDATE
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_my_application_documents.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  )
  WITH CHECK (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = student_my_application_documents.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );
