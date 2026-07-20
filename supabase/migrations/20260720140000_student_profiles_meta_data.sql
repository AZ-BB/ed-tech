-- Arbitrary metadata passed when provisioning independent students via API.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS meta_data JSONB NULL;

COMMENT ON COLUMN public.student_profiles.meta_data IS
  'Optional opaque JSON metadata from external provisioners (e.g. CRM ids). Not shown in student UI.';
