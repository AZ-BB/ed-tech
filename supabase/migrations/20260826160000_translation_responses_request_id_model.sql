-- Group multiple translation API calls from one admin action; store model as a first-class column.
ALTER TABLE public.translation_responses
  ADD COLUMN IF NOT EXISTS request_id UUID,
  ADD COLUMN IF NOT EXISTS model TEXT;

CREATE INDEX IF NOT EXISTS translation_responses_request_id_idx
  ON public.translation_responses (request_id, created_at DESC)
  WHERE request_id IS NOT NULL;

COMMENT ON COLUMN public.translation_responses.request_id IS
  'Shared id for all API calls belonging to one admin translate action.';

COMMENT ON COLUMN public.translation_responses.model IS
  'OpenAI (or other) model used for this translation call.';
