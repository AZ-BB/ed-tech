-- Allow independent students (no school) and credit history without school_id.

ALTER TABLE public.student_profiles
  ALTER COLUMN school_id DROP NOT NULL;

ALTER TABLE public.student_credits_history
  ALTER COLUMN school_id DROP NOT NULL;

COMMENT ON COLUMN public.student_profiles.school_id IS
  'School the student belongs to. NULL for independent (platform-provisioned) students.';

COMMENT ON COLUMN public.student_credits_history.school_id IS
  'School associated with the credit event. NULL for independent students.';

-- Independent students cannot have a teacher; teachers must match school when set.
CREATE OR REPLACE FUNCTION public.guard_student_profiles_teacher_same_school ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_school_id UUID;
BEGIN
  IF NEW.school_id IS NULL THEN
    IF NEW.teacher_id IS NOT NULL THEN
      RAISE EXCEPTION 'Independent students cannot be assigned a teacher.';
    END IF;
    RETURN NEW;
  END IF;

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
