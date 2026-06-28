-- Advisor portal dashboard: single RPC returning KPIs, lists, and conversion metrics.

CREATE OR REPLACE FUNCTION public.advisor_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advisor_id uuid;
  v_today date := current_date;
  v_week_start date := date_trunc('week', v_today)::date;
  v_month_start date := date_trunc('month', v_today)::date;
  v_month_end date := (date_trunc('month', v_today) + interval '1 month')::date;
  v_empty jsonb := jsonb_build_object(
    'kpis', jsonb_build_object(
      'calls_completed', jsonb_build_object('total', 0, 'this_week', 0),
      'new_leads', jsonb_build_object('total', 0, 'awaiting_first_call', 0),
      'active_packages', jsonb_build_object('total', 0, 'new_this_month', 0),
      'conversion_at_risk', jsonb_build_object('total', 0),
      'applications_in_progress', jsonb_build_object('total', 0, 'student_count', 0)
    ),
    'conversion_metrics', jsonb_build_object(
      'call_to_package_pct', 0,
      'calls_completed_month', 0,
      'packages_purchased', 0,
      'avg_days_call_to_signup', null,
      'students_under_management', 0
    ),
    'todays_calls', '[]'::jsonb,
    'awaiting_payment', '[]'::jsonb,
    'upcoming_deadlines', '[]'::jsonb
  );
  v_result jsonb;
