-- Optional longer context for counselor-assigned tasks (school + student portals).
ALTER TABLE public.student_my_application_tasks
    ADD COLUMN IF NOT EXISTS description text;
