-- Fix scholarship destination filter: UI sends i18n country names (e.g. "United States of America")
-- while discovery_payload often uses common names ("United States") and scholarship_destinations
-- stores ISO alpha-2 codes ("US"). Resolve both sides to alpha-2 before comparing.

CREATE OR REPLACE FUNCTION public.scholarship_destination_resolve_alpha2(p_token text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  t text := trim(coalesce(p_token, ''));
  t_lower text;
  resolved text;
BEGIN
  IF t = '' THEN
    RETURN NULL;
  END IF;

  t_lower := lower(t);

  IF t_lower IN ('global', 'multiple') THEN
    RETURN NULL;
  END IF;

  IF length(t) = 2 AND t ~ '^[A-Za-z]{2}$' THEN
    resolved := upper(t);
    IF EXISTS (SELECT 1 FROM public.countries c WHERE c.id = resolved) THEN
      RETURN resolved;
    END IF;
  END IF;

  SELECT c.id
  INTO resolved
  FROM public.countries c
  WHERE lower(trim(c.name)) = t_lower
  LIMIT 1;

  IF resolved IS NOT NULL THEN
    RETURN resolved;
  END IF;

  CASE t_lower
    WHEN 'united states' THEN RETURN 'US';
    WHEN 'united states of america' THEN RETURN 'US';
    WHEN 'russia' THEN RETURN 'RU';
    WHEN 'russian federation' THEN RETURN 'RU';
    WHEN 'turkey' THEN RETURN 'TR';
    WHEN 'türkiye' THEN RETURN 'TR';
    WHEN 'turkiye' THEN RETURN 'TR';
    WHEN 'brunei' THEN RETURN 'BN';
    WHEN 'brunei darussalam' THEN RETURN 'BN';
    WHEN 'uk' THEN RETURN 'GB';
    WHEN 'united kingdom' THEN RETURN 'GB';
    WHEN 'great britain' THEN RETURN 'GB';
    ELSE NULL;
  END CASE;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.scholarship_discovery_dest_match(p_dest jsonb, p_user text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  d text := trim(coalesce(p_user, ''));
  d_alpha2 text;
  elem text;
  elem_alpha2 text;
  has_wildcard boolean := false;
BEGIN
  IF d = '' OR lower(d) = 'any' THEN
    RETURN TRUE;
  END IF;

  d_alpha2 := public.scholarship_destination_resolve_alpha2(d);

  IF p_dest IS NULL OR jsonb_typeof(p_dest) <> 'array' THEN
    RETURN FALSE;
  END IF;

  FOR elem IN SELECT trim(e #>> '{}') FROM jsonb_array_elements(p_dest) AS t(e)
  LOOP
    IF elem = '' THEN
      CONTINUE;
    END IF;

    IF elem IN ('Global', 'Multiple') OR lower(elem) IN ('global', 'multiple') THEN
      has_wildcard := true;
      CONTINUE;
    END IF;

    IF lower(elem) = lower(d) THEN
      RETURN TRUE;
    END IF;

    elem_alpha2 := public.scholarship_destination_resolve_alpha2(elem);

    IF d_alpha2 IS NOT NULL
      AND elem_alpha2 IS NOT NULL
      AND d_alpha2 = elem_alpha2 THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN has_wildcard;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_scholarships_discovery_page(
  p_q text DEFAULT NULL,
  p_nat text DEFAULT 'any',
  p_dest text DEFAULT 'any',
  p_cov text DEFAULT 'any',
  p_bucket text DEFAULT 'government',
  p_home_alpha2 text DEFAULT NULL,
  p_limit int DEFAULT 6,
  p_offset int DEFAULT 0,
  p_saved_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_nat text := lower(trim(coalesce(p_nat, 'any')));
  v_dest text := trim(coalesce(p_dest, 'any'));
  v_cov text := lower(trim(coalesce(p_cov, 'any')));
  v_pat text;
  v_total bigint;
  v_catalog bigint;
  v_rows jsonb;
  lim int := greatest(coalesce(p_limit, 6), 1);
  off int := greatest(coalesce(p_offset, 0), 0);
  v_bucket text := lower(trim(coalesce(p_bucket, 'government')));
  v_home text := nullif(upper(trim(coalesce(p_home_alpha2, ''))), '');
BEGIN
  IF v_nat = '' THEN
    v_nat := 'any';
  END IF;
  IF lower(v_dest) = 'any' THEN
    v_dest := 'any';
  END IF;
  IF v_cov = '' THEN
    v_cov := 'any';
  END IF;

  IF v_bucket NOT IN ('government', 'other') THEN
    v_bucket := 'government';
  END IF;

  IF v_q IS NOT NULL THEN
    v_pat := '%' || replace(replace(replace(lower(v_q), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  END IF;

  SELECT count(*)::bigint
  INTO v_catalog
  FROM public.scholarships s
  WHERE s.is_active = true
    AND nullif(trim(coalesce(s.name, '')), '') IS NOT NULL;

  WITH base AS (
    SELECT
      s.*,
      (
        lower(trim(coalesce(
          nullif(trim(coalesce(s.discovery_payload->>'type', '')), ''),
          s.type::text,
          ''
        ))) = 'government'
      ) AS is_gov,
      lower(trim(coalesce(
        nullif(trim(coalesce(s.discovery_payload->>'country', '')), ''),
        (
          SELECT lower(trim(c.name))
          FROM public.countries c
          WHERE c.id = s.nationality_country_code
        ),
        ''
      ))) AS sponsor_norm,
      CASE
        WHEN s.discovery_payload IS NOT NULL
          AND jsonb_typeof(s.discovery_payload->'eligibleNationalities') = 'array'
          AND jsonb_array_length(s.discovery_payload->'eligibleNationalities') > 0
        THEN s.discovery_payload->'eligibleNationalities'
        WHEN nullif(trim(coalesce(s.nationality_country_code, '')), '') IS NOT NULL
        THEN jsonb_build_array(lower(trim(s.nationality_country_code)))
        ELSE '["other"]'::jsonb
      END AS elig_nat_json,
      CASE
        WHEN s.discovery_payload IS NOT NULL
          AND jsonb_typeof(s.discovery_payload->'destinations') = 'array'
          AND jsonb_array_length(s.discovery_payload->'destinations') > 0
        THEN s.discovery_payload->'destinations'
        WHEN EXISTS (
          SELECT 1
          FROM public.scholarship_destinations sd
          WHERE sd.scholarship_id = s.id
        )
        THEN (
          SELECT coalesce(
            jsonb_agg(coalesce(c.name, sd.country_code) ORDER BY sd.country_code),
            '[]'::jsonb
          )
          FROM public.scholarship_destinations sd
          LEFT JOIN public.countries c ON c.id = sd.country_code
          WHERE sd.scholarship_id = s.id
        )
        ELSE '["Global"]'::jsonb
      END AS dest_json
    FROM public.scholarships s
    WHERE s.is_active = true
      AND nullif(trim(coalesce(s.name, '')), '') IS NOT NULL
      AND (
        p_saved_ids IS NULL
        OR s.id = ANY(p_saved_ids)
      )
      AND (
        v_q IS NULL
        OR (
          lower(coalesce(s.name, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.description, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.target_students, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.level, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.academic_eligibility, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.method, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.deadline, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.coverage, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.application_url, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.tooltip, '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'provider', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'country', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'shortSummary', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'eligSummary', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'degreeLevels', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'fieldsOfStudy', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'academicElig', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'englishReq', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'otherElig', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'applicationMethod', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'importantNotes', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'type', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'competition', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload->>'deadline', '')) LIKE v_pat ESCAPE '\'
          OR lower(coalesce(s.discovery_payload::text, '')) LIKE v_pat ESCAPE '\'
        )
      )
      AND public.scholarship_discovery_nat_match(
        CASE
          WHEN s.discovery_payload IS NOT NULL
            AND jsonb_typeof(s.discovery_payload->'eligibleNationalities') = 'array'
            AND jsonb_array_length(s.discovery_payload->'eligibleNationalities') > 0
          THEN s.discovery_payload->'eligibleNationalities'
          WHEN nullif(trim(coalesce(s.nationality_country_code, '')), '') IS NOT NULL
          THEN jsonb_build_array(lower(trim(s.nationality_country_code)))
          ELSE '["other"]'::jsonb
        END,
        v_nat
      )
      AND public.scholarship_discovery_dest_match(
        CASE
          WHEN s.discovery_payload IS NOT NULL
            AND jsonb_typeof(s.discovery_payload->'destinations') = 'array'
            AND jsonb_array_length(s.discovery_payload->'destinations') > 0
          THEN s.discovery_payload->'destinations'
          WHEN EXISTS (
            SELECT 1
            FROM public.scholarship_destinations sd
            WHERE sd.scholarship_id = s.id
          )
          THEN (
            SELECT coalesce(
              jsonb_agg(coalesce(c.name, sd.country_code) ORDER BY sd.country_code),
              '[]'::jsonb
            )
            FROM public.scholarship_destinations sd
            LEFT JOIN public.countries c ON c.id = sd.country_code
            WHERE sd.scholarship_id = s.id
          )
          ELSE '["Global"]'::jsonb
        END,
        v_dest
      )
      AND (
        v_cov = 'any'
        OR lower(trim(coalesce(
          nullif(trim(coalesce(s.discovery_payload->>'coverage', '')), ''),
          s.coverage,
          ''
        ))) = v_cov
      )
  ),
  tagged AS (
    SELECT
      b.*,
      CASE
        WHEN v_home IS NULL THEN true
        ELSE EXISTS (
          SELECT 1
          FROM public.countries c
          WHERE c.id = v_home
            AND (
              b.sponsor_norm = lower(trim(c.name))
              OR (
                v_home = 'US'
                AND b.sponsor_norm IN ('united states', 'united states of america')
              )
            )
        )
      END AS sponsor_home_match
    FROM base b
  ),
  bucket_rows AS (
    SELECT t.*
    FROM tagged t
    WHERE
      (
        v_bucket = 'government'
        AND t.is_gov
        AND (v_home IS NULL OR t.sponsor_home_match)
      )
      OR (
        v_bucket = 'other'
        AND (
          NOT t.is_gov
          OR (t.is_gov AND v_home IS NOT NULL AND NOT t.sponsor_home_match)
        )
      )
  ),
  tally AS (
    SELECT count(*)::bigint AS c FROM bucket_rows
  ),
  paged AS (
    SELECT br.id,
      br.discovery_slug,
      br.name,
      br.nationality_country_code,
      br.is_renewable,
      br.description,
      br.target_students,
      br.level,
      br.fields,
      br.coverage,
      br.type,
      br.competition,
      br.tuition,
      br.travel,
      br.other_benefits,
      br.living_stipend,
      br.academic_eligibility,
      br.ielts_min_score,
      br.toefl_min_score,
      br.sat_policy,
      br.other,
      br.documents,
      br.method,
      br.deadline,
      br.tuition_type,
      br.application_url,
      br.tooltip,
      br.discovery_payload
    FROM bucket_rows br
    ORDER BY br.name ASC NULLS LAST
    LIMIT lim OFFSET off
  )
  SELECT
    (SELECT c FROM tally),
    coalesce((SELECT jsonb_agg(to_jsonb(p.*)) FROM paged p), '[]'::jsonb)
  INTO v_total, v_rows;

  RETURN jsonb_build_object(
    'total', coalesce(v_total, 0),
    'catalog_total', coalesce(v_catalog, 0),
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.scholarship_destination_resolve_alpha2(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scholarship_discovery_dest_match(jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_scholarships_discovery_page(text, text, text, text, text, text, int, int, uuid[]) TO anon, authenticated;
