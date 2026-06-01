-- Default global list sort
CREATE INDEX IF NOT EXISTS acitivity_logs_created_at_idx
  ON public.acitivity_logs (created_at DESC);

-- Filter + sort composites for the three type filters
CREATE INDEX IF NOT EXISTS acitivity_logs_action_created_at_idx
  ON public.acitivity_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS acitivity_logs_entitiy_type_created_at_idx
  ON public.acitivity_logs (entitiy_type, created_at DESC);

CREATE INDEX IF NOT EXISTS acitivity_logs_created_by_type_created_at_idx
  ON public.acitivity_logs (created_by_type, created_at DESC);

-- Speed up existing per-user/school embedded tabs
CREATE INDEX IF NOT EXISTS acitivity_logs_student_id_created_at_idx
  ON public.acitivity_logs (student_id, created_at DESC)
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS acitivity_logs_school_admin_id_created_at_idx
  ON public.acitivity_logs (school_admin_id, created_at DESC)
  WHERE school_admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS acitivity_logs_admin_id_created_at_idx
  ON public.acitivity_logs (admin_id, created_at DESC)
  WHERE admin_id IS NOT NULL;
