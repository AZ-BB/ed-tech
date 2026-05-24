-- Snapshot school default credits on each student profile at signup (immutable after registration).

ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS signup_advisor_credit_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS signup_ambassador_credit_limit INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.student_profiles.signup_advisor_credit_limit IS
  'Advisor credits copied from the school default at signup; never changed afterward.';

COMMENT ON COLUMN public.student_profiles.signup_ambassador_credit_limit IS
  'Ambassador credits copied from the school default at signup; never changed afterward.';

-- Best-effort backfill for students registered before this column existed.
WITH usage AS (
  SELECT
    student_id,
    SUM(
      CASE
        WHEN type = 'advisor'::public.student_credits_type THEN
          CASE
            WHEN status = 'used'::public.student_credits_status THEN amount
            WHEN status = 'refunded'::public.student_credits_status THEN -amount
            ELSE 0
          END
        ELSE 0
      END
    ) AS advisor_used_net,
    SUM(
      CASE
        WHEN type = 'ambassador'::public.student_credits_type THEN
          CASE
            WHEN status = 'used'::public.student_credits_status THEN amount
            WHEN status = 'refunded'::public.student_credits_status THEN -amount
            ELSE 0
          END
        ELSE 0
      END
    ) AS ambassador_used_net
  FROM public.student_credits_history
  GROUP BY student_id
),
snapshots AS (
  SELECT
    sp.id AS student_id,
    GREATEST(
      0,
      COALESCE(sp.advisor_credit_limit, 0) + COALESCE(u.advisor_used_net, 0)
    ) AS signup_advisor,
    GREATEST(
      0,
      COALESCE(sp.ambassador_credit_limit, 0) + COALESCE(u.ambassador_used_net, 0)
    ) AS signup_ambassador
  FROM public.student_profiles sp
  LEFT JOIN usage u ON u.student_id = sp.id
  WHERE
    sp.signup_advisor_credit_limit IS NULL
    OR sp.signup_ambassador_credit_limit IS NULL
)
UPDATE public.student_profiles sp
SET
  signup_advisor_credit_limit = COALESCE(
    sp.signup_advisor_credit_limit,
    s.signup_advisor
  ),
  signup_ambassador_credit_limit = COALESCE(
    sp.signup_ambassador_credit_limit,
    s.signup_ambassador
  ),
  updated_at = now()
FROM snapshots s
WHERE sp.id = s.student_id;

CREATE OR REPLACE FUNCTION public.guard_student_profiles_credit_columns ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid () IS NOT NULL
    AND auth.uid () = OLD.id
    AND (
      NEW.advisor_credit_limit IS DISTINCT FROM OLD.advisor_credit_limit
      OR NEW.ambassador_credit_limit IS DISTINCT FROM OLD.ambassador_credit_limit
    )
  THEN
    RAISE EXCEPTION 'Students cannot update their credit balances.';
  END IF;

  IF auth.uid () IS NOT NULL
    AND (
      NEW.signup_advisor_credit_limit IS DISTINCT FROM OLD.signup_advisor_credit_limit
      OR NEW.signup_ambassador_credit_limit IS DISTINCT FROM OLD.signup_ambassador_credit_limit
    )
  THEN
    RAISE EXCEPTION 'Signup credit defaults cannot be changed after registration.';
  END IF;

  RETURN NEW;
END;
$$;
