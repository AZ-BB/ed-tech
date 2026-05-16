-- Remove assigned counselor from student profiles and pending school invites.

DROP INDEX IF EXISTS public.student_profiles_counselor_school_admin_id_idx;
DROP INDEX IF EXISTS public.school_students_counselor_school_admin_id_idx;

ALTER TABLE public.student_profiles
  DROP COLUMN IF EXISTS counselor_school_admin_id;

ALTER TABLE public.school_students
  DROP COLUMN IF EXISTS counselor_school_admin_id;
