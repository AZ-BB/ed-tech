-- Remove auto-created primary "other" checklist rows (empty placeholders).
-- Students add extras via "Add another document" (`other:<uuid>` slots only).

DELETE FROM public.student_my_application_documents
WHERE slot_key = 'other'
  AND (storage_path IS NULL OR btrim(storage_path) = '');

UPDATE public.student_my_application_documents
SET description = NULL
WHERE description =
  'Any extra file for your counselor — certificates, medical forms, etc. You can rename this row to describe what you upload.';
