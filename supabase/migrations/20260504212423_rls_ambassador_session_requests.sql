-- RLS + grants for ambassador_session_requests (mirror advisor_sessions pattern).
-- Fixes empty table when RLS is enabled without policies, or when JWT INSERT + RETURNING fails SELECT.

ALTER TABLE public.ambassador_session_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ambassador_session_requests_select_own ON public.ambassador_session_requests;
CREATE POLICY ambassador_session_requests_select_own
  ON public.ambassador_session_requests
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS ambassador_session_requests_select_admins ON public.ambassador_session_requests;
CREATE POLICY ambassador_session_requests_select_admins
  ON public.ambassador_session_requests
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS ambassador_session_requests_insert_own ON public.ambassador_session_requests;
CREATE POLICY ambassador_session_requests_insert_own
  ON public.ambassador_session_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS ambassador_session_requests_update_admins ON public.ambassador_session_requests;
CREATE POLICY ambassador_session_requests_update_admins
  ON public.ambassador_session_requests
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS ambassador_session_requests_delete_admins ON public.ambassador_session_requests;
CREATE POLICY ambassador_session_requests_delete_admins
  ON public.ambassador_session_requests
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

GRANT SELECT, INSERT ON public.ambassador_session_requests TO authenticated;
