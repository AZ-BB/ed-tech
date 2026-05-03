-- Extra fields for My Applications UI (essays + recommendations) to match product mockups.

ALTER TABLE public.student_my_application_essays
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS requirement_note TEXT,
    ADD COLUMN IF NOT EXISTS counselor_comment_preview TEXT;

ALTER TABLE public.student_my_application_recommendations
    ADD COLUMN IF NOT EXISTS teacher_subject TEXT;

COMMENT ON COLUMN public.student_my_application_essays.requirement_note IS 'e.g. Required for a specific supplemental';
COMMENT ON COLUMN public.student_my_application_essays.counselor_comment_preview IS 'Short display line, e.g. who commented';
COMMENT ON COLUMN public.student_my_application_recommendations.teacher_subject IS 'e.g. Mathematics — shown after teacher name';
