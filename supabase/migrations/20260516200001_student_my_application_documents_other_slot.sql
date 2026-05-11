-- Optional "Other" document slot for miscellaneous student uploads (My Applications).

INSERT INTO public.student_my_application_documents (
  student_id,
  slot_key,
  display_name,
  description,
  status
)
SELECT
  sp.id,
  'other',
  'Other',
  'Any extra file for your counselor — certificates, medical forms, etc. You can rename this row to describe what you upload.',
  'missing'
FROM public.student_profiles sp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.student_my_application_documents d
  WHERE d.student_id = sp.id
    AND d.slot_key = 'other'
);
