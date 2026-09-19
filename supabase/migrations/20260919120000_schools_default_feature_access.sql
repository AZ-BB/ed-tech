-- School-wide default student portal feature access (propagated on admin save and at signup).

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS default_feature_access JSONB NULL;

COMMENT ON COLUMN public.schools.default_feature_access IS
  'Default map of feature keys to booleans for students at this school. Applied to all enrolled students when updated by platform admin; copied to new profiles at school signup.';
