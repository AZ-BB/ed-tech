-- Pending invites: grade and assigned counselor; copied into student_profiles at signup.

ALTER TABLE public.school_students
  ADD COLUMN IF NOT EXISTS grade TEXT NULL;

ALTER TABLE public.school_students
  ADD COLUMN IF NOT EXISTS counselor_school_admin_id UUID NULL
    REFERENCES public.school_admin_profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS school_students_counselor_school_admin_id_idx
  ON public.school_students (counselor_school_admin_id)
  WHERE counselor_school_admin_id IS NOT NULL;
