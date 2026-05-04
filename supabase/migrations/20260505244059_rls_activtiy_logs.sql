-- acitivity_logs: platform admins see all rows; students only rows tied to themselves;
-- school admins (teacher/school-facing accounts) only rows tied to themselves.
-- Writes remain via service_role (bypasses RLS); authenticated users only get SELECT policies here.

ALTER TABLE public.acitivity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS acitivity_logs_select_admins ON public.acitivity_logs;
CREATE POLICY acitivity_logs_select_admins
  ON public.acitivity_logs
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS acitivity_logs_select_own_student ON public.acitivity_logs;
CREATE POLICY acitivity_logs_select_own_student
  ON public.acitivity_logs
  FOR SELECT
  TO authenticated
  USING (student_id IS NOT NULL AND student_id = auth.uid());

DROP POLICY IF EXISTS acitivity_logs_select_own_school_admin ON public.acitivity_logs;
CREATE POLICY acitivity_logs_select_own_school_admin
  ON public.acitivity_logs
  FOR SELECT
  TO authenticated
  USING (school_admin_id IS NOT NULL AND school_admin_id = auth.uid());
