-- Stripe subscription fields for self-serve funnel students.

CREATE TYPE public.student_subscription_status AS ENUM (
  'none',
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused'
);

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status public.student_subscription_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_stripe_customer_id_key
  ON public.student_profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_stripe_subscription_id_key
  ON public.student_profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.student_profiles.subscription_status IS
  'Stripe subscription state for funnel students. none = never subscribed.';
