-- Arabic localized content for internships (admin-generated via translation API)
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS content_ar jsonb,
  ADD COLUMN IF NOT EXISTS content_ar_meta jsonb;

COMMENT ON COLUMN public.internships.content_ar IS 'Arabic translations keyed by field name (name, summary, whatYoullDo, etc.)';
COMMENT ON COLUMN public.internships.content_ar_meta IS 'Translation metadata: translated_at, field_hashes for staleness detection';

-- Include content_ar in discovery RPC rows for student localization
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
      i.content_ar,
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
