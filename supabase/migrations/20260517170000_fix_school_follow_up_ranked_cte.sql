-- Hotfix: ranked CTE was referenced outside its WITH statement (PL/pgSQL scope).

CREATE OR REPLACE FUNCTION public.school_students_needing_follow_up(
  p_limit integer DEFAULT 5,
  p_school_id uuid DEFAULT NULL
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
