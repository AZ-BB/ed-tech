ALTER TABLE public.translation_responses
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER;

COMMENT ON COLUMN public.translation_responses.input_tokens IS
  'Prompt/input tokens reported by the translation API usage.';

COMMENT ON COLUMN public.translation_responses.output_tokens IS
  'Completion/output tokens reported by the translation API usage.';
