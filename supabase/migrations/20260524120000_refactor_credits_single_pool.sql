-- Refactor credits: single school pool, student wallet balances, guarded defaults.

-- Merge extra credits into main pool, then drop extra_credits.
UPDATE public.schools
SET
  credit_pool = COALESCE(credit_pool, 0) + COALESCE(extra_credits, 0),
  updated_at = now()
WHERE extra_credits IS NOT NULL
  AND extra_credits <> 0;

UPDATE public.schools
SET credit_pool = COALESCE(credit_pool, 0)
WHERE credit_pool IS NULL;

ALTER TABLE public.schools
DROP COLUMN IF EXISTS extra_credits;

COMMENT ON COLUMN public.schools.credit_pool IS
  'Single assignable credit pool for the school. Deducted when admins assign credits to students.';

COMMENT ON COLUMN public.schools.default_advisor_credit_limit IS
  'Platform-managed default advisor credits granted to each student at signup (not deducted from credit_pool).';

COMMENT ON COLUMN public.schools.default_ambasador_credit_limit IS
  'Platform-managed default ambassador credits granted to each student at signup (not deducted from credit_pool).';

COMMENT ON COLUMN public.student_profiles.advisor_credit_limit IS
  'Remaining advisor session credits for this student. Seeded from school default at signup; decremented on booking.';

COMMENT ON COLUMN public.student_profiles.ambassador_credit_limit IS
  'Remaining ambassador session credits for this student. Seeded from school default at signup; decremented on booking.';

-- Convert legacy per-student limits (caps) into remaining wallet balances using ledger usage.
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
balances AS (
  SELECT
    sp.id AS student_id,
    GREATEST(
      0,
      COALESCE(sp.advisor_credit_limit, s.default_advisor_credit_limit, 0)
        - COALESCE(u.advisor_used_net, 0)
    ) AS advisor_remaining,
    GREATEST(
      0,
      COALESCE(sp.ambassador_credit_limit, s.default_ambasador_credit_limit, 0)
        - COALESCE(u.ambassador_used_net, 0)
    ) AS ambassador_remaining
  FROM public.student_profiles sp
  INNER JOIN public.schools s ON s.id = sp.school_id
  LEFT JOIN usage u ON u.student_id = sp.id
)
UPDATE public.student_profiles sp
SET
  advisor_credit_limit = b.advisor_remaining,
  ambassador_credit_limit = b.ambassador_remaining,
  updated_at = now()
FROM balances b
WHERE sp.id = b.student_id;

-- Students cannot update their own credit balances.
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_student_profiles_credit_columns ON public.student_profiles;

CREATE TRIGGER trg_guard_student_profiles_credit_columns
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_student_profiles_credit_columns ();

-- School admins cannot update platform-managed default credit limits.
CREATE OR REPLACE FUNCTION public.guard_schools_default_credit_limits ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.current_school_admin_school_id () IS NOT NULL
    AND public.current_school_admin_school_id () = OLD.id
    AND (
      NEW.default_advisor_credit_limit IS DISTINCT FROM OLD.default_advisor_credit_limit
      OR NEW.default_ambasador_credit_limit IS DISTINCT FROM OLD.default_ambasador_credit_limit
    )
  THEN
    RAISE EXCEPTION 'School admins cannot update default credit limits.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_schools_default_credit_limits ON public.schools;

CREATE TRIGGER trg_guard_schools_default_credit_limits
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_schools_default_credit_limits ();
