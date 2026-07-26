-- Shared lesson documents library for teachers (managed by admins).

CREATE TABLE IF NOT EXISTS public.lesson_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS lesson_documents_sort_order_idx
    ON public.lesson_documents (sort_order ASC, created_at DESC);

COMMENT ON TABLE public.lesson_documents IS
    'Admin-managed lesson files shared with all school teachers.';

ALTER TABLE public.lesson_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lesson_documents_select_authenticated ON public.lesson_documents;
CREATE POLICY lesson_documents_select_authenticated
    ON public.lesson_documents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.school_admin_profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS lesson_documents_insert_admins ON public.lesson_documents;
CREATE POLICY lesson_documents_insert_admins
    ON public.lesson_documents
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS lesson_documents_update_admins ON public.lesson_documents;
CREATE POLICY lesson_documents_update_admins
    ON public.lesson_documents
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS lesson_documents_delete_admins ON public.lesson_documents;
CREATE POLICY lesson_documents_delete_admins
    ON public.lesson_documents
    FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Private storage bucket for lesson files (access via signed URLs).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lesson-documents',
    'lesson-documents',
    false,
    20971520,
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
    ]::text[]
)
ON CONFLICT (id) DO NOTHING;
