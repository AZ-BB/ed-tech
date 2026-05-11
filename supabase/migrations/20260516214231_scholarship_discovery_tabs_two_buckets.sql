-- Tabbed discovery: separate paginated buckets (government vs other).
-- Drops the 6-arg overload in favor of 8-arg (p_bucket, p_home_alpha2).

DROP FUNCTION IF EXISTS public.rpc_scholarships_discovery_page(text, text, text, text, int, int);

CREATE OR REPLACE FUNCTION public.rpc_scholarships_discovery_page(
  p_q text DEFAULT NULL,
  p_nat text DEFAULT 'any',
  p_dest text DEFAULT 'any',
  p_cov text DEFAULT 'any',
  p_bucket text DEFAULT 'government',
  p_home_alpha2 text DEFAULT NULL,
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
  WHERE s.discovery_payload IS NOT NULL
    AND jsonb_typeof(s.discovery_payload) = 'object';

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
      lower(trim(coalesce(s.discovery_payload->>'country', ''))) AS sponsor_norm
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
      br.method,
      br.deadline,
      br.tuition_type,
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

GRANT EXECUTE ON FUNCTION public.rpc_scholarships_discovery_page(text, text, text, text, text, text, int, int) TO anon, authenticated;
