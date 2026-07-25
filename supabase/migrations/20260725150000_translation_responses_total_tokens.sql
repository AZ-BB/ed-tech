ALTER TABLE public.translation_responses
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER;

COMMENT ON COLUMN public.translation_responses.total_tokens IS 'Token usage reported by the Agrid workflow (data.total_tokens).';
