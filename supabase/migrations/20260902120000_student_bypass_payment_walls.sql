-- Allow admin-provisioned students to skip signup fee and subscription payment walls.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS bypass_payment_walls boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.student_profiles.bypass_payment_walls IS
  'When true, the student skips the individual signup fee wall and funnel subscription prompts.';
