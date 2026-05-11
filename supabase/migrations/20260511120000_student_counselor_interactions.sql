-- Counselor interaction log (meetings, calls, etc.) for school reporting — school admins at the student's school only.

CREATE TABLE public.student_counselor_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    student_id uuid NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.school_admin_profiles (id),
    interaction_kind text NOT NULL CHECK (
        interaction_kind IN ('meeting', 'call', 'email', 'parent', 'intervention')
    ),
    occurred_on date NOT NULL,
    duration_minutes integer NULL CHECK (
        duration_minutes IS NULL OR duration_minutes >= 0
    ),
    outcome text NOT NULL CHECK (
        outcome IN (
            'Productive',
            'Follow-up needed',
            'Concern raised',
            'Resolved',
            'No-show'
        )
    ),
    notes text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX student_counselor_interactions_student_occurred_created_idx ON public.student_counselor_interactions (
    student_id,
    occurred_on DESC,
    created_at DESC
);

ALTER TABLE public.student_counselor_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_counselor_interactions_select_school_admin_same_school ON public.student_counselor_interactions;

CREATE POLICY student_counselor_interactions_select_school_admin_same_school
    ON public.student_counselor_interactions
    FOR SELECT
    TO authenticated
    USING (
        public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE sp.id = student_counselor_interactions.student_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

DROP POLICY IF EXISTS student_counselor_interactions_insert_school_admin_same_school ON public.student_counselor_interactions;

CREATE POLICY student_counselor_interactions_insert_school_admin_same_school
    ON public.student_counselor_interactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = (SELECT auth.uid ())
            AND public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE sp.id = student_counselor_interactions.student_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

GRANT SELECT, INSERT ON public.student_counselor_interactions TO authenticated;
