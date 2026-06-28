-- Payment workflow statuses for application support (after scheduled).

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS payment_in_progress_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.applications.payment_in_progress_at IS
  'When the application status was set to payment_in_progress.';

COMMENT ON COLUMN public.applications.payment_completed_at IS
  'When the application status was set to payment_completed.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status'
      AND e.enumlabel = 'payment_in_progress'
  ) THEN
    ALTER TYPE public.application_status ADD VALUE 'payment_in_progress' AFTER 'scheduled';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status'
      AND e.enumlabel = 'payment_completed'
  ) THEN
    ALTER TYPE public.application_status ADD VALUE 'payment_completed' AFTER 'payment_in_progress';
  END IF;
END $$;
