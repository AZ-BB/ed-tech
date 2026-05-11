-- Optional contact phone for school portal account settings.
ALTER TABLE public.school_admin_profiles
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;

COMMENT ON COLUMN public.school_admin_profiles.phone IS
  'Optional phone number for the school admin/counselor (portal settings).';
