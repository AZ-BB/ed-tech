-- Replace application_status value 'assigned' with 'scheduled'.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.applications.scheduled_at IS
  'When the application status was set to scheduled.';

CREATE TYPE public.application_status_new AS ENUM (
  'new',
  'scheduled',
  'in_progress',
  'blocked',
  'submitted'
);

ALTER TABLE public.applications
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.applications
  ALTER COLUMN status TYPE public.application_status_new
  USING (
    CASE status::text
      WHEN 'assigned' THEN 'scheduled'::public.application_status_new
      ELSE status::text::public.application_status_new
    END
  );

UPDATE public.applications
SET scheduled_at = COALESCE(scheduled_at, assigned_at, updated_at, created_at)
WHERE status = 'scheduled'
  AND scheduled_at IS NULL;

DROP TYPE public.application_status;

ALTER TYPE public.application_status_new RENAME TO application_status;

ALTER TABLE public.applications
  ALTER COLUMN status SET DEFAULT 'new';