BEGIN
  v_advisor_id := public.current_advisor_id();
  IF v_advisor_id IS NULL THEN
    RETURN v_empty;
  END IF;

  WITH apps AS (
    SELECT
      a.id,
      a.student_id,
      a.status,
      a.student_name,
      a.school_name,
      plan.universities_count AS plan_universities_count,
      plan.name AS plan_name,
      sp.first_name,
      sp.last_name,
      sp.grade,
      sch.name AS school_profile_name
    FROM public.applications a
    LEFT JOIN public.applications_plans plan ON plan.id = a.plan_id
    LEFT JOIN public.student_profiles sp ON sp.id = a.student_id
    LEFT JOIN public.schools sch ON sch.id = a.school_id
    WHERE a.assigned_to = v_advisor_id
  ),
  payments_agg AS (
    SELECT
      p.application_id,
      bool_or(p.status = 'paid') AS has_paid,
      bool_or(
        p.payment_request_sent_at IS NOT NULL
        OR coalesce(nullif(trim(both from p.payment_request_token), ''), '') <> ''
      ) AS has_payment_request,
      min(p.paid_at) FILTER (WHERE p.status = 'paid') AS first_paid_at
    FROM public.payments p
    INNER JOIN apps a ON a.id = p.application_id
    GROUP BY p.application_id
  ),
  app_enriched AS (
    SELECT
      a.*,
      coalesce(pa.has_paid, false) AS has_paid,
      coalesce(pa.has_payment_request, false) AS has_payment_request,
      pa.first_paid_at
    FROM apps a
    LEFT JOIN payments_agg pa ON pa.application_id = a.id
  ),
  lead_apps AS (
    SELECT ae.*
    FROM app_enriched ae
    WHERE NOT ae.has_paid
      AND ae.status::text IN ('new', 'scheduled', 'payment_in_progress', 'blocked')
  ),
  active_package_apps AS (
    SELECT ae.*
    FROM app_enriched ae
    WHERE ae.has_paid
      AND ae.status::text IN ('payment_completed', 'in_progress', 'submitted')
  ),
  completed_calls AS (
    SELECT
      ac.id,
      ac.application_id,
      ac.call_date,
      a.student_id
    FROM public.application_calls ac
    INNER JOIN apps a ON a.id = ac.application_id
    WHERE ac.status = 'completed'
  ),
  completed_sessions AS (
    SELECT
      ads.id,
      ads.student_id,
      ads.booked_at::date AS meeting_date
    FROM public.advisor_sessions ads
    WHERE ads.advisor_id = v_advisor_id
      AND ads.status IN ('confirmed', 'completed')
      AND ads.booked_at IS NOT NULL
  ),
  students_with_meeting AS (
    SELECT DISTINCT student_id
    FROM (
      SELECT student_id FROM completed_calls
      UNION
      SELECT student_id FROM completed_sessions
    ) s
  ),
  students_with_paid AS (
    SELECT DISTINCT student_id
    FROM app_enriched
    WHERE has_paid
  ),
  first_meeting_by_student AS (
    SELECT
      s.student_id,
      min(s.meeting_date)::date AS first_meeting_date
    FROM (
      SELECT cc.student_id, cc.call_date::date AS meeting_date
      FROM completed_calls cc
      UNION ALL
      SELECT cs.student_id, cs.meeting_date
      FROM completed_sessions cs
    ) s
    GROUP BY s.student_id
  ),
  converted_timing AS (
    SELECT
      swp.student_id,
      (min(ae.first_paid_at)::date - fmb.first_meeting_date) AS days_to_signup
    FROM students_with_paid swp
    INNER JOIN first_meeting_by_student fmb ON fmb.student_id = swp.student_id
    INNER JOIN app_enriched ae ON ae.student_id = swp.student_id AND ae.has_paid
    GROUP BY swp.student_id, fmb.first_meeting_date
    HAVING min(ae.first_paid_at) IS NOT NULL
  ),
  lead_students AS (
    SELECT DISTINCT student_id FROM lead_apps
  ),
  lead_students_with_meeting AS (
    SELECT DISTINCT ls.student_id
    FROM lead_students ls
    INNER JOIN students_with_meeting swm ON swm.student_id = ls.student_id
  ),
  lead_students_awaiting_first_call AS (
    SELECT ls.student_id
    FROM lead_students ls
    WHERE NOT EXISTS (
      SELECT 1 FROM students_with_meeting swm WHERE swm.student_id = ls.student_id
    )
  ),
  metrics AS (
    SELECT
      (SELECT count(*)::int FROM completed_calls) AS calls_completed_total,
      (
        SELECT count(*)::int
        FROM completed_calls cc
        WHERE cc.call_date >= v_week_start AND cc.call_date <= v_today
      ) AS calls_completed_this_week,
      (SELECT count(*)::int FROM lead_apps) AS new_leads_total,
      (SELECT count(*)::int FROM lead_students_awaiting_first_call) AS awaiting_first_call,
      (SELECT count(*)::int FROM active_package_apps) AS active_packages_total,
      (
        SELECT count(*)::int
        FROM active_package_apps apa
        WHERE apa.first_paid_at >= v_month_start
          AND apa.first_paid_at < v_month_end
      ) AS active_packages_new_month,
      (
        SELECT count(*)::int
        FROM lead_students_with_meeting lswm
        WHERE NOT EXISTS (
          SELECT 1 FROM students_with_paid swp WHERE swp.student_id = lswm.student_id
        )
      ) AS conversion_at_risk,
      (
        SELECT count(*)::int
        FROM public.application_university_targets aut
        INNER JOIN active_package_apps apa ON apa.id = aut.application_id
        WHERE aut.status::text <> 'submitted'
      ) AS applications_in_progress_total,
      (
        SELECT count(DISTINCT apa.student_id)::int
        FROM public.application_university_targets aut
        INNER JOIN active_package_apps apa ON apa.id = aut.application_id
        WHERE aut.status::text <> 'submitted'
      ) AS applications_in_progress_students,
      (
        SELECT count(*)::int
        FROM completed_calls cc
        WHERE cc.call_date >= v_month_start AND cc.call_date < v_month_end
      ) AS calls_completed_month,
      (SELECT count(DISTINCT student_id)::int FROM students_with_paid) AS packages_purchased,
      (SELECT count(DISTINCT student_id)::int FROM apps) AS students_under_management,
      (SELECT count(DISTINCT student_id)::int FROM students_with_meeting) AS students_with_meeting_count,
      (SELECT round(avg(ct.days_to_signup)::numeric, 1) FROM converted_timing ct) AS avg_days_call_to_signup
  ),
  session_calls AS (
    SELECT
      ads.id::text AS call_id,
      'advisor_session'::text AS source,
      to_char(ads.booked_at, 'HH24:MI') AS call_time,
      null::int AS duration_minutes,
      ads.student_id,
      null::int AS application_id,
      coalesce(
        nullif(trim(both from coalesce(sp.first_name, '') || ' ' || coalesce(sp.last_name, '')), ''),
        'Student'
      ) AS student_name,
      'advisor_session'::text AS call_type,
      coalesce(
        nullif(trim(both from sch.name), ''),
        nullif(trim(both from ad.school_name), ''),
        ''
      ) AS school_name,
      coalesce(nullif(trim(both from sp.grade), ''), '') AS grade,
      coalesce(ad.has_paid, false) AS has_paid,
      ad.plan_universities_count,
      ads.booked_at AS sort_at
    FROM public.advisor_sessions ads
    INNER JOIN public.student_profiles sp ON sp.id = ads.student_id
    LEFT JOIN public.schools sch ON sch.id = sp.school_id
    LEFT JOIN LATERAL (
      SELECT ae.school_name, ae.has_paid, ae.plan_universities_count
      FROM app_enriched ae
      WHERE ae.student_id = ads.student_id
      ORDER BY ae.has_paid DESC, ae.id DESC
      LIMIT 1
    ) ad ON true
    WHERE ads.advisor_id = v_advisor_id
      AND ads.status IN ('confirmed', 'pending')
      AND ads.booked_at IS NOT NULL
      AND ads.booked_at::date = v_today
  ),
  application_calls_today AS (
    SELECT
      ac.id::text AS call_id,
      'application_call'::text AS source,
      null::text AS call_time,
      ac.duration_minutes,
      a.student_id,
      ac.application_id,
      coalesce(
        nullif(trim(both from coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''),
        nullif(trim(both from a.student_name), ''),
        'Student'
      ) AS student_name,
      ac.call_type,
      coalesce(
        nullif(trim(both from a.school_profile_name), ''),
        nullif(trim(both from a.school_name), ''),
        ''
      ) AS school_name,
      coalesce(nullif(trim(both from a.grade), ''), '') AS grade,
      a.has_paid,
      a.plan_universities_count,
      ac.call_date::timestamptz AS sort_at
    FROM public.application_calls ac
    INNER JOIN app_enriched a ON a.id = ac.application_id
    WHERE ac.status IN ('scheduled', 'rescheduled')
      AND ac.call_date = v_today
  ),
  combined_calls AS (
    SELECT * FROM session_calls
    UNION ALL
    SELECT * FROM application_calls_today
  ),
  todays_calls_json AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.call_id,
          'source', c.source,
          'time', c.call_time,
          'duration_minutes', c.duration_minutes,
          'student_id', c.student_id,
          'application_id', c.application_id,
          'student_name', c.student_name,
          'call_type', c.call_type,
          'school_name', c.school_name,
          'grade', c.grade,
          'has_paid', c.has_paid,
          'plan_universities_count', c.plan_universities_count
        )
        ORDER BY c.sort_at ASC NULLS LAST, c.student_name ASC
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT * FROM combined_calls
      ORDER BY sort_at ASC NULLS LAST, student_name ASC
      LIMIT 10
    ) c
  ),
  awaiting_payment_json AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'application_id', row.application_id,
          'student_name', row.student_name,
          'package_label', row.package_label,
          'amount', row.amount,
          'sent_at', row.sent_at
        )
        ORDER BY row.sent_at DESC NULLS LAST
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT
        p.application_id,
        coalesce(
          nullif(trim(both from coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''),
          nullif(trim(both from a.student_name), ''),
          'Student'
        ) AS student_name,
        CASE
          WHEN coalesce(a.plan_universities_count, 0) > 0 THEN
            format('%s-uni package', a.plan_universities_count)
          ELSE coalesce(nullif(trim(both from a.plan_name), ''), 'Package')
        END AS package_label,
        p.amount,
        coalesce(p.payment_request_sent_at, p.created_at) AS sent_at
      FROM public.payments p
      INNER JOIN apps a ON a.id = p.application_id
      WHERE p.status = 'pending'
        AND (
          p.payment_request_sent_at IS NOT NULL
          OR coalesce(nullif(trim(both from p.payment_request_token), ''), '') <> ''
        )
      ORDER BY coalesce(p.payment_request_sent_at, p.created_at) DESC NULLS LAST
      LIMIT 5
    ) row
  ),
  student_names AS (
    SELECT DISTINCT ON (student_id)
      student_id,
      coalesce(
        nullif(trim(both from coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
        nullif(trim(both from student_name), ''),
        'Student'
      ) AS student_name
    FROM apps
    ORDER BY student_id
  ),
  deadline_rows AS (
    SELECT
      a.student_id,
      aut.university_name,
      aut.program,
      aut.deadline::date AS deadline
    FROM public.application_university_targets aut
    INNER JOIN apps a ON a.id = aut.application_id
    WHERE aut.deadline IS NOT NULL
      AND aut.deadline::date >= v_today
    UNION ALL
    SELECT
      ssu.student_id,
      ssu.university_name,
      ssu.major_program AS program,
      ssu.application_deadline::date AS deadline
    FROM public.student_shortlist_universities ssu
    INNER JOIN student_names sn ON sn.student_id = ssu.student_id
    WHERE ssu.application_deadline IS NOT NULL
      AND ssu.application_deadline::date >= v_today
  ),
  upcoming_deadlines_json AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'student_id', d.student_id,
          'student_name', d.student_name,
          'university_name', d.university_name,
          'program', d.program,
          'deadline', d.deadline,
          'days_until', d.days_until
        )
        ORDER BY d.deadline ASC, d.university_name ASC
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT
        dr.student_id,
        sn.student_name,
        dr.university_name,
        coalesce(nullif(trim(both from dr.program), ''), null) AS program,
        dr.deadline,
        (dr.deadline - v_today)::int AS days_until
      FROM deadline_rows dr
      INNER JOIN student_names sn ON sn.student_id = dr.student_id
      ORDER BY dr.deadline ASC, dr.university_name ASC
      LIMIT 5
    ) d
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'calls_completed', jsonb_build_object(
        'total', m.calls_completed_total,
        'this_week', m.calls_completed_this_week
      ),
      'new_leads', jsonb_build_object(
        'total', m.new_leads_total,
        'awaiting_first_call', m.awaiting_first_call
      ),
      'active_packages', jsonb_build_object(
        'total', m.active_packages_total,
        'new_this_month', m.active_packages_new_month
      ),
      'conversion_at_risk', jsonb_build_object(
        'total', m.conversion_at_risk
      ),
      'applications_in_progress', jsonb_build_object(
        'total', m.applications_in_progress_total,
        'student_count', m.applications_in_progress_students
      )
    ),
    'conversion_metrics', jsonb_build_object(
      'call_to_package_pct',
        CASE
          WHEN m.students_with_meeting_count = 0 THEN 0
          ELSE round(
            (m.packages_purchased::numeric / m.students_with_meeting_count::numeric) * 100
          )::int
        END,
      'calls_completed_month', m.calls_completed_month,
      'packages_purchased', m.packages_purchased,
      'avg_days_call_to_signup', m.avg_days_call_to_signup,
      'students_under_management', m.students_under_management
    ),
    'todays_calls', (SELECT payload FROM todays_calls_json),
    'awaiting_payment', (SELECT payload FROM awaiting_payment_json),
    'upcoming_deadlines', (SELECT payload FROM upcoming_deadlines_json)
  )
  INTO v_result
  FROM metrics m;

  RETURN coalesce(v_result, v_empty);
END;
$$;

COMMENT ON FUNCTION public.advisor_dashboard() IS
  'Advisor portal: dashboard KPIs, today''s calls, conversion metrics, awaiting payment, and upcoming deadlines for the authenticated advisor.';

REVOKE ALL ON FUNCTION public.advisor_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advisor_dashboard() TO authenticated;
