-- Simple path-level visit counters (e.g. influencer landing /ar/custom).

CREATE TABLE IF NOT EXISTS public.page_visits (
  path text PRIMARY KEY,
  visit_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.page_visits IS
  'Aggregate page-view counts keyed by path.';

INSERT INTO public.page_visits (path, visit_count)
VALUES ('/ar/custom', 0)
ON CONFLICT (path) DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_page_visit(p_path text)
RETURNS bigint
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_count bigint;
BEGIN
  IF p_path IS NULL OR btrim(p_path) = '' THEN
    RAISE EXCEPTION 'path is required';
  END IF;

  INSERT INTO public.page_visits (path, visit_count, updated_at)
  VALUES (btrim(p_path), 1, now())
  ON CONFLICT (path)
  DO UPDATE SET
    visit_count = public.page_visits.visit_count + 1,
    updated_at = now()
  RETURNING visit_count INTO new_count;

  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_page_visit(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_page_visit(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_page_visit(text) TO service_role;

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.page_visits FROM PUBLIC;
REVOKE ALL ON TABLE public.page_visits FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.page_visits TO service_role;
