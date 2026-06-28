-- Application support notes: internal (admin + advisor) or public (also school counselors).

ALTER TABLE public.application_internal_notes
    ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal'
        CHECK (visibility IN ('internal', 'public'));

ALTER TABLE public.application_internal_notes
    ADD COLUMN IF NOT EXISTS student_id uuid NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE;

UPDATE public.application_internal_notes n
SET student_id = a.student_id
FROM public.applications a
WHERE a.id = n.application_id
    AND n.student_id IS NULL;

ALTER TABLE public.application_internal_notes
    ALTER COLUMN student_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS application_internal_notes_student_created_idx
    ON public.application_internal_notes (student_id, created_at DESC);

COMMENT ON TABLE public.application_internal_notes IS
    'Notes on application support cases. Internal: platform admins and assigned advisor. Public: also visible to school counselors at the student''s school.';

DROP POLICY IF EXISTS application_internal_notes_select_school_admin_public
    ON public.application_internal_notes;

CREATE POLICY application_internal_notes_select_school_admin_public
    ON public.application_internal_notes
    FOR SELECT
    TO authenticated
    USING (
        visibility = 'public'
        AND public.current_school_admin_school_id () IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.student_profiles sp
            WHERE sp.id = application_internal_notes.student_id
                AND sp.school_id = public.current_school_admin_school_id ()
        )
    );
