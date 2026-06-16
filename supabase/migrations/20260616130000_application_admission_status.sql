-- Admission outcome for application support (separate from workflow status).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_admission_status') THEN
    CREATE TYPE public.application_admission_status AS ENUM (
      'pending',
      'accepted',
      'rejected',
      'waitlist'
    );
  END IF;
END $$;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS admission_status public.application_admission_status NOT NULL DEFAULT 'pending';

COMMENT ON COLUMN public.applications.admission_status IS
  'University admission outcome for application support: pending, accepted, rejected, waitlist.';
