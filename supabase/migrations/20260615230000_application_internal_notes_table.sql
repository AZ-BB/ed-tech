-- Multiple internal notes per application (admins + assigned advisors only).

CREATE TABLE public.application_internal_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id integer NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    author_user_id uuid NULL,
    author_role text NOT NULL CHECK (author_role IN ('admin', 'advisor')),
    author_name text NOT NULL,
    content text NOT NULL CHECK (btrim(content) <> ''),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX application_internal_notes_application_created_idx
    ON public.application_internal_notes (application_id, created_at DESC);

COMMENT ON TABLE public.application_internal_notes IS
    'Staff-only notes on application support cases; visible to platform admins and the assigned advisor.';

-- Migrate legacy single-field notes.
INSERT INTO public.application_internal_notes (
    application_id,
    author_user_id,
    author_role,
    author_name,
    content,
    created_at
)
SELECT
    a.id,
    NULL,
    'admin',
    'Imported',
    btrim(a.internal_notes),
    COALESCE(a.updated_at, a.created_at, CURRENT_TIMESTAMP)
FROM public.applications a
WHERE a.internal_notes IS NOT NULL
    AND btrim(a.internal_notes) <> '';

ALTER TABLE public.applications
    DROP COLUMN IF EXISTS internal_notes;

ALTER TABLE public.application_internal_notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.application_internal_notes TO authenticated;

DROP POLICY IF EXISTS application_internal_notes_select_admins ON public.application_internal_notes;
CREATE POLICY application_internal_notes_select_admins
    ON public.application_internal_notes
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_internal_notes_insert_admins ON public.application_internal_notes;
CREATE POLICY application_internal_notes_insert_admins
    ON public.application_internal_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        AND author_user_id = auth.uid()
        AND author_role = 'admin'
    );

DROP POLICY IF EXISTS application_internal_notes_select_advisors ON public.application_internal_notes;
CREATE POLICY application_internal_notes_select_advisors
    ON public.application_internal_notes
    FOR SELECT
    TO authenticated
    USING (public.advisor_can_read_application(application_id));

DROP POLICY IF EXISTS application_internal_notes_insert_advisors ON public.application_internal_notes;
CREATE POLICY application_internal_notes_insert_advisors
    ON public.application_internal_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.advisor_can_read_application(application_id)
        AND author_user_id = auth.uid()
        AND author_role = 'advisor'
    );
