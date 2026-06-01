ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS news_items_select_authenticated ON public.news_items;
CREATE POLICY news_items_select_authenticated
  ON public.news_items
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS news_items_insert_admins ON public.news_items;
CREATE POLICY news_items_insert_admins
  ON public.news_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS news_items_update_admins ON public.news_items;
CREATE POLICY news_items_update_admins
  ON public.news_items
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS news_items_delete_admins ON public.news_items;
CREATE POLICY news_items_delete_admins
  ON public.news_items
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
