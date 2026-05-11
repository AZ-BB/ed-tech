-- School dashboard shortlist stats: use discovery `student_activities` (university shortlist)
-- instead of `student_shortlist_universities` (My Applications workspace rows).

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

  RETURN (
    WITH shortlist_uni AS (
      SELECT DISTINCT sa.student_id, sa.uni_id
      FROM public.student_activities sa
      INNER JOIN public.student_profiles sp
        ON sp.id = sa.student_id AND sp.school_id = v_school
      WHERE sa.type = 'shortlist'
        AND sa.entity_type = 'university'
        AND sa.uni_id IS NOT NULL
    ),
    dest_agg AS (
      SELECT coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('label', t.label, 'count', t.cnt)
            ORDER BY t.cnt DESC, t.label ASC
          )
          FROM (
            SELECT trim(both from c.name) AS label, (count(*))::int AS cnt
            FROM shortlist_uni su
            INNER JOIN public.universities u ON u.id = su.uni_id
            INNER JOIN public.countries c ON c.id = u.country_code
            WHERE c.name IS NOT NULL AND length(trim(both from c.name)) > 0
            GROUP BY trim(both from c.name)
            ORDER BY cnt DESC, label ASC
            LIMIT v_n
          ) t
        ),
        '[]'::jsonb
      ) AS j
    ),
    prog_agg AS (
      SELECT coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('label', t.label, 'count', t.cnt)
            ORDER BY t.cnt DESC, t.label ASC
          )
          FROM (
            SELECT trim(both from u.name) AS label, (count(*))::int AS cnt
            FROM shortlist_uni su
            INNER JOIN public.universities u ON u.id = su.uni_id
            WHERE u.name IS NOT NULL AND length(trim(both from u.name)) > 0
            GROUP BY trim(both from u.name)
            ORDER BY cnt DESC, label ASC
            LIMIT v_n
          ) t
        ),
        '[]'::jsonb
      ) AS j
    ),
    row_count AS (
      SELECT (count(*))::int AS n FROM shortlist_uni
    )
    SELECT jsonb_build_object(
      'destinations', (SELECT j FROM dest_agg),
      'programs', (SELECT j FROM prog_agg),
      'shortlist_row_count', (SELECT n FROM row_count)
    )
  );
END;
$$;

COMMENT ON FUNCTION public.school_dashboard_shortlist_top_stats(integer) IS
  'School portal: top destination countries and catalog universities from student_activities university shortlists for the admin school; shortlist_row_count is distinct (student, uni) pairs. Uses SECURITY DEFINER; scoped by current_school_admin_school_id().';
