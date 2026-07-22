-- Pending/completed meeting status for advisor Sessions & Calls lead rows.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS scheduled_session_status public.advisor_session_status NOT NULL DEFAULT 'pending';

ALTER TABLE public.post_admission_cases
  ADD COLUMN IF NOT EXISTS scheduled_session_status public.advisor_session_status NOT NULL DEFAULT 'pending';

COMMENT ON COLUMN public.applications.scheduled_session_status IS
  'Advisor Sessions & Calls meeting status (pending or completed).';

COMMENT ON COLUMN public.post_admission_cases.scheduled_session_status IS
  'Advisor Sessions & Calls meeting status (pending or completed).';
