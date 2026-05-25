-- Ledger rows for credits added to students by school or platform admins.

ALTER TYPE public.student_credits_status ADD VALUE IF NOT EXISTS 'added';

ALTER TABLE public.student_credits_history
  ADD COLUMN IF NOT EXISTS assigned_by_admin_id UUID DEFAULT NULL
    REFERENCES public.admins (id),
  ADD COLUMN IF NOT EXISTS assigned_by_school_admin_id UUID DEFAULT NULL
    REFERENCES public.school_admin_profiles (id);

COMMENT ON COLUMN public.student_credits_history.assigned_by_admin_id IS
  'Platform admin who added credits when status is added.';

COMMENT ON COLUMN public.student_credits_history.assigned_by_school_admin_id IS
  'School admin who added credits when status is added.';
