-- Optional notes on school / student application tasks (shown beside priority in UI).

ALTER TABLE public.student_my_application_tasks
    ADD COLUMN IF NOT EXISTS notes text NULL;
