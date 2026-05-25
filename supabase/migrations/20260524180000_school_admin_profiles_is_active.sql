-- School admin (teacher) account active flag: deactivated teachers cannot sign in.

ALTER TABLE public.school_admin_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.school_admin_profiles.is_active IS
  'When false, the teacher cannot sign in and sees a deactivation message.';
