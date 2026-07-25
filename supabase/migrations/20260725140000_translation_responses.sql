-- Audit log for each Agrid translation API request/response

CREATE TABLE public.translation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_text TEXT NOT NULL,
  translated_text TEXT,
  source_lang TEXT NOT NULL DEFAULT 'en',
  target_lang TEXT NOT NULL DEFAULT 'ar',
  request_body JSONB NOT NULL,
  response_body JSONB,
  http_status INTEGER,
  workflow_status TEXT,
  task_id TEXT,
  workflow_run_id TEXT,
  error_message TEXT,
  entity_type TEXT,
  entity_id UUID,
  field_key TEXT,
  requested_by UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX translation_responses_created_at_idx
  ON public.translation_responses (created_at DESC);

CREATE INDEX translation_responses_entity_idx
  ON public.translation_responses (entity_type, entity_id)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

CREATE INDEX translation_responses_requested_by_idx
  ON public.translation_responses (requested_by)
  WHERE requested_by IS NOT NULL;

COMMENT ON TABLE public.translation_responses IS 'Audit log of Agrid translation API calls (request + response payloads).';

ALTER TABLE public.translation_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translation_responses_admin_select"
  ON public.translation_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

GRANT SELECT ON public.translation_responses TO authenticated;
