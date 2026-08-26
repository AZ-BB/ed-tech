-- Allow numeric major/program ids (and other non-UUID entity keys) in audit logs.
ALTER TABLE public.translation_responses
  ALTER COLUMN entity_id TYPE TEXT USING entity_id::text;

COMMENT ON COLUMN public.translation_responses.entity_id IS
  'Entity identifier as text (university UUID, or major/program numeric id as string).';
