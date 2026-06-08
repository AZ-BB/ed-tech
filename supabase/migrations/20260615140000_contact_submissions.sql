DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_submission_status') THEN
        CREATE TYPE public.contact_submission_status AS ENUM ('new', 'read', 'archived');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    subject text,
    message text NOT NULL,
    status public.contact_submission_status NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
    ON public.contact_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS contact_submissions_status_created_at_idx
    ON public.contact_submissions (status, created_at DESC);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_submissions_select_admins ON public.contact_submissions;
CREATE POLICY contact_submissions_select_admins
    ON public.contact_submissions
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS contact_submissions_update_admins ON public.contact_submissions;
CREATE POLICY contact_submissions_update_admins
    ON public.contact_submissions
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS contact_submissions_delete_admins ON public.contact_submissions;
CREATE POLICY contact_submissions_delete_admins
    ON public.contact_submissions
    FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

GRANT SELECT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
