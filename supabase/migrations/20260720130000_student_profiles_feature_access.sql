-- Per-student product feature access (Quick Actions / navbar modules).
-- NULL or missing keys = enabled (backward compatible for existing students).

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS feature_access JSONB NULL;

COMMENT ON COLUMN public.student_profiles.feature_access IS
  'Optional map of feature keys to booleans controlling student portal Quick Actions and navbar access. Null means all features enabled.';
