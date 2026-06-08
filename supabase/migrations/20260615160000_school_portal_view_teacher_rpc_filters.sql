-- Optional teacher filter for school portal My View (assigned students only).

CREATE OR REPLACE FUNCTION public.school_dashboard_shortlist_top_stats(
  p_top_n integer DEFAULT 6,
  p_teacher_id uuid DEFAULT NULL
)
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

  IF p_teacher_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.school_admin_profiles sap
      WHERE sap.id = p_teacher_id
        AND sap.school_id = v_school
    ) THEN
      RETURN jsonb_build_object(
        'destinations', '[]'::jsonb,
        'programs', '[]'::jsonb,
        'shortlist_row_count', 0
      );
    END IF;
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
        AND (p_teacher_id IS NULL OR sp.teacher_id = p_teacher_id)
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
            SELECT trim(both from s.major_program) AS label, (count(*))::int AS cnt
            FROM public.student_shortlist_universities s
            INNER JOIN public.student_profiles sp
              ON sp.id = s.student_id AND sp.school_id = v_school
            WHERE s.major_program IS NOT NULL
              AND length(trim(both from s.major_program)) > 0
              AND lower(trim(both from s.major_program)) <> 'undecided'
              AND (p_teacher_id IS NULL OR sp.teacher_id = p_teacher_id)
            GROUP BY trim(both from s.major_program)
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

COMMENT ON FUNCTION public.school_dashboard_shortlist_top_stats(integer, uuid) IS
  'School portal: top destinations/programs; optional p_teacher_id limits to assigned students (My View).';

DROP FUNCTION IF EXISTS public.school_dashboard_shortlist_top_stats(integer);

CREATE OR REPLACE FUNCTION public.school_students_needing_follow_up(
  p_limit integer DEFAULT 5,
  p_school_id uuid DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_limit integer;
  v_count integer;
  v_students jsonb;
BEGIN
  IF p_school_id IS NOT NULL THEN
    SELECT sap.school_id INTO v_school
    FROM public.school_admin_profiles sap
    WHERE sap.id = auth.uid()
      AND sap.school_id = p_school_id
    LIMIT 1;
  ELSE
    v_school := public.current_school_admin_school_id();
  END IF;

  v_limit := CASE
    WHEN coalesce(p_limit, 5) <= 0 THEN 10000
    ELSE least(greatest(coalesce(p_limit, 5), 1), 10000)
  END;

  IF v_school IS NULL THEN
    RETURN jsonb_build_object(
      'need_attention_count', 0,
      'students', '[]'::jsonb
    );
  END IF;

  IF p_teacher_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.school_admin_profiles sap
      WHERE sap.id = p_teacher_id
        AND sap.school_id = v_school
    ) THEN
      RETURN jsonb_build_object(
        'need_attention_count', 0,
        'students', '[]'::jsonb
      );
    END IF;
  END IF;

  WITH base AS (
    SELECT
      sp.id,
      sp.first_name,
      sp.last_name,
      sp.grade AS sp_grade,
      sp.updated_at,
      sp.created_at,
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
    LEFT JOIN public.student_application_profile ap ON ap.student_id = sp.id
    WHERE sp.school_id = v_school
      AND (p_teacher_id IS NULL OR sp.teacher_id = p_teacher_id)
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
      e.profile_pct,
      e.last_activity_at,
      e.has_shortlist,
      (e.profile_pct < 100) AS incomplete_profile,
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

COMMENT ON FUNCTION public.school_students_needing_follow_up(integer, uuid, uuid) IS
  'School portal: students needing follow-up; optional p_teacher_id limits to assigned students (My View).';

DROP FUNCTION IF EXISTS public.school_students_needing_follow_up(integer, uuid);

REVOKE ALL ON FUNCTION public.school_dashboard_shortlist_top_stats(integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_dashboard_shortlist_top_stats(integer, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.school_students_needing_follow_up(integer, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_students_needing_follow_up(integer, uuid, uuid) TO authenticated;
