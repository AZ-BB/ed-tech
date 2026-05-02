-- Server-side discovery: search, nationality, destination, coverage, pagination.
-- Mirrors `filter-scholarships.ts` (nat/dest/cov) and `scholarship-discovery-search.ts` (q).

CREATE OR REPLACE FUNCTION public.scholarship_discovery_nat_match(p_elig jsonb, p_user text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  u text := lower(trim(coalesce(p_user, '')));
  elem text;
  saw_mena boolean := false;
  saw_gcc_all boolean := false;
  saw_eu_cit boolean := false;
BEGIN
  IF u IN ('', 'any') THEN
    RETURN TRUE;
  END IF;
  IF p_elig IS NULL OR jsonb_typeof(p_elig) <> 'array' THEN
    RETURN FALSE;
  END IF;

  FOR elem IN SELECT e #>> '{}' FROM jsonb_array_elements(p_elig) AS t(e)
  LOOP
    IF lower(elem) IN ('all', 'other') THEN
      RETURN TRUE;
    END IF;
    IF lower(elem) = u THEN
      RETURN TRUE;
    END IF;
    IF lower(elem) = 'mena' THEN
      saw_mena := true;
    END IF;
    IF lower(elem) = 'gcc-all' THEN
      saw_gcc_all := true;
    END IF;
    IF lower(elem) = 'eu-cit' THEN
      saw_eu_cit := true;
    END IF;
  END LOOP;

  IF saw_mena AND u IN (
    'ae', 'sa', 'qa', 'kw', 'om', 'bh',
    'eg', 'jo', 'lb', 'ps', 'iq', 'ma', 'tn', 'dz', 'ly', 'sd', 'sy', 'ye'
  ) THEN
    RETURN TRUE;
  END IF;

  IF saw_gcc_all AND u IN ('ae', 'sa', 'qa', 'kw', 'om', 'bh') THEN
    RETURN TRUE;
  END IF;

  IF saw_eu_cit AND u = 'eu-cit' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.scholarship_discovery_dest_match(p_dest jsonb, p_user text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text := trim(coalesce(p_user, ''));
  elem text;
  has_gm boolean := false;
  has_exact boolean := false;
BEGIN
  IF d = '' OR lower(d) = 'any' THEN
    RETURN TRUE;
  END IF;
  IF p_dest IS NULL OR jsonb_typeof(p_dest) <> 'array' THEN
    RETURN FALSE;
  END IF;

  FOR elem IN SELECT e #>> '{}' FROM jsonb_array_elements(p_dest) AS t(e)
  LOOP
    IF elem IN ('Global', 'Multiple') THEN
      has_gm := true;
    END IF;
    IF elem = d THEN
      has_exact := true;
    END IF;
  END LOOP;

  RETURN has_gm OR has_exact;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_scholarships_discovery_page(
  p_q text DEFAULT NULL,
  p_nat text DEFAULT 'any',
  p_dest text DEFAULT 'any',
  p_cov text DEFAULT 'any',
  p_limit int DEFAULT 6,
  p_offset int DEFAULT 0
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

  IF v_q IS NOT NULL THEN
    v_pat := '%' || replace(replace(replace(lower(v_q), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  END IF;

  SELECT count(*)::bigint
  INTO v_catalog
  FROM public.scholarships s
  WHERE s.discovery_payload IS NOT NULL
    AND jsonb_typeof(s.discovery_payload) = 'object';

  WITH filtered AS (
    SELECT s.*
    FROM public.scholarships s
    WHERE s.discovery_payload IS NOT NULL
      AND jsonb_typeof(s.discovery_payload) = 'object'
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
          OR lower(s.discovery_payload::text) LIKE v_pat ESCAPE '\'
        )
      )
      AND public.scholarship_discovery_nat_match(
        s.discovery_payload->'eligibleNationalities',
        v_nat
      )
      AND public.scholarship_discovery_dest_match(
        s.discovery_payload->'destinations',
        v_dest
      )
      AND (
        v_cov = 'any'
        OR lower(trim(coalesce(s.discovery_payload->>'coverage', ''))) = v_cov
      )
  ),
  tally AS (
    SELECT count(*)::bigint AS c FROM filtered
  ),
  paged AS (
    SELECT *
    FROM filtered
    ORDER BY name ASC NULLS LAST
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

GRANT EXECUTE ON FUNCTION public.scholarship_discovery_nat_match(jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scholarship_discovery_dest_match(jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_scholarships_discovery_page(text, text, text, text, int, int) TO anon, authenticated;
