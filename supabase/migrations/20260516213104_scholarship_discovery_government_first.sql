-- Discovery listing: governmental scholarships first, then alphabetical within each group.

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
    SELECT f.*
    FROM filtered f
    ORDER BY
      CASE
        WHEN lower(trim(coalesce(
          nullif(trim(coalesce(f.discovery_payload->>'type', '')), ''),
          f.type::text,
          ''
        ))) = 'government' THEN 0
        ELSE 1
      END,
      f.name ASC NULLS LAST
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
