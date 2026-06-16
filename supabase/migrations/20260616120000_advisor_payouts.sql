-- Advisor payout commission and payout records for advisor-originated payments.

ALTER TABLE public.advisors
  ADD COLUMN IF NOT EXISTS payout_percentage INTEGER NOT NULL DEFAULT 0
  CHECK (payout_percentage >= 0 AND payout_percentage <= 100);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS requested_by_type TEXT
    CHECK (requested_by_type IS NULL OR requested_by_type IN ('admin', 'advisor')),
  ADD COLUMN IF NOT EXISTS requested_by_advisor_id UUID REFERENCES public.advisors(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE public.payout_status AS ENUM ('pending', 'paid', 'canceled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.advisor_payouts (
  id SERIAL PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.advisors(id),
  payment_id INTEGER NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  application_id INTEGER NOT NULL REFERENCES public.applications(id),
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status public.payout_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS advisor_payouts_advisor_id_status_idx
  ON public.advisor_payouts (advisor_id, status);

CREATE INDEX IF NOT EXISTS advisor_payouts_application_id_idx
  ON public.advisor_payouts (application_id);

CREATE INDEX IF NOT EXISTS advisor_payouts_payment_id_idx
  ON public.advisor_payouts (payment_id);

ALTER TABLE public.advisor_payouts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- advisor_payouts — admins
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS advisor_payouts_select_admins ON public.advisor_payouts;
CREATE POLICY advisor_payouts_select_admins
  ON public.advisor_payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admins adm
      WHERE adm.id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- advisor_payouts — assigned advisor (own payouts only)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS advisor_payouts_select_own ON public.advisor_payouts;
CREATE POLICY advisor_payouts_select_own
  ON public.advisor_payouts
  FOR SELECT
  TO authenticated
  USING (advisor_id = public.current_advisor_id());
