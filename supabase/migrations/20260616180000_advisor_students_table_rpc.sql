-- Advisor students table: single RPC to fetch all rows.

CREATE OR REPLACE FUNCTION public.advisor_students_table_rows()
RETURNS TABLE (
  student_id uuid,
  student_name text,
  student_email text,
  school_name text,
  management_status text,
  destinations jsonb,
  initial_meeting_date date,
  package_purchased text,
  deadline_risk_level text,
  deadline_risk_label text,
  latest_updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advisor_id uuid;
BEGIN
  v_advisor_id := public.current_advisor_id();
  IF v_advisor_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH apps AS (
    SELECT
      a.id,
      a.student_id,
      a.updated_at,
      a.created_at,
      a.preferred_uni_or_countries,
      a.student_name,
      a.student_email,
      a.school_name,
      plan.universities_count AS plan_universities_count,
      sp.first_name,
      sp.last_name,
      sp.email AS profile_email,
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
      ) AS has_payment_request
    FROM public.payments p
    GROUP BY p.application_id
  ),
  app_enriched AS (
    SELECT
      a.*,
      coalesce(pa.has_paid, false) AS has_paid,
      coalesce(pa.has_payment_request, false) AS has_payment_request
    FROM apps a
    LEFT JOIN payments_agg pa ON pa.application_id = a.id
  ),
  latest_app AS (
    SELECT DISTINCT ON (a.student_id)
      a.student_id,
      a.id AS latest_app_id,
      a.updated_at AS latest_updated_at,
      a.created_at AS latest_created_at,
      a.preferred_uni_or_countries,
      a.plan_universities_count
    FROM app_enriched a
    ORDER BY
      a.student_id,
      coalesce(a.updated_at, a.created_at) DESC,
      a.id DESC
  ),
  status_by_student AS (
    SELECT
      a.student_id,
      CASE
        WHEN bool_or(a.has_paid) THEN 'active_package'
        WHEN bool_or(a.has_payment_request) THEN 'payment_requested'
        ELSE 'lead'
      END AS management_status
    FROM app_enriched a
    GROUP BY a.student_id
  ),
  app_calls_meeting AS (
    SELECT
      ac.application_id,
      min(ac.call_date)::date AS first_call_date
    FROM public.application_calls ac
    WHERE ac.status = 'completed'
    GROUP BY ac.application_id
  ),
  meetings_by_student AS (
    SELECT
      s.student_id,
      min(s.meeting_date)::date AS initial_meeting_date
    FROM (
      SELECT
        ads.student_id,
        ads.booked_at::date AS meeting_date
      FROM public.advisor_sessions ads
      WHERE ads.status IN ('confirmed', 'completed')
      UNION ALL
      SELECT
        a.student_id,
        am.first_call_date::date AS meeting_date
      FROM apps a
      INNER JOIN app_calls_meeting am ON am.application_id = a.id
    ) s
    GROUP BY s.student_id
  ),
  destination_counts AS (
    SELECT
      a.student_id,
      lower(coalesce(c.name, aut.country_code)) AS country_key,
      coalesce(c.name, upper(aut.country_code)) AS country_label,
      count(*)::int AS cnt
    FROM apps a
    INNER JOIN public.application_university_targets aut ON aut.application_id = a.id
    LEFT JOIN public.countries c ON c.id = aut.country_code
    WHERE aut.country_code IS NOT NULL
      AND length(trim(both from aut.country_code)) > 0
    GROUP BY
      a.student_id,
      lower(coalesce(c.name, aut.country_code)),
      coalesce(c.name, upper(aut.country_code))
  ),
  destinations_primary AS (
    SELECT
      dc.student_id,
      jsonb_agg(
        jsonb_build_object(
          'countryCode', dc.country_key,
          'label', dc.country_label,
          'count', dc.cnt
        )
        ORDER BY dc.cnt DESC, dc.country_label ASC
      ) AS destinations
    FROM destination_counts dc
    GROUP BY dc.student_id
  ),
  destinations_profile AS (
    SELECT
      sap.student_id,
      jsonb_agg(
        jsonb_build_object(
          'countryCode', lower(trim(both from v)),
          'label', trim(both from v),
          'count', 1
        )
      ) AS destinations
    FROM public.student_application_profile sap
    CROSS JOIN LATERAL unnest(coalesce(sap.preferred_destinations, ARRAY[]::text[])) AS v
    WHERE length(trim(both from v)) > 0
    GROUP BY sap.student_id
  ),
  destinations_fallback_text AS (
    SELECT
      la.student_id,
      jsonb_agg(
        jsonb_build_object(
          'countryCode', lower(trim(both from p)),
          'label', trim(both from p),
          'count', 1
        )
      ) AS destinations
    FROM latest_app la
    CROSS JOIN LATERAL regexp_split_to_table(coalesce(la.preferred_uni_or_countries, ''), '[,;|]') AS p
    WHERE length(trim(both from p)) > 0
    GROUP BY la.student_id
  ),
  deadlines AS (
    SELECT a.student_id, aut.deadline::date AS deadline
    FROM apps a
    INNER JOIN public.application_university_targets aut ON aut.application_id = a.id
    WHERE aut.deadline IS NOT NULL
    UNION ALL
    SELECT ssu.student_id, ssu.application_deadline::date AS deadline
    FROM public.student_shortlist_universities ssu
    WHERE ssu.application_deadline IS NOT NULL
  ),
  deadline_nearest AS (
    SELECT
      d.student_id,
      min((d.deadline - current_date)) FILTER (WHERE d.deadline >= current_date) AS nearest_days
    FROM deadlines d
    GROUP BY d.student_id
  ),
  student_base AS (
    SELECT
      a.student_id,
      coalesce(
        nullif(trim(both from max(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, ''))), ''),
        nullif(trim(both from max(a.student_name)), ''),
        'Student'
      ) AS student_name,
      coalesce(
        nullif(trim(both from max(a.profile_email)), ''),
        nullif(trim(both from max(a.student_email)), ''),
        '—'
      ) AS student_email,
      coalesce(
        nullif(trim(both from max(a.school_profile_name)), ''),
        nullif(trim(both from max(a.school_name)), ''),
        '—'
      ) AS school_name
    FROM apps a
    GROUP BY a.student_id
  )
  SELECT
    sb.student_id,
    sb.student_name,
    sb.student_email,
    sb.school_name,
    sbs.management_status,
    coalesce(dp.destinations, dprof.destinations, dtext.destinations, '[]'::jsonb) AS destinations,
    mbs.initial_meeting_date,
    CASE
      WHEN coalesce(la.plan_universities_count, 0) > 0 THEN la.plan_universities_count::text
      ELSE '-'
    END AS package_purchased,
    CASE
      WHEN dn.nearest_days IS NULL THEN 'none'
      WHEN dn.nearest_days < 3 THEN 'urgent'
      WHEN dn.nearest_days < 7 THEN 'soon'
      ELSE 'ok'
    END AS deadline_risk_level,
    CASE
      WHEN dn.nearest_days IS NULL THEN '—'
      WHEN dn.nearest_days < 3 THEN format('Urgent: %s days', dn.nearest_days)
      WHEN dn.nearest_days = 0 THEN 'Due today'
      WHEN dn.nearest_days < 7 THEN format('%sd', dn.nearest_days)
      ELSE 'On track'
    END AS deadline_risk_label,
    la.latest_updated_at
  FROM student_base sb
  INNER JOIN status_by_student sbs ON sbs.student_id = sb.student_id
  LEFT JOIN latest_app la ON la.student_id = sb.student_id
  LEFT JOIN meetings_by_student mbs ON mbs.student_id = sb.student_id
  LEFT JOIN destinations_primary dp ON dp.student_id = sb.student_id
  LEFT JOIN destinations_profile dprof ON dprof.student_id = sb.student_id
  LEFT JOIN destinations_fallback_text dtext ON dtext.student_id = sb.student_id
  LEFT JOIN deadline_nearest dn ON dn.student_id = sb.student_id
  ORDER BY coalesce(la.latest_updated_at, la.latest_created_at) DESC NULLS LAST, sb.student_name ASC;
END;
$$;

COMMENT ON FUNCTION public.advisor_students_table_rows() IS
  'Advisor portal: returns student table rows for the currently authenticated advisor.';

REVOKE ALL ON FUNCTION public.advisor_students_table_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advisor_students_table_rows() TO authenticated;
