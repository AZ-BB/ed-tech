-- Internships catalog + student save + support requests

CREATE TYPE public.internship_section AS ENUM ('live', 'global', 'competition', 'find');
CREATE TYPE public.internship_format AS ENUM ('in_person', 'remote', 'hybrid', 'directory');
CREATE TYPE public.internship_pay_tier AS ENUM ('paid', 'free', 'unpaid');
CREATE TYPE public.internship_url_status AS ENUM (
  'deep_link',
  'hub_link',
  'news_driven',
  'directory',
  'homepage'
);

CREATE TABLE public.internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  section public.internship_section NOT NULL,
  country_code VARCHAR(2) NOT NULL REFERENCES public.countries (id),
  location_label TEXT NOT NULL,
  format public.internship_format NOT NULL,
  field TEXT NOT NULL,
  pay_tier public.internship_pay_tier NOT NULL,
  pay_label TEXT NOT NULL,
  duration TEXT NOT NULL,
  phone TEXT,
  nationals_only BOOLEAN NOT NULL DEFAULT FALSE,
  official_url TEXT NOT NULL,
  url_status public.internship_url_status NOT NULL DEFAULT 'homepage',
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT NOT NULL,
  what_youll_do TEXT[] NOT NULL DEFAULT '{}',
  what_youll_gain TEXT[] NOT NULL DEFAULT '{}',
  eligibility TEXT NOT NULL,
  how_to_apply TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT internships_slug_key UNIQUE (slug)
);

CREATE INDEX internships_section_idx ON public.internships (section);
CREATE INDEX internships_country_code_idx ON public.internships (country_code);
CREATE INDEX internships_format_idx ON public.internships (format);
CREATE INDEX internships_pay_tier_idx ON public.internships (pay_tier);
CREATE INDEX internships_provider_idx ON public.internships (provider);
CREATE INDEX internships_needs_review_idx ON public.internships (needs_review);
CREATE INDEX internships_is_active_idx ON public.internships (is_active);

CREATE OR REPLACE FUNCTION public.set_internships_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER internships_set_updated_at
  BEFORE UPDATE ON public.internships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_internships_updated_at();

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internships_select_public"
  ON public.internships
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.internships TO anon, authenticated;

-- Student activities: internship FK (enum value added in follow-up migration)
ALTER TABLE public.student_activities
  ADD COLUMN IF NOT EXISTS internship_id UUID REFERENCES public.internships (id);

-- Support requests
CREATE TABLE public.internship_support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.student_profiles (id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  school_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  preferred_location TEXT NOT NULL,
  preferred_format TEXT NOT NULL,
  interests TEXT[] NOT NULL DEFAULT '{}',
  pay_preference TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.internship_support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internship_support_requests_insert_own"
  ON public.internship_support_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id IS NULL OR student_id = auth.uid());

CREATE POLICY "internship_support_requests_select_own"
  ON public.internship_support_requests
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

GRANT SELECT, INSERT ON public.internship_support_requests TO authenticated;

-- Discovery RPC: returns all matching active rows (client groups by section)
-- p_loc: 'any' | ISO alpha-2 | 'MENA' | 'Remote'
-- p_pay: 'any' | 'paid' | 'free'
CREATE OR REPLACE FUNCTION public.rpc_internships_discovery(
  p_loc text DEFAULT 'any',
  p_pay text DEFAULT 'any'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loc text := lower(trim(coalesce(p_loc, 'any')));
  v_pay text := lower(trim(coalesce(p_pay, 'any')));
  v_rows jsonb;
  v_total int;
BEGIN
  WITH filtered AS (
    SELECT
      i.id,
      i.slug,
      i.name,
      i.provider,
      i.section,
      i.country_code,
      i.location_label,
      i.format,
      i.field,
      i.pay_tier,
      i.pay_label,
      i.duration,
      i.phone,
      i.nationals_only,
      i.official_url,
      i.url_status,
      i.needs_review,
      i.summary,
      i.what_youll_do,
      i.what_youll_gain,
      i.eligibility,
      i.how_to_apply,
      c.name AS country_name
    FROM public.internships i
    LEFT JOIN public.countries c ON c.id = i.country_code
    WHERE i.is_active = TRUE
      AND (
        v_pay = 'any'
        OR (v_pay = 'paid' AND i.pay_tier = 'paid')
        OR (v_pay = 'free' AND i.pay_tier = 'free')
      )
      AND (
        v_loc IN ('', 'any')
        OR i.section = 'global'
        OR (
          v_loc = 'remote'
          AND (
            i.format = 'remote'
            OR i.location_label ILIKE '%remote%'
            OR i.location_label ILIKE '%online%'
            OR i.location_label ILIKE '%anywhere%'
          )
        )
        OR (
          v_loc = 'mena'
          AND (
            i.location_label ILIKE 'MENA%'
            OR i.location_label ILIKE '%MENA%'
          )
        )
        OR (
          v_loc NOT IN ('remote', 'mena')
          AND length(v_loc) = 2
          AND (
            lower(i.country_code) = v_loc
            OR i.location_label ILIKE 'MENA%'
            OR i.location_label ILIKE '%MENA (%'
            OR i.location_label = 'MENA'
          )
        )
      )
  )
  SELECT
    coalesce(jsonb_agg(to_jsonb(f) ORDER BY
      CASE f.section
        WHEN 'live' THEN 1
        WHEN 'global' THEN 2
        WHEN 'competition' THEN 3
        WHEN 'find' THEN 4
        ELSE 5
      END,
      f.name
    ), '[]'::jsonb),
    (SELECT count(*)::int FROM filtered)
  INTO v_rows, v_total
  FROM filtered f;

  RETURN jsonb_build_object(
    'total', coalesce(v_total, 0),
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internships_discovery(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_internships_discovery(text, text) TO anon, authenticated;
