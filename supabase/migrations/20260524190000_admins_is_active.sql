-- Platform admin account active flag: deactivated admins cannot sign in.

ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.admins.is_active IS
  'When false, the admin cannot sign in and sees a deactivation message.';
