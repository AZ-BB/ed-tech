-- Checkout mode for standalone quick payment links: custom embedded page or Stripe hosted checkout.

ALTER TABLE public.standalone_payments
  ADD COLUMN IF NOT EXISTS checkout_mode TEXT NOT NULL DEFAULT 'custom'
  CHECK (checkout_mode IN ('custom', 'hosted'));
