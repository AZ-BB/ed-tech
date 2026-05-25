-- Replace auto credit renewal cron with subscription expiry + manual renewal RPC.

-- Drop old cron job
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
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unschedule skipped: %', SQLERRM;
END $$;

DROP FUNCTION IF EXISTS public.run_school_yearly_credit_renewals ();

COMMENT ON COLUMN public.schools.renewal_date IS
  'Next renewal date (DATE, evaluated in UTC by cron). Past this date, subscription_status is set to INACTIVE.';

COMMENT ON COLUMN public.schools.subscription_status IS
  'ACTIVE while subscription is current; set to INACTIVE by cron when renewal_date passes. Renewed manually by platform admins.';

-- Daily expiry: mark overdue ACTIVE subscriptions as INACTIVE
CREATE OR REPLACE FUNCTION public.run_school_subscription_expiry ()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date;
  n int;
BEGIN
  UPDATE public.schools
  SET
    subscription_status = 'INACTIVE'::public.school_subscription_status,
    updated_at = now()
  WHERE
    subscription_status = 'ACTIVE'::public.school_subscription_status
    AND renewal_date IS NOT NULL
    AND renewal_date <= v_today;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.run_school_subscription_expiry () FROM PUBLIC;

COMMENT ON FUNCTION public.run_school_subscription_expiry () IS
  'Daily pg_cron: for ACTIVE schools past renewal_date, set subscription_status to INACTIVE. UTC dates.';

-- Manual renewal for a single school (platform admin via service role)
CREATE OR REPLACE FUNCTION public.renew_school_subscription (p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date;
  r RECORD;
  plan_amt int;
  next_renewal date;
BEGIN
  SELECT
    id,
    subscription_status,
    yearly_credit_plan,
    renewal_date
  INTO r
  FROM public.schools
  WHERE id = p_school_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'School not found.';
  END IF;

  IF r.subscription_status <> 'INACTIVE'::public.school_subscription_status THEN
    RAISE EXCEPTION 'Subscription is already active.';
  END IF;

  IF r.yearly_credit_plan IS NULL THEN
    RAISE EXCEPTION 'Yearly credit plan is not configured for this school.';
  END IF;

  IF r.renewal_date IS NULL THEN
    RAISE EXCEPTION 'Renewal date is not configured for this school.';
  END IF;

  plan_amt := r.yearly_credit_plan;
  next_renewal := (GREATEST(r.renewal_date, v_today) + interval '1 year')::date;

  UPDATE public.schools
  SET
    credit_pool = plan_amt,
    renewal_date = next_renewal,
    subscription_status = 'ACTIVE'::public.school_subscription_status,
    updated_at = now()
  WHERE
    id = p_school_id;

  INSERT INTO public.school_recharge_history (school_id, amount, kind)
    VALUES (p_school_id, plan_amt, 'YEARLY_SUB'::public.school_recharge_kind);
END;
$$;

REVOKE ALL ON FUNCTION public.renew_school_subscription (uuid) FROM PUBLIC;

COMMENT ON FUNCTION public.renew_school_subscription (uuid) IS
  'Manual renewal: for INACTIVE schools, reset credit_pool to yearly_credit_plan, log YEARLY_SUB, advance renewal_date, set ACTIVE.';

-- Schedule new cron job
DO $$
DECLARE
  j RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR j IN
      SELECT jobid FROM cron.job WHERE jobname = 'school-subscription-expiry'
    LOOP
      PERFORM cron.unschedule(j.jobid);
    END LOOP;
    PERFORM cron.schedule(
      'school-subscription-expiry',
      '2 5 * * *',
      'SELECT public.run_school_subscription_expiry();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;
