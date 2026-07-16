-- Deferred lead creation: intake drafts + lead qualification on sessions/cases.

-- ---------------------------------------------------------------------------
-- Enum: application_status += intake_draft
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status'
      AND e.enumlabel = 'intake_draft'
  ) THEN
    ALTER TYPE public.application_status ADD VALUE 'intake_draft';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Enum: post_admission_status += intake_draft
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'post_admission_status'
      AND e.enumlabel = 'intake_draft'
  ) THEN
    ALTER TYPE public.post_admission_status ADD VALUE 'intake_draft';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Lead qualification on applications
-- ---------------------------------------------------------------------------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS lead_qualification TEXT NULL
    CHECK (
      lead_qualification IS NULL
      OR lead_qualification IN ('good_lead', 'not_suitable')
    ),
  ADD COLUMN IF NOT EXISTS lead_qualified_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.applications.lead_qualification IS
  'Advisor Sessions & Calls outcome. Null = None. good_lead promotes intake_draft → lead.';

-- ---------------------------------------------------------------------------
-- Lead qualification on post_admission_cases
-- ---------------------------------------------------------------------------
ALTER TABLE public.post_admission_cases
  ADD COLUMN IF NOT EXISTS lead_qualification TEXT NULL
    CHECK (
      lead_qualification IS NULL
      OR lead_qualification IN ('good_lead', 'not_suitable')
    ),
  ADD COLUMN IF NOT EXISTS lead_qualified_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.post_admission_cases.lead_qualification IS
  'Advisor Sessions & Calls outcome. Null = None. good_lead promotes intake_draft → lead.';

-- ---------------------------------------------------------------------------
-- Lead qualification on advisor_sessions
-- ---------------------------------------------------------------------------
ALTER TABLE public.advisor_sessions
  ADD COLUMN IF NOT EXISTS lead_qualification TEXT NULL
    CHECK (
      lead_qualification IS NULL
      OR lead_qualification IN ('good_lead', 'not_suitable')
    ),
  ADD COLUMN IF NOT EXISTS lead_qualified_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS created_lead_application_id INTEGER NULL
    REFERENCES public.applications (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS advisor_sessions_lead_qualification_idx
  ON public.advisor_sessions (advisor_id, lead_qualification)
  WHERE lead_qualification IS NOT NULL;

CREATE INDEX IF NOT EXISTS applications_lead_qualification_idx
  ON public.applications (assigned_to, lead_qualification)
  WHERE lead_qualification IS NOT NULL;

CREATE INDEX IF NOT EXISTS post_admission_cases_lead_qualification_idx
  ON public.post_admission_cases (assigned_to, lead_qualification)
  WHERE lead_qualification IS NOT NULL;

COMMENT ON COLUMN public.advisor_sessions.lead_qualification IS
  'Advisor Sessions & Calls outcome. Null = None. good_lead creates an application lead.';
COMMENT ON COLUMN public.advisor_sessions.created_lead_application_id IS
  'Application lead created when this advisor session was marked Good lead.';
