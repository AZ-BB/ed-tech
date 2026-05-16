-- Backfill existing students; require grade 9–12 on student_profiles.

UPDATE public.student_profiles
SET grade = 'Grade 12'
WHERE grade IS NULL;

ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_grade_check
  CHECK (grade IN ('Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'));

ALTER TABLE public.student_profiles
  ALTER COLUMN grade SET NOT NULL;
