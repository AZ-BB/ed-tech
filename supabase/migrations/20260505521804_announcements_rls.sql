ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_select_authenticated ON public.announcements;
CREATE POLICY announcements_select_authenticated
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS announcements_insert_admins ON public.announcements;
CREATE POLICY announcements_insert_admins
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS announcements_update_admins ON public.announcements;
CREATE POLICY announcements_update_admins
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS announcements_delete_admins ON public.announcements;
CREATE POLICY announcements_delete_admins
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
