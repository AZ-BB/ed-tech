-- Allow platform admins to log counselor interactions (author is either school admin or platform admin).

ALTER TABLE public.student_counselor_interactions
    ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE public.student_counselor_interactions
    ADD COLUMN IF NOT EXISTS platform_admin_id uuid REFERENCES public.admins (id);

ALTER TABLE public.student_counselor_interactions
    DROP CONSTRAINT IF EXISTS student_counselor_interactions_author_xor_check;

ALTER TABLE public.student_counselor_interactions
    ADD CONSTRAINT student_counselor_interactions_author_xor_check CHECK (
        (author_id IS NOT NULL AND platform_admin_id IS NULL)
        OR (author_id IS NULL AND platform_admin_id IS NOT NULL)
    );

DROP POLICY IF EXISTS student_counselor_interactions_select_admins ON public.student_counselor_interactions;

CREATE POLICY student_counselor_interactions_select_admins
    ON public.student_counselor_interactions
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

DROP POLICY IF EXISTS student_counselor_interactions_insert_admins ON public.student_counselor_interactions;

CREATE POLICY student_counselor_interactions_insert_admins
    ON public.student_counselor_interactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        platform_admin_id = auth.uid ()
        AND EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ())
        AND EXISTS (
            SELECT 1
            FROM public.student_profiles sp
            WHERE sp.id = student_counselor_interactions.student_id
        )
    );
