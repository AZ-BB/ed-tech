-- Student requests for ambassadors not found in the catalog (match / lookup requests).

CREATE TABLE public.ambassador_specific_requests (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.student_profiles (id),
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_phone TEXT NOT NULL,
  target_university TEXT NOT NULL,
  preferred_major TEXT DEFAULT NULL,
  additional_notes TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.ambassador_specific_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ambassador_specific_requests_select_own ON public.ambassador_specific_requests;
CREATE POLICY ambassador_specific_requests_select_own
  ON public.ambassador_specific_requests
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS ambassador_specific_requests_select_admins ON public.ambassador_specific_requests;
CREATE POLICY ambassador_specific_requests_select_admins
  ON public.ambassador_specific_requests
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS ambassador_specific_requests_select_school_admin_same_school
  ON public.ambassador_specific_requests;
CREATE POLICY ambassador_specific_requests_select_school_admin_same_school
  ON public.ambassador_specific_requests
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.id = ambassador_specific_requests.student_id
          AND sp.school_id = public.current_school_admin_school_id ()
      )
  );

DROP POLICY IF EXISTS ambassador_specific_requests_insert_own ON public.ambassador_specific_requests;
CREATE POLICY ambassador_specific_requests_insert_own
  ON public.ambassador_specific_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS ambassador_specific_requests_update_admins ON public.ambassador_specific_requests;
CREATE POLICY ambassador_specific_requests_update_admins
  ON public.ambassador_specific_requests
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS ambassador_specific_requests_delete_admins ON public.ambassador_specific_requests;
CREATE POLICY ambassador_specific_requests_delete_admins
  ON public.ambassador_specific_requests
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

GRANT SELECT, INSERT ON public.ambassador_specific_requests TO authenticated;
