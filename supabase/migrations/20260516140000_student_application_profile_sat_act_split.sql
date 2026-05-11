-- Separate SAT total (400–1600) and ACT composite (1–36) from legacy free-text `sat_act_scores`.
ALTER TABLE public.student_application_profile
    ADD COLUMN IF NOT EXISTS sat_score text,
    ADD COLUMN IF NOT EXISTS act_score text;

COMMENT ON COLUMN public.student_application_profile.sat_score IS 'SAT total score (400–1600).';
COMMENT ON COLUMN public.student_application_profile.act_score IS 'ACT composite (1–36).';
COMMENT ON COLUMN public.student_application_profile.sat_act_scores IS 'Legacy combined label; prefer sat_score + act_score.';
