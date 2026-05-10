-- Internal counselor notes visible only to school admins at the student's school.

CREATE TABLE public.student_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    student_id uuid NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.school_admin_profiles (id),
    note_type text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX student_notes_student_created_idx ON public.student_notes (student_id, created_at DESC);

ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_notes_select_school_admin_same_school ON public.student_notes;
CREATE POLICY student_notes_select_school_admin_same_school
    ON public.student_notes
    FOR SELECT
    TO authenticated
    USING (
        public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE sp.id = student_notes.student_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

DROP POLICY IF EXISTS student_notes_insert_school_admin_same_school ON public.student_notes;
CREATE POLICY student_notes_insert_school_admin_same_school
    ON public.student_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = (SELECT auth.uid ())
            AND public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE sp.id = student_notes.student_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

GRANT SELECT, INSERT ON public.student_notes TO authenticated;
