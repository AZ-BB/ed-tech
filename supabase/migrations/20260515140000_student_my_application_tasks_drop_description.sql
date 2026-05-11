-- Drop task `description`; keep text in `notes` first.

UPDATE public.student_my_application_tasks
SET notes = CASE
    WHEN description IS NULL OR btrim(description) = '' THEN notes
    WHEN notes IS NULL OR btrim(notes) = '' THEN btrim(description)
    ELSE btrim(notes) || E'\n\n' || btrim(description)
END
WHERE description IS NOT NULL AND btrim(description) <> '';

ALTER TABLE public.student_my_application_tasks
    DROP COLUMN IF EXISTS description;
