-- Payment request due date and package snapshot fields.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS requested_plan_id INTEGER REFERENCES public.applications_plans(id),
  ADD COLUMN IF NOT EXISTS custom_universities_count INTEGER;

COMMENT ON COLUMN public.payments.due_date IS
  'Deadline for completing this payment request; overdue pending rows are marked failed.';

COMMENT ON COLUMN public.payments.requested_plan_id IS
  'Plan selected when the payment request was sent (audit snapshot).';

COMMENT ON COLUMN public.payments.custom_universities_count IS
  'Universities count for custom plans at send time (audit snapshot).';
