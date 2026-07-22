-- Classify how a student account was created: school invite, self-serve individual, or external funnel/API.

CREATE TYPE public.student_type AS ENUM ('school', 'individual', 'funnel');

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS student_type public.student_type NOT NULL DEFAULT 'individual';

UPDATE public.student_profiles
SET student_type = 'school'
WHERE school_id IS NOT NULL;

COMMENT ON COLUMN public.student_profiles.student_type IS
  'Account origin: school (school invite/signup), individual (self-serve), funnel (external provision/API).';
