-- Add no_show as a valid Sessions & Calls lead outcome.

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_lead_qualification_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_lead_qualification_check
  CHECK (
    lead_qualification IS NULL
    OR lead_qualification IN ('good_lead', 'not_suitable', 'no_show')
  );

ALTER TABLE public.post_admission_cases
  DROP CONSTRAINT IF EXISTS post_admission_cases_lead_qualification_check;

ALTER TABLE public.post_admission_cases
  ADD CONSTRAINT post_admission_cases_lead_qualification_check
  CHECK (
    lead_qualification IS NULL
    OR lead_qualification IN ('good_lead', 'not_suitable', 'no_show')
  );

ALTER TABLE public.advisor_sessions
  DROP CONSTRAINT IF EXISTS advisor_sessions_lead_qualification_check;

ALTER TABLE public.advisor_sessions
  ADD CONSTRAINT advisor_sessions_lead_qualification_check
  CHECK (
    lead_qualification IS NULL
    OR lead_qualification IN ('good_lead', 'not_suitable', 'no_show')
  );

COMMENT ON COLUMN public.applications.lead_qualification IS
  'Advisor Sessions & Calls outcome. Null = None. good_lead promotes intake_draft → lead. no_show = student did not attend.';
COMMENT ON COLUMN public.post_admission_cases.lead_qualification IS
  'Advisor Sessions & Calls outcome. Null = None. good_lead promotes intake_draft → lead. no_show = student did not attend.';
COMMENT ON COLUMN public.advisor_sessions.lead_qualification IS
  'Advisor Sessions & Calls outcome. Null = None. good_lead creates an application lead. no_show = student did not attend.';
