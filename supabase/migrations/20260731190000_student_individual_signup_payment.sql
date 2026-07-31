-- One-time signup payment wall for individually-signed-up students.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS has_paid_signup_fee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signup_fee_paid_at timestamptz;

COMMENT ON COLUMN public.student_profiles.has_paid_signup_fee IS
  'One-time signup payment wall status for individually-signed-up students.';

COMMENT ON COLUMN public.student_profiles.signup_fee_paid_at IS
  'Timestamp when the individual signup fee was paid via Stripe.';
