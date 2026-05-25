-- Student account active flag: deactivated students cannot sign in.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.student_profiles.is_active IS
  'When false, the student cannot sign in and sees a deactivation message.';
