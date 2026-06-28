-- Simplify university target workflow: map legacy statuses to in_progress.

UPDATE public.application_university_targets
SET status = 'in_progress'
WHERE status IN (
  'shortlisted',
  'considering',
  'advisor_recommended',
  'documents_needed'
);

ALTER TABLE public.application_university_targets
  ALTER COLUMN status SET DEFAULT 'in_progress';
