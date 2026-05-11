-- Essays: metadata + file fields, three-way status, counselor comments visible to students.
-- School admins can insert/update essays for students at their school (mirrors documents pattern).

-- ---------------------------------------------------------------------------
-- Extend student_my_application_essays
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_my_application_essays
    ADD COLUMN IF NOT EXISTS essay_prompt TEXT,
    ADD COLUMN IF NOT EXISTS deadline DATE,
    ADD COLUMN IF NOT EXISTS instructions_note TEXT,
    ADD COLUMN IF NOT EXISTS file_storage_path TEXT,
    ADD COLUMN IF NOT EXISTS file_name TEXT,
    ADD COLUMN IF NOT EXISTS file_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.student_my_application_essays.essay_prompt IS 'Full essay question / prompt text';
COMMENT ON COLUMN public.student_my_application_essays.instructions_note IS 'Shared notes or instructions (create modal); distinct from threaded comments';
COMMENT ON COLUMN public.student_my_application_essays.file_storage_path IS 'Private bucket student-my-applications path; segment 1 = student_id';

UPDATE public.student_my_application_essays
SET status = CASE
        WHEN status = 'drafting' THEN 'in_progress'
        WHEN status = 'in_review' THEN 'ready_for_review'
        WHEN status = 'complete' THEN 'ready_for_review'
        ELSE status
    END
WHERE status IN ('drafting', 'in_review', 'complete');

ALTER TABLE public.student_my_application_essays
    DROP COLUMN IF EXISTS comment_count,
    DROP COLUMN IF EXISTS counselor_comment_preview;

ALTER TABLE public.student_my_application_essays
    DROP CONSTRAINT IF EXISTS student_my_application_essays_status_check;

ALTER TABLE public.student_my_application_essays
    ADD CONSTRAINT student_my_application_essays_status_check CHECK (
        status IN ('not_started', 'in_progress', 'ready_for_review')
    );

-- ---------------------------------------------------------------------------
-- Essay comments (school admins; visible to owning student + same-school admins + platform admins)
-- ---------------------------------------------------------------------------
CREATE TABLE public.student_my_application_essay_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    essay_id uuid NOT NULL REFERENCES public.student_my_application_essays (id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.school_admin_profiles (id) ON DELETE CASCADE,
    author_display_name text NOT NULL DEFAULT '',
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX student_my_application_essay_comments_essay_created_idx
    ON public.student_my_application_essay_comments (essay_id, created_at DESC);

COMMENT ON COLUMN public.student_my_application_essay_comments.author_display_name IS 'Snapshot label for UI (avoid joins)';

ALTER TABLE public.student_my_application_essay_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.student_my_application_essay_comments TO authenticated;

DROP POLICY IF EXISTS student_my_application_essay_comments_select_own_student ON public.student_my_application_essay_comments;

CREATE POLICY student_my_application_essay_comments_select_own_student
    ON public.student_my_application_essay_comments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.student_my_application_essays e
            WHERE e.id = student_my_application_essay_comments.essay_id
                AND e.student_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS student_my_application_essay_comments_select_school_admin_same_school ON public.student_my_application_essay_comments;

CREATE POLICY student_my_application_essay_comments_select_school_admin_same_school
    ON public.student_my_application_essay_comments
    FOR SELECT
    TO authenticated
    USING (
        public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_my_application_essays e
                    JOIN public.student_profiles sp ON sp.id = e.student_id
                WHERE e.id = student_my_application_essay_comments.essay_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

DROP POLICY IF EXISTS student_my_application_essay_comments_select_admins ON public.student_my_application_essay_comments;

CREATE POLICY student_my_application_essay_comments_select_admins
    ON public.student_my_application_essay_comments
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

DROP POLICY IF EXISTS student_my_application_essay_comments_insert_school_admin_same_school ON public.student_my_application_essay_comments;

CREATE POLICY student_my_application_essay_comments_insert_school_admin_same_school
    ON public.student_my_application_essay_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = auth.uid ()
            AND public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_my_application_essays e
                    JOIN public.student_profiles sp ON sp.id = e.student_id
                WHERE e.id = student_my_application_essay_comments.essay_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

DROP POLICY IF EXISTS student_my_application_essay_comments_delete_author_school_admin ON public.student_my_application_essay_comments;

CREATE POLICY student_my_application_essay_comments_delete_author_school_admin
    ON public.student_my_application_essay_comments
    FOR DELETE
    TO authenticated
    USING (
        author_id = auth.uid ()
            AND public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_my_application_essays e
                    JOIN public.student_profiles sp ON sp.id = e.student_id
                WHERE e.id = student_my_application_essay_comments.essay_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

-- ---------------------------------------------------------------------------
-- School admins: create and update essays for students at their school
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS student_my_application_essays_insert_school_admin_same_school ON public.student_my_application_essays;

CREATE POLICY student_my_application_essays_insert_school_admin_same_school
    ON public.student_my_application_essays
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE sp.id = student_my_application_essays.student_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

DROP POLICY IF EXISTS student_my_application_essays_update_school_admin_same_school ON public.student_my_application_essays;

CREATE POLICY student_my_application_essays_update_school_admin_same_school
    ON public.student_my_application_essays
    FOR UPDATE
    TO authenticated
    USING (
        public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE sp.id = student_my_application_essays.student_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    )
    WITH CHECK (
        public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE sp.id = student_my_application_essays.student_id
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

-- ---------------------------------------------------------------------------
-- Storage: counselors may upload My Applications files for students at their school (first path segment = student id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS student_my_apps_storage_insert_school_admin_same_school ON storage.objects;

CREATE POLICY student_my_apps_storage_insert_school_admin_same_school
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'student-my-applications'
            AND public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE
                    sp.id::text = (storage.foldername(name))[1]
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

DROP POLICY IF EXISTS student_my_apps_storage_update_school_admin_same_school ON storage.objects;

CREATE POLICY student_my_apps_storage_update_school_admin_same_school
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'student-my-applications'
            AND public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE
                    sp.id::text = (storage.foldername(name))[1]
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    )
    WITH CHECK (
        bucket_id = 'student-my-applications'
            AND public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE
                    sp.id::text = (storage.foldername(name))[1]
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );

DROP POLICY IF EXISTS student_my_apps_storage_delete_school_admin_same_school ON storage.objects;

CREATE POLICY student_my_apps_storage_delete_school_admin_same_school
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'student-my-applications'
            AND public.current_school_admin_school_id () IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.student_profiles sp
                WHERE
                    sp.id::text = (storage.foldername(name))[1]
                    AND sp.school_id = public.current_school_admin_school_id ()
            )
    );
