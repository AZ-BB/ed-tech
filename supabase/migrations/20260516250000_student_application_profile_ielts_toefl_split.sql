-- Separate IELTS overall band (0–9) and TOEFL iBT total (0–120) from legacy free-text `english_test_scores`.
ALTER TABLE public.student_application_profile
    ADD COLUMN IF NOT EXISTS ielts_score text,
    ADD COLUMN IF NOT EXISTS toefl_score text;

COMMENT ON COLUMN public.student_application_profile.ielts_score IS 'IELTS overall band (0–9, half-band steps).';
COMMENT ON COLUMN public.student_application_profile.toefl_score IS 'TOEFL iBT total score (0–120).';
COMMENT ON COLUMN public.student_application_profile.english_test_scores IS 'Legacy combined label; prefer ielts_score + toefl_score.';
