-- Optional priority and supplementary notes on internal counselor notes.

ALTER TABLE public.student_notes
    ADD COLUMN priority text NULL,
    ADD COLUMN notes text NULL;

ALTER TABLE public.student_notes
    ADD CONSTRAINT student_notes_priority_check CHECK (
        priority IS NULL
        OR priority IN ('high', 'medium', 'low')
    );
