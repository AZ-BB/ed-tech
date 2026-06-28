-- Remove application-level admission status (tracked per university target instead).

ALTER TABLE public.applications
  DROP COLUMN IF EXISTS admission_status;

DROP TYPE IF EXISTS public.application_admission_status;
