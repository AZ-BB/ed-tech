-- Admin dashboard: platform-wide shortlist aggregations for top universities and destinations.

CREATE OR REPLACE FUNCTION public.admin_dashboard_shortlist_top_stats(p_top_n integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  v_n := least(greatest(coalesce(p_top_n, 5), 1), 50);

  RETURN (
    WITH shortlist_uni AS (
      SELECT DISTINCT sa.student_id, sa.uni_id
      FROM public.student_activities sa
      WHERE sa.type = 'shortlist'
        AND sa.entity_type = 'university'
        AND sa.uni_id IS NOT NULL
    ),
    uni_agg AS (
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
            WHERE u.name IS NOT NULL
              AND length(trim(both from u.name)) > 0
            GROUP BY trim(both from u.name)
            ORDER BY cnt DESC, label ASC
            LIMIT v_n
          ) t
        ),
        '[]'::jsonb
      ) AS value
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
            WHERE c.name IS NOT NULL
              AND length(trim(both from c.name)) > 0
            GROUP BY trim(both from c.name)
            ORDER BY cnt DESC, label ASC
            LIMIT v_n
          ) t
        ),
        '[]'::jsonb
      ) AS value
    ),
    row_count AS (
      SELECT (count(*))::int AS value
      FROM shortlist_uni
    )
    SELECT jsonb_build_object(
      'universities', (SELECT value FROM uni_agg),
      'destinations', (SELECT value FROM dest_agg),
      'shortlist_row_count', (SELECT value FROM row_count)
    )
  );
END;
$$;

COMMENT ON FUNCTION public.admin_dashboard_shortlist_top_stats(integer) IS
  'Admin portal: top shortlisted universities and destinations across all schools.';

REVOKE ALL ON FUNCTION public.admin_dashboard_shortlist_top_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_shortlist_top_stats(integer) TO service_role;
