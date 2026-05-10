-- School admins may remove pending invites (not yet signed up) for their school.

DROP POLICY IF EXISTS school_students_delete_school_admin_pending ON public.school_students;

CREATE POLICY school_students_delete_school_admin_pending
  ON public.school_students
  FOR DELETE
  TO authenticated
  USING (
    signed_up = FALSE
      AND public.current_school_admin_school_id () IS NOT NULL
      AND school_id = public.current_school_admin_school_id ()
  );

GRANT DELETE ON public.school_students TO authenticated;
