-- Admin reports: parameterized shortlist stats and platform-wide at-risk students.

CREATE OR REPLACE FUNCTION public.admin_report_shortlist_top_stats(
  p_school_id uuid DEFAULT NULL,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_top_n integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  v_n := least(greatest(coalesce(p_top_n, 10), 1), 50);
  v_start := coalesce(p_start, '-infinity'::timestamptz);
  v_end := coalesce(p_end, 'infinity'::timestamptz);

  RETURN (
    WITH shortlist_uni AS (
      SELECT DISTINCT sa.student_id, sa.uni_id
      FROM public.student_activities sa
      INNER JOIN public.student_profiles sp ON sp.id = sa.student_id
      WHERE sa.type = 'shortlist'::public.student_activity_type
        AND sa.entity_type = 'university'::public.student_activity_entity_type
        AND sa.uni_id IS NOT NULL
        AND sa.created_at >= v_start
        AND sa.created_at < v_end
        AND (p_school_id IS NULL OR sp.school_id = p_school_id)
    ),
    shortlist_scholarship AS (
      SELECT DISTINCT sa.student_id, sa.scholarship_id
      FROM public.student_activities sa
      INNER JOIN public.student_profiles sp ON sp.id = sa.student_id
      WHERE sa.type = 'shortlist'::public.student_activity_type
        AND sa.entity_type = 'scholarship'::public.student_activity_entity_type
        AND sa.scholarship_id IS NOT NULL
        AND sa.created_at >= v_start
        AND sa.created_at < v_end
        AND (p_school_id IS NULL OR sp.school_id = p_school_id)
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
    scholarship_agg AS (
      SELECT coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('label', t.label, 'count', t.cnt)
            ORDER BY t.cnt DESC, t.label ASC
          )
          FROM (
            SELECT trim(both from s.name) AS label, (count(*))::int AS cnt
            FROM shortlist_scholarship ss
            INNER JOIN public.scholarships s ON s.id = ss.scholarship_id
            WHERE s.name IS NOT NULL
              AND length(trim(both from s.name)) > 0
            GROUP BY trim(both from s.name)
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
      'scholarships', (SELECT value FROM scholarship_agg),
      'shortlist_row_count', (SELECT value FROM row_count)
    )
  );
END;
$$;

COMMENT ON FUNCTION public.admin_report_shortlist_top_stats(uuid, timestamptz, timestamptz, integer) IS
  'Admin reports: top shortlisted universities, destinations, and scholarships for optional school and date range.';

REVOKE ALL ON FUNCTION public.admin_report_shortlist_top_stats(uuid, timestamptz, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_report_shortlist_top_stats(uuid, timestamptz, timestamptz, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_students_at_risk(
  p_school_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10000
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_count integer;
  v_students jsonb;
BEGIN
  v_limit := CASE
    WHEN coalesce(p_limit, 10000) <= 0 THEN 10000
    ELSE least(greatest(coalesce(p_limit, 10000), 1), 10000)
  END;

  WITH base AS (
    SELECT
      sp.id,
      sp.first_name,
      sp.last_name,
      sp.grade AS sp_grade,
      sp.updated_at,
      sp.created_at,
      sch.name AS school_name,
      ap.grade AS ap_grade,
      ap.curriculum,
      ap.preferred_destinations,
      ap.interested_programs,
      ap.english_test_scores,
      ap.ielts_score,
      ap.toefl_score,
      ap.sat_score,
      ap.act_score,
      ap.sat_act_scores
    FROM public.student_profiles sp
    LEFT JOIN public.schools sch ON sch.id = sp.school_id
    LEFT JOIN public.student_application_profile ap ON ap.student_id = sp.id
    WHERE p_school_id IS NULL OR sp.school_id = p_school_id
  ),
  metrics AS (
    SELECT
      b.*,
      public.student_application_profile_completion_pct(
        coalesce(nullif(trim(both from b.ap_grade), ''), nullif(trim(both from b.sp_grade), '')),
        b.curriculum,
        b.preferred_destinations,
        b.interested_programs,
        b.english_test_scores,
        b.ielts_score,
        b.toefl_score,
        b.sat_score,
        b.act_score,
        b.sat_act_scores
      ) AS profile_pct,
      (
        SELECT max(sa.created_at)
        FROM public.student_activities sa
        WHERE sa.student_id = b.id
      ) AS max_act_at,
      (
        SELECT max(au.created_at)
        FROM public.ai_usage au
        WHERE au.student_id = b.id
      ) AS max_ai_at
    FROM base b
  ),
  enriched AS (
    SELECT
      m.id,
      m.first_name,
      m.last_name,
      m.sp_grade,
      m.school_name,
      m.profile_pct,
      (
        SELECT max(ts)
        FROM unnest(
          ARRAY[m.max_act_at, m.max_ai_at, m.updated_at, m.created_at]
        ) AS t(ts)
        WHERE ts IS NOT NULL
      ) AS last_activity_at,
      (
        EXISTS (
          SELECT 1
          FROM public.student_activities sa
          WHERE sa.student_id = m.id
            AND sa.type = 'shortlist'::public.student_activity_type
            AND sa.entity_type = 'university'::public.student_activity_entity_type
        )
        OR EXISTS (
          SELECT 1
          FROM public.student_shortlist_universities ssu
          WHERE ssu.student_id = m.id
        )
      ) AS has_shortlist
    FROM metrics m
  ),
  flagged AS (
    SELECT
      e.id,
      e.first_name,
      e.last_name,
      e.sp_grade,
      e.school_name,
      e.profile_pct,
      e.last_activity_at,
      e.has_shortlist,
      (
        e.last_activity_at IS NULL
        OR e.last_activity_at < (now() - interval '30 days')
      ) AS no_activity_30_days,
      (NOT e.has_shortlist) AS no_shortlist,
      (
        (e.profile_pct < 100)::integer
        + (
          e.last_activity_at IS NULL
          OR e.last_activity_at < (now() - interval '30 days')
        )::integer
        + ((NOT e.has_shortlist))::integer
      ) AS signal_count
    FROM enriched e
    WHERE
      e.profile_pct < 100
      OR e.last_activity_at IS NULL
      OR e.last_activity_at < (now() - interval '30 days')
      OR NOT e.has_shortlist
  ),
  ranked AS (
    SELECT
      f.id,
      f.first_name,
      f.last_name,
      f.sp_grade,
      f.school_name,
      f.profile_pct,
      f.no_activity_30_days,
      f.no_shortlist,
      f.signal_count,
      public.school_student_grade_priority(f.sp_grade) AS grade_pri
    FROM flagged f
    ORDER BY
      public.school_student_grade_priority(f.sp_grade) DESC,
      f.signal_count DESC,
      lower(coalesce(f.last_name, '')),
      lower(coalesce(f.first_name, ''))
    LIMIT v_limit
  )
  SELECT
    (SELECT count(*)::integer FROM flagged),
    (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', r.id::text,
            'first_name', coalesce(r.first_name, ''),
            'last_name', coalesce(r.last_name, ''),
            'grade', coalesce(trim(both from r.sp_grade), ''),
            'school_name', coalesce(trim(both from r.school_name), ''),
            'risk_class', CASE WHEN r.signal_count >= 2 THEN 'red' ELSE 'amber' END,
            'risk_label', CASE WHEN r.signal_count >= 2 THEN 'Urgent' ELSE 'Follow-up' END,
            'issue', public.school_student_follow_up_issue(
              r.no_activity_30_days,
              r.no_shortlist,
              r.profile_pct
            )
          )
          ORDER BY
            r.grade_pri DESC,
            r.signal_count DESC,
            lower(coalesce(r.last_name, '')),
            lower(coalesce(r.first_name, ''))
        ),
        '[]'::jsonb
      )
      FROM ranked r
    )
  INTO v_count, v_students;

  RETURN jsonb_build_object(
    'need_attention_count', coalesce(v_count, 0),
    'students', coalesce(v_students, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.admin_students_at_risk(uuid, integer) IS
  'Admin reports: students needing follow-up across all schools or one school.';

REVOKE ALL ON FUNCTION public.admin_students_at_risk(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_students_at_risk(uuid, integer) TO service_role;
