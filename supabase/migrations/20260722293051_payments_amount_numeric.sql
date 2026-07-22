-- Payment amounts are entered in AED with up to 2 decimal places (see payment request UI step=0.01).
ALTER TABLE public.payments
  ALTER COLUMN amount TYPE NUMERIC(12, 2)
  USING amount::numeric(12, 2);

COMMENT ON COLUMN public.payments.amount IS
  'Payment amount in AED, up to 2 decimal places.';
