-- Text-only "Predicted" document slot: school admins set `school_text_value`; students read only.

ALTER TABLE public.student_my_application_documents
ADD COLUMN IF NOT EXISTS school_text_value TEXT;

COMMENT ON COLUMN public.student_my_application_documents.school_text_value IS
  'School-entered text (e.g. predicted grades) for slot_key = predicted; students cannot update this row via RLS.';

-- Students may not modify or remove the reserved predicted slot row.
DROP POLICY IF EXISTS student_my_application_documents_update_own
  ON public.student_my_application_documents;
CREATE POLICY student_my_application_documents_update_own
  ON public.student_my_application_documents
  FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid ()
      AND slot_key IS DISTINCT FROM 'predicted'
  )
  WITH CHECK (
    student_id = auth.uid ()
      AND slot_key IS DISTINCT FROM 'predicted'
  );

DROP POLICY IF EXISTS student_my_application_documents_delete_own
  ON public.student_my_application_documents;
CREATE POLICY student_my_application_documents_delete_own
  ON public.student_my_application_documents
  FOR DELETE TO authenticated
  USING (
    student_id = auth.uid ()
      AND slot_key IS DISTINCT FROM 'predicted'
  );

DROP POLICY IF EXISTS student_my_application_documents_insert_own
  ON public.student_my_application_documents;
CREATE POLICY student_my_application_documents_insert_own
  ON public.student_my_application_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid ()
      AND slot_key IS DISTINCT FROM 'predicted'
  );

-- Copy legacy profile values into the new column where the predicted row already exists.
UPDATE public.student_my_application_documents d
SET
  school_text_value = p.predicted_grades,
  status = CASE
    WHEN p.predicted_grades IS NOT NULL AND TRIM(p.predicted_grades) <> '' THEN 'approved'
    ELSE d.status
  END,
  updated_at = CURRENT_TIMESTAMP
FROM public.student_application_profile p
WHERE d.student_id = p.student_id
  AND d.slot_key = 'predicted'
  AND (d.school_text_value IS NULL OR TRIM(COALESCE(d.school_text_value, '')) = '')
  AND p.predicted_grades IS NOT NULL
  AND TRIM(p.predicted_grades) <> '';
