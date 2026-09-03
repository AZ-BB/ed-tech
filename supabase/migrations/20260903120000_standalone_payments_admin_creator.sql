-- Allow admins (not only advisors) to create standalone payment links.

ALTER TABLE public.standalone_payments
  ALTER COLUMN created_by_advisor_id DROP NOT NULL;

ALTER TABLE public.standalone_payments
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES public.admins(id);

CREATE INDEX IF NOT EXISTS standalone_payments_created_by_admin_id_idx
  ON public.standalone_payments (created_by_admin_id);

ALTER TABLE public.standalone_payments
  DROP CONSTRAINT IF EXISTS standalone_payments_creator_xor;

ALTER TABLE public.standalone_payments
  ADD CONSTRAINT standalone_payments_creator_xor CHECK (
    (
      created_by_advisor_id IS NOT NULL
      AND created_by_admin_id IS NULL
    )
    OR (
      created_by_advisor_id IS NULL
      AND created_by_admin_id IS NOT NULL
    )
  );
