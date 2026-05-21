-- External teacher submission via magic link
ALTER TABLE public.student_my_application_recommendations
    ADD COLUMN IF NOT EXISTS submit_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    ADD COLUMN IF NOT EXISTS submitter_notes TEXT,
    ADD COLUMN IF NOT EXISTS letter_storage_path TEXT,
    ADD COLUMN IF NOT EXISTS letter_file_name TEXT;

CREATE INDEX IF NOT EXISTS student_my_application_recommendations_submit_token_idx
    ON public.student_my_application_recommendations (submit_token);
