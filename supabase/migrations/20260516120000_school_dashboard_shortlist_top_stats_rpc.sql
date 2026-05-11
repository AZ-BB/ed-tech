-- School dashboard: aggregate shortlist destinations and programs in one query (avoids
-- client-side pagination gaps from unordered range scans). Scoped to the caller's school.

CREATE OR REPLACE FUNCTION public.school_dashboard_shortlist_top_stats(p_top_n integer DEFAULT 6)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_n integer;
  v_dest jsonb;
  v_prog jsonb;
  v_rows bigint;
BEGIN
  v_school := public.current_school_admin_school_id();
  v_n := least(greatest(coalesce(p_top_n, 6), 1), 50);

  IF v_school IS NULL THEN
    RETURN jsonb_build_object(
      'destinations', '[]'::jsonb,
      'programs', '[]'::jsonb,
      'shortlist_row_count', 0
    );
  END IF;

  SELECT count(*) INTO v_rows
  FROM public.student_shortlist_universities s
  INNER JOIN public.student_profiles sp
    ON sp.id = s.student_id AND sp.school_id = v_school;

  SELECT coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object('label', t.label, 'count', t.cnt) ORDER BY t.cnt DESC, t.label ASC
      )
      FROM (
        SELECT trim(both from s.country) AS label, (count(*))::int AS cnt
        FROM public.student_shortlist_universities s
        INNER JOIN public.student_profiles sp
          ON sp.id = s.student_id AND sp.school_id = v_school
        WHERE s.country IS NOT NULL AND length(trim(both from s.country)) > 0
        GROUP BY trim(both from s.country)
        ORDER BY cnt DESC, label ASC
        LIMIT v_n
      ) t
    ),
    '[]'::jsonb
  ) INTO v_dest;

  SELECT coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object('label', t.label, 'count', t.cnt) ORDER BY t.cnt DESC, t.label ASC
      )
      FROM (
        SELECT trim(both from s.major_program) AS label, (count(*))::int AS cnt
        FROM public.student_shortlist_universities s
        INNER JOIN public.student_profiles sp
          ON sp.id = s.student_id AND sp.school_id = v_school
        WHERE s.major_program IS NOT NULL AND length(trim(both from s.major_program)) > 0
        GROUP BY trim(both from s.major_program)
        ORDER BY cnt DESC, label ASC
        LIMIT v_n
      ) t
    ),
    '[]'::jsonb
  ) INTO v_prog;

  RETURN jsonb_build_object(
    'destinations', v_dest,
    'programs', v_prog,
    'shortlist_row_count', (v_rows)::int
  );
END;
$$;

COMMENT ON FUNCTION public.school_dashboard_shortlist_top_stats(integer) IS
  'School portal: top shortlist countries and major_program values for students at the admin''s school, plus total shortlist rows. Uses SECURITY DEFINER and restricts via current_school_admin_school_id().';

REVOKE ALL ON FUNCTION public.school_dashboard_shortlist_top_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_dashboard_shortlist_top_stats(integer) TO authenticated;
