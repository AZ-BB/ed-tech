-- School subscription, yearly credit renewal, recharge ledger typing, student credit types, RLS, pg_cron.

-- Enums
DO $$
BEGIN
  CREATE TYPE public.school_subscription_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.school_recharge_kind AS ENUM ('YEARLY_SUB', 'EXTRA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Extend ledger type for pool draws (lowercase to match advisor/ambassador)
ALTER TYPE public.student_credits_type ADD VALUE IF NOT EXISTS 'base_credit';
ALTER TYPE public.student_credits_type ADD VALUE IF NOT EXISTS 'extra_credits';

-- Schools: plan & billing fields
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS yearly_credit_plan INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS renewal_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS extra_credits INTEGER DEFAULT NULL;

ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS subscription_status public.school_subscription_status NOT NULL DEFAULT 'ACTIVE'::public.school_subscription_status;

COMMENT ON COLUMN public.schools.yearly_credit_plan IS
  'Annual main pool top-up amount applied on renewal (credit_pool reset). UTC calendar renewal_date.';
COMMENT ON COLUMN public.schools.renewal_date IS
  'Next renewal date (DATE, evaluated in UTC by cron).';
COMMENT ON COLUMN public.schools.extra_credits IS
  'Separate extra/bonus pool balance; not reset by yearly renewal job.';
COMMENT ON COLUMN public.schools.subscription_status IS
  'ACTIVE schools receive yearly credit_pool renewals; INACTIVE skipped.';

-- Recharge history kind
ALTER TABLE public.school_recharge_history
ADD COLUMN IF NOT EXISTS kind public.school_recharge_kind NOT NULL DEFAULT 'EXTRA';

COMMENT ON COLUMN public.school_recharge_history.kind IS
  'YEARLY_SUB: annual pool top-up from cron; EXTRA: manual or other top-up.';

-- RLS: school admins read their school recharge rows only
ALTER TABLE public.school_recharge_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.school_recharge_history TO authenticated;

DROP POLICY IF EXISTS school_recharge_history_select_school_admin_same_school
ON public.school_recharge_history;

CREATE POLICY school_recharge_history_select_school_admin_same_school
  ON public.school_recharge_history
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id () IS NOT NULL
    AND school_id = public.current_school_admin_school_id ()
  );

DROP POLICY IF EXISTS school_recharge_history_select_admins ON public.school_recharge_history;

CREATE POLICY school_recharge_history_select_admins
  ON public.school_recharge_history
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

-- Yearly renewal (SECURITY DEFINER: inserts history + updates schools under RLS)
CREATE OR REPLACE FUNCTION public.run_school_yearly_credit_renewals ()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date;
  n int := 0;
  r RECORD;
  d date;
  sid uuid;
  plan_amt int;
BEGIN
  FOR r IN
    SELECT id, yearly_credit_plan, renewal_date
    FROM public.schools
    WHERE subscription_status = 'ACTIVE'::public.school_subscription_status
      AND yearly_credit_plan IS NOT NULL
      AND renewal_date IS NOT NULL
      AND renewal_date <= v_today
    FOR UPDATE
  LOOP
    sid := r.id;
    plan_amt := r.yearly_credit_plan;
    d := r.renewal_date;

    WHILE d <= v_today LOOP
      UPDATE public.schools
      SET
        credit_pool = plan_amt,
        updated_at = now()
      WHERE
        id = sid;

      INSERT INTO public.school_recharge_history(school_id, amount, kind)
        VALUES (sid, plan_amt, 'YEARLY_SUB'::public.school_recharge_kind);

      d := (d + interval '1 year')::date;
      n := n + 1;
    END LOOP;

    UPDATE public.schools
    SET
      renewal_date = d,
      updated_at = now()
    WHERE
      id = sid;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.run_school_yearly_credit_renewals () FROM PUBLIC;

COMMENT ON FUNCTION public.run_school_yearly_credit_renewals () IS
  'Daily pg_cron: for ACTIVE schools past renewal_date, reset credit_pool to yearly_credit_plan, log YEARLY_SUB rows, advance renewal_date. UTC dates.';

-- pg_cron (enable + schedule; hosted Supabase may require enabling extension in dashboard first)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
DECLARE
  j RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR j IN
      SELECT jobid FROM cron.job WHERE jobname = 'school-yearly-credit-renewal'
    LOOP
      PERFORM cron.unschedule(j.jobid);
    END LOOP;
    PERFORM cron.schedule(
      'school-yearly-credit-renewal',
      '2 5 * * *',
      'SELECT public.run_school_yearly_credit_renewals();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;
