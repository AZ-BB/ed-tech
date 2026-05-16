-- Fix follow-up RPC: NULL-safe last activity, optional school_id param, reliable jsonb output.

-- Replace single-arg signature from 20260517150000 (cannot change defaults via CREATE OR REPLACE).
DROP FUNCTION IF EXISTS public.school_students_needing_follow_up(integer);
DROP FUNCTION IF EXISTS public.school_students_needing_follow_up(integer, uuid);

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

COMMENT ON FUNCTION public.school_students_needing_follow_up(integer, uuid) IS
  'School portal: students needing follow-up. Pass p_school_id from the caller when available; validated against auth.uid().';

-- Fix single-student RPC: NULL-safe activity + grade on student_profiles
CREATE OR REPLACE FUNCTION public.school_student_follow_up_status(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_row record;
  v_profile_pct integer;
  v_last_activity timestamptz;
  v_has_shortlist boolean;
  v_incomplete boolean;
  v_no_activity boolean;
  v_no_shortlist boolean;
  v_signal_count integer;
  v_needs boolean;
  v_risk_class text;
  v_risk_label text;
BEGIN
  v_school := public.current_school_admin_school_id();
  IF v_school IS NULL OR p_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    sp.id,
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
  INTO v_row
  FROM public.student_profiles sp
  LEFT JOIN public.student_application_profile ap ON ap.student_id = sp.id
  WHERE sp.id = p_student_id
    AND sp.school_id = v_school;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_profile_pct := public.student_application_profile_completion_pct(
    coalesce(nullif(trim(both from v_row.ap_grade), ''), nullif(trim(both from v_row.sp_grade), '')),
    v_row.curriculum,
    v_row.preferred_destinations,
    v_row.interested_programs,
    v_row.english_test_scores,
    v_row.ielts_score,
    v_row.toefl_score,
    v_row.sat_score,
    v_row.act_score,
    v_row.sat_act_scores
  );

  SELECT max(ts)
  INTO v_last_activity
  FROM unnest(
    ARRAY[
      (SELECT max(sa.created_at) FROM public.student_activities sa WHERE sa.student_id = p_student_id),
      (SELECT max(au.created_at) FROM public.ai_usage au WHERE au.student_id = p_student_id),
      v_row.updated_at,
      v_row.created_at
    ]
  ) AS t(ts)
  WHERE ts IS NOT NULL;

  v_has_shortlist :=
    EXISTS (
      SELECT 1
      FROM public.student_activities sa
      WHERE sa.student_id = p_student_id
        AND sa.type = 'shortlist'::public.student_activity_type
        AND sa.entity_type = 'university'::public.student_activity_entity_type
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_shortlist_universities ssu
      WHERE ssu.student_id = p_student_id
    );

  v_incomplete := v_profile_pct < 100;
  v_no_activity :=
    v_last_activity IS NULL
    OR v_last_activity < (now() - interval '30 days');
  v_no_shortlist := NOT v_has_shortlist;

  v_signal_count :=
    v_incomplete::integer + v_no_activity::integer + v_no_shortlist::integer;
  v_needs := v_signal_count > 0;

  IF NOT v_needs THEN
    RETURN jsonb_build_object(
      'needs_follow_up', false,
      'risk_class', 'green',
      'risk_label', 'On track',
      'issue', null,
      'profile_percent', v_profile_pct,
      'signals', jsonb_build_object(
        'incomplete_profile', false,
        'no_activity_30_days', false,
        'no_shortlist', false
      )
    );
  END IF;

  IF v_signal_count >= 2 THEN
    v_risk_class := 'red';
    v_risk_label := 'Urgent';
  ELSE
    v_risk_class := 'amber';
    v_risk_label := 'Follow-up';
  END IF;

  RETURN jsonb_build_object(
    'needs_follow_up', true,
    'risk_class', v_risk_class,
    'risk_label', v_risk_label,
    'issue', public.school_student_follow_up_issue(
      v_no_activity,
      v_no_shortlist,
      v_profile_pct
    ),
    'profile_percent', v_profile_pct,
    'signals', jsonb_build_object(
      'incomplete_profile', v_incomplete,
      'no_activity_30_days', v_no_activity,
      'no_shortlist', v_no_shortlist
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.school_students_needing_follow_up(integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_students_needing_follow_up(integer, uuid) TO authenticated;
