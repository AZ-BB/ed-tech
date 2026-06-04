-- Assign each student to at most one school teacher (school_admin_profiles).

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS teacher_id UUID NULL
    REFERENCES public.school_admin_profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_profiles_teacher_id_idx
  ON public.student_profiles (teacher_id)
  WHERE teacher_id IS NOT NULL;

COMMENT ON COLUMN public.student_profiles.teacher_id IS
  'Assigned school teacher (school_admin_profiles). Must belong to the same school as the student.';

CREATE OR REPLACE FUNCTION public.guard_student_profiles_teacher_same_school ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_school_id UUID;
BEGIN
  IF NEW.teacher_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT sap.school_id
  INTO v_teacher_school_id
  FROM public.school_admin_profiles sap
  WHERE sap.id = NEW.teacher_id;

  IF v_teacher_school_id IS NULL THEN
    RAISE EXCEPTION 'Assigned teacher not found.';
  END IF;

  IF v_teacher_school_id IS DISTINCT FROM NEW.school_id THEN
    RAISE EXCEPTION 'Teacher must belong to the same school as the student.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_profiles_teacher_same_school_trigger ON public.student_profiles;

CREATE TRIGGER student_profiles_teacher_same_school_trigger
  BEFORE INSERT OR UPDATE OF teacher_id, school_id ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_student_profiles_teacher_same_school ();

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
    AND auth.uid () = OLD.id
    AND NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
  THEN
    RAISE EXCEPTION 'Students cannot change their assigned teacher.';
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
