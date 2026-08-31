-- Standalone payment links: amount-only, not tied to applications or students.

CREATE TABLE IF NOT EXISTS public.standalone_payments (
  id SERIAL PRIMARY KEY,
  payment_request_token TEXT NOT NULL UNIQUE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status public.payment_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  stripe_checkout_session_id TEXT,
  created_by_advisor_id UUID NOT NULL REFERENCES public.advisors(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS standalone_payments_created_by_advisor_id_idx
  ON public.standalone_payments (created_by_advisor_id);

CREATE INDEX IF NOT EXISTS standalone_payments_status_idx
  ON public.standalone_payments (status);

ALTER TABLE public.standalone_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS standalone_payments_select_admins ON public.standalone_payments;
CREATE POLICY standalone_payments_select_admins
  ON public.standalone_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admins adm
      WHERE adm.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS standalone_payments_select_own ON public.standalone_payments;
CREATE POLICY standalone_payments_select_own
  ON public.standalone_payments
  FOR SELECT
  TO authenticated
  USING (created_by_advisor_id = public.current_advisor_id());

DROP POLICY IF EXISTS standalone_payments_insert_own ON public.standalone_payments;
CREATE POLICY standalone_payments_insert_own
  ON public.standalone_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by_advisor_id = public.current_advisor_id());
