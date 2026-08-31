-- Admin-managed multi-currency pricing for student Stripe products.

CREATE TABLE public.stripe_student_products (
  product_key TEXT PRIMARY KEY CHECK (
    product_key IN (
      'individual_signup',
      'funnel_subscription',
      'custom_subscription'
    )
  ),
  stripe_product_id TEXT NOT NULL,
  stripe_price_id TEXT,
  label TEXT NOT NULL,
  billing_mode TEXT NOT NULL CHECK (billing_mode IN ('one_time', 'subscription')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stripe_student_product_currencies (
  id SERIAL PRIMARY KEY,
  product_key TEXT NOT NULL REFERENCES public.stripe_student_products (product_key) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (char_length(currency) = 3),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_key, currency)
);

CREATE INDEX stripe_student_product_currencies_product_key_idx
  ON public.stripe_student_product_currencies (product_key);

COMMENT ON TABLE public.stripe_student_products IS
  'Stripe Price IDs and metadata for student signup/subscription products.';
COMMENT ON TABLE public.stripe_student_product_currencies IS
  'Per-currency amounts (Stripe smallest unit) for each student Stripe product.';

INSERT INTO public.stripe_student_products (product_key, stripe_product_id, stripe_price_id, label, billing_mode)
VALUES
  ('individual_signup', 'prod_UzJJARAuV1bUeX', NULL, 'Individual signup fee', 'one_time'),
  ('funnel_subscription', 'prod_V2aJchKc8HZwig', NULL, 'Funnel monthly subscription', 'subscription'),
  ('custom_subscription', 'prod_Uvp7Go1v3eOl3O', NULL, 'Custom monthly subscription', 'subscription');

-- Individual signup fee (one-time, AED 99 + regional currency options).
INSERT INTO public.stripe_student_product_currencies (product_key, currency, amount_minor)
VALUES
  ('individual_signup', 'AED', 9900),   -- AED 99
  ('individual_signup', 'BHD', 10000),  -- BHD 10.000
  ('individual_signup', 'EGP', 138000), -- EGP 1,380.00
  ('individual_signup', 'JOD', 19000),  -- JOD 19.000
  ('individual_signup', 'KWD', 8300),   -- KWD 8.300
  ('individual_signup', 'OMR', 10000),  -- OMR 10.000
  ('individual_signup', 'QAR', 10000),  -- QAR 100.00
  ('individual_signup', 'USD', 2700);   -- USD 27.00

-- Custom monthly subscription (AED 40/month + regional currency options).
INSERT INTO public.stripe_student_product_currencies (product_key, currency, amount_minor)
VALUES
  ('custom_subscription', 'AED', 4000),      -- AED 40
  ('custom_subscription', 'BHD', 4000),      -- BHD 4.000
  ('custom_subscription', 'EGP', 55000),     -- EGP 550.00
  ('custom_subscription', 'KWD', 3500),      -- KWD 3.500
  ('custom_subscription', 'LBP', 97500000),  -- LBP 975,000.00
  ('custom_subscription', 'OMR', 4200),      -- OMR 4.200
  ('custom_subscription', 'QAR', 4000),      -- QAR 40.00
  ('custom_subscription', 'SAR', 4100),      -- SAR 41.00
  ('custom_subscription', 'USD', 1100);      -- USD 11.00

-- Funnel monthly subscription (AED 39/month + regional currency options).
INSERT INTO public.stripe_student_product_currencies (product_key, currency, amount_minor)
VALUES
  ('funnel_subscription', 'AED', 3900),
  ('funnel_subscription', 'BHD', 4000),
  ('funnel_subscription', 'EGP', 55000),
  ('funnel_subscription', 'JOD', 7500),
  ('funnel_subscription', 'LBP', 95000000),
  ('funnel_subscription', 'OMR', 4000),
  ('funnel_subscription', 'QAR', 3900),
  ('funnel_subscription', 'SAR', 4000),
  ('funnel_subscription', 'USD', 1100),
  ('funnel_subscription', 'YER', 1700000);

ALTER TABLE public.stripe_student_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_student_product_currencies ENABLE ROW LEVEL SECURITY;
