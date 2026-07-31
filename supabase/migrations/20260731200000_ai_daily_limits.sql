-- Platform-configurable daily AI usage limits per student (empty value = unlimited).

INSERT INTO public.system (key, value)
VALUES
  ('ai_daily_limit_essay_review', ''),
  ('ai_daily_limit_university_matching', ''),
  ('ai_daily_limit_program_matching', '')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS ai_usage_student_type_created_at_idx
  ON public.ai_usage (student_id, type, created_at DESC);
