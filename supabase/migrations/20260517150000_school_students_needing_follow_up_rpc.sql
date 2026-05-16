-- School portal: students needing counselor follow-up (profile, 30d activity, shortlist).
-- Logic lives in Postgres; callers use RPCs scoped via current_school_admin_school_id().

-- ---------------------------------------------------------------------------
-- Profile completion % (mirrors getStudentApplicationProfileCompletion in TS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_application_profile_completion_pct(
  p_grade text,
  p_curriculum text,
  p_preferred_destinations text[],
  p_interested_programs text[],
  p_english_test_scores text,
  p_ielts_score text,
  p_toefl_score text,
  p_sat_score text,
  p_act_score text,
  p_sat_act_scores text
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_ok numeric := 0;
  v_has_english boolean;
  v_has_test boolean;
BEGIN
  IF length(trim(both from coalesce(p_grade, ''))) > 0 THEN
    v_ok := v_ok + 1;
  END IF;
  IF length(trim(both from coalesce(p_curriculum, ''))) > 0 THEN
    v_ok := v_ok + 1;
  END IF;
  IF coalesce(array_length(p_preferred_destinations, 1), 0) > 0 THEN
    v_ok := v_ok + 1;
  END IF;
  IF coalesce(array_length(p_interested_programs, 1), 0) > 0 THEN
    v_ok := v_ok + 1;
  END IF;

  v_has_english :=
    length(trim(both from coalesce(p_ielts_score, ''))) > 0
    OR length(trim(both from coalesce(p_toefl_score, ''))) > 0
    OR length(trim(both from coalesce(p_english_test_scores, ''))) > 0;

  v_has_test :=
    length(trim(both from coalesce(p_sat_score, ''))) > 0
    OR length(trim(both from coalesce(p_act_score, ''))) > 0
    OR length(trim(both from coalesce(p_sat_act_scores, ''))) > 0;

  IF v_has_english OR v_has_test THEN
    v_ok := v_ok + 1;
  END IF;
  IF v_has_english AND v_has_test THEN
    v_ok := v_ok + 1;
  ELSIF v_has_english OR v_has_test THEN
    v_ok := v_ok + 0.5;
  END IF;

  RETURN least(100, greatest(0, round((v_ok / 6.0) * 100)::integer));
END;
$$;

COMMENT ON FUNCTION public.student_application_profile_completion_pct(text, text, text[], text[], text, text, text, text, text, text) IS
  'Application profile completion 0–100; same weighting as student My Applications tab.';

-- ---------------------------------------------------------------------------
-- Grade sort key (Grade 12 highest)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.school_student_grade_priority(p_grade text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE trim(both from coalesce(p_grade, ''))
    WHEN 'Grade 12' THEN 12
    WHEN 'Grade 11' THEN 11
    WHEN 'Grade 10' THEN 10
    WHEN 'Grade 9' THEN 9
    WHEN 'Year 13' THEN 13
    ELSE 0
  END;
$$;

COMMENT ON FUNCTION public.school_student_grade_priority(text) IS
  'Numeric priority for school student grade strings (higher = more urgent cohort).';

-- ---------------------------------------------------------------------------
-- Issue line for follow-up rows (activity → shortlist → profile)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.school_student_follow_up_issue(
  p_no_activity_30_days boolean,
  p_no_shortlist boolean,
  p_profile_percent integer
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_no_activity_30_days THEN
    RETURN 'No platform activity in 30+ days';
  END IF;
  IF p_no_shortlist THEN
    RETURN 'No universities shortlisted yet';
  END IF;
  IF coalesce(p_profile_percent, 0) < 100 THEN
    RETURN format(
      'Profile completion is %s%% — encourage next steps',
      coalesce(p_profile_percent, 0)
    );
  END IF;
  RETURN 'Needs counselor follow-up';
END;
$$;

-- ---------------------------------------------------------------------------
-- List RPC: flagged students for dashboard / reports
-- p_limit: top N rows (default 5). Use 0 for all flagged students (capped at 10000).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.school_students_needing_follow_up(p_limit integer DEFAULT 5)
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
  v_school := public.current_school_admin_school_id();
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
      sp.grade,
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
        b.ap_grade,
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
      m.grade,
      m.profile_pct,
      greatest(
        m.max_act_at,
        m.max_ai_at,
        m.updated_at,
        m.created_at
      ) AS last_activity_at,
      (
        EXISTS (
          SELECT 1
          FROM public.student_activities sa
          WHERE sa.student_id = m.id
            AND sa.type = 'shortlist'
            AND sa.entity_type = 'university'
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
      e.*,
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
  )
  SELECT count(*)::integer INTO v_count FROM flagged;

  SELECT coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'first_name', coalesce(f.first_name, ''),
          'last_name', coalesce(f.last_name, ''),
          'grade', coalesce(trim(both from f.grade), ''),
          'risk_class', CASE WHEN f.signal_count >= 2 THEN 'red' ELSE 'amber' END,
          'risk_label', CASE WHEN f.signal_count >= 2 THEN 'Urgent' ELSE 'Follow-up' END,
          'issue', public.school_student_follow_up_issue(
            f.no_activity_30_days,
            f.no_shortlist,
            f.profile_pct
          )
        )
        ORDER BY
          public.school_student_grade_priority(f.grade) DESC,
          f.signal_count DESC,
          lower(coalesce(f.last_name, '')),
          lower(coalesce(f.first_name, ''))
      )
      FROM (
        SELECT *
        FROM flagged
        ORDER BY
          public.school_student_grade_priority(grade) DESC,
          signal_count DESC,
          lower(coalesce(last_name, '')),
          lower(coalesce(first_name, ''))
        LIMIT v_limit
      ) f
    ),
    '[]'::jsonb
  ) INTO v_students;

  RETURN jsonb_build_object(
    'need_attention_count', coalesce(v_count, 0),
    'students', coalesce(v_students, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.school_students_needing_follow_up(integer) IS
  'School portal: students needing follow-up (incomplete profile, no activity 30d, or no shortlist). Scoped by current_school_admin_school_id(). p_limit=0 returns all (max 10000).';

-- ---------------------------------------------------------------------------
-- Single-student RPC (student detail risk pill)
-- ---------------------------------------------------------------------------
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
    v_row.ap_grade,
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

  SELECT greatest(
    (SELECT max(sa.created_at) FROM public.student_activities sa WHERE sa.student_id = p_student_id),
    (SELECT max(au.created_at) FROM public.ai_usage au WHERE au.student_id = p_student_id),
    v_row.updated_at,
    v_row.created_at
  ) INTO v_last_activity;

  v_has_shortlist :=
    EXISTS (
      SELECT 1
      FROM public.student_activities sa
      WHERE sa.student_id = p_student_id
        AND sa.type = 'shortlist'
        AND sa.entity_type = 'university'
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

COMMENT ON FUNCTION public.school_student_follow_up_status(uuid) IS
  'School portal: follow-up status for one student at the admin''s school. NULL if unauthorized or not found.';

REVOKE ALL ON FUNCTION public.student_application_profile_completion_pct(text, text, text[], text[], text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_application_profile_completion_pct(text, text, text[], text[], text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.school_student_grade_priority(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_student_grade_priority(text) TO authenticated;

REVOKE ALL ON FUNCTION public.school_student_follow_up_issue(boolean, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_student_follow_up_issue(boolean, boolean, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.school_students_needing_follow_up(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_students_needing_follow_up(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.school_student_follow_up_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_student_follow_up_status(uuid) TO authenticated;
