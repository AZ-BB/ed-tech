ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_by UUID NULL REFERENCES public.advisors(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.student_profiles.flagged IS 'Advisor-marked follow-up flag.';
COMMENT ON COLUMN public.student_profiles.flagged_by IS 'Advisor who set flagged=true.';
