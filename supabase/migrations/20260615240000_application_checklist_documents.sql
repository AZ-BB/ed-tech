-- Per-application document checklist (staff request / review workflow).

CREATE TABLE public.application_checklist_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id integer NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    slot_key text NOT NULL,
    display_name text NOT NULL,
    status text NOT NULL DEFAULT 'not_requested',
    url text,
    file_name text,
    file_size integer,
    file_type text,
    requested_at timestamptz,
    uploaded_at timestamptz,
    reviewed_at timestamptz,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT application_checklist_documents_slot_unique UNIQUE (application_id, slot_key),
    CONSTRAINT application_checklist_documents_status_check CHECK (
        status IN (
            'not_requested',
            'requested',
            'under_review',
            'approved',
            'rejected',
            'not_applicable'
        )
    )
);

CREATE INDEX application_checklist_documents_application_sort_idx
    ON public.application_checklist_documents (application_id, sort_order, created_at);

COMMENT ON TABLE public.application_checklist_documents IS
    'Staff checklist rows for application support documents (request, upload, approve/reject).';

-- Migrate legacy application_documents into checklist slots where possible.
WITH ranked_legacy AS (
    SELECT
        ad.*,
        row_number() OVER (
            PARTITION BY ad.application_id, ad.type
            ORDER BY ad.id
        ) AS type_rank
    FROM public.application_documents ad
)
INSERT INTO public.application_checklist_documents (
    application_id,
    slot_key,
    display_name,
    status,
    url,
    file_name,
    file_size,
    file_type,
    uploaded_at,
    sort_order,
    created_at,
    updated_at
)
SELECT
    ad.application_id,
    CASE ad.type::text
        WHEN 'passport' THEN 'passport'
        WHEN 'transcript' THEN 'ib_transcript_predicted'
        WHEN 'english_test_result' THEN 'ielts_certificate'
        WHEN 'personal_statement' THEN 'personal_statement_draft'
        WHEN 'cv' THEN 'cv_resume'
        WHEN 'recommendation_letter' THEN
            CASE ad.type_rank
                WHEN 1 THEN 'rec_letter_1'
                ELSE 'rec_letter_2'
            END
        WHEN 'portfolio' THEN 'portfolio'
        ELSE 'custom:' || ad.id::text
    END,
    CASE ad.type::text
        WHEN 'passport' THEN 'Passport'
        WHEN 'transcript' THEN 'IB transcript (predicted)'
        WHEN 'english_test_result' THEN 'IELTS certificate'
        WHEN 'personal_statement' THEN 'Personal statement — draft 2'
        WHEN 'cv' THEN 'CV / resume'
        WHEN 'recommendation_letter' THEN
            COALESCE(NULLIF(btrim(ad.recommender_name), ''), 'Recommendation letter')
        WHEN 'portfolio' THEN 'Portfolio / supplementary'
        ELSE COALESCE(NULLIF(btrim(ad.file_name), ''), ad.type::text)
    END,
    'under_review',
    ad.url,
    ad.file_name,
    ad.file_size,
    ad.file_type,
    ad.created_at,
    CASE ad.type::text
        WHEN 'passport' THEN 0
        WHEN 'transcript' THEN 1
        WHEN 'english_test_result' THEN 2
        WHEN 'personal_statement' THEN 3
        WHEN 'cv' THEN 4
        WHEN 'recommendation_letter' THEN 5
        WHEN 'portfolio' THEN 8
        ELSE 100
    END,
    ad.created_at,
    ad.updated_at
FROM ranked_legacy ad
ON CONFLICT (application_id, slot_key) DO UPDATE
SET
    status = EXCLUDED.status,
    url = COALESCE(public.application_checklist_documents.url, EXCLUDED.url),
    file_name = COALESCE(public.application_checklist_documents.file_name, EXCLUDED.file_name),
    file_size = COALESCE(public.application_checklist_documents.file_size, EXCLUDED.file_size),
    file_type = COALESCE(public.application_checklist_documents.file_type, EXCLUDED.file_type),
    uploaded_at = COALESCE(public.application_checklist_documents.uploaded_at, EXCLUDED.uploaded_at),
    updated_at = GREATEST(public.application_checklist_documents.updated_at, EXCLUDED.updated_at);

-- Drop legacy table and old RLS policies.
DROP POLICY IF EXISTS application_documents_select_admins ON public.application_documents;
DROP POLICY IF EXISTS application_documents_select_own_student ON public.application_documents;
DROP POLICY IF EXISTS application_documents_select_assigned_advisor ON public.application_documents;

DROP TABLE IF EXISTS public.application_documents;

ALTER TABLE public.application_checklist_documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.application_checklist_documents TO authenticated;

DROP POLICY IF EXISTS application_checklist_documents_select_admins ON public.application_checklist_documents;
CREATE POLICY application_checklist_documents_select_admins
    ON public.application_checklist_documents
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_checklist_documents_insert_admins ON public.application_checklist_documents;
CREATE POLICY application_checklist_documents_insert_admins
    ON public.application_checklist_documents
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_checklist_documents_update_admins ON public.application_checklist_documents;
CREATE POLICY application_checklist_documents_update_admins
    ON public.application_checklist_documents
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_checklist_documents_select_advisors ON public.application_checklist_documents;
CREATE POLICY application_checklist_documents_select_advisors
    ON public.application_checklist_documents
    FOR SELECT
    TO authenticated
    USING (public.advisor_can_read_application(application_id));

DROP POLICY IF EXISTS application_checklist_documents_insert_advisors ON public.application_checklist_documents;
CREATE POLICY application_checklist_documents_insert_advisors
    ON public.application_checklist_documents
    FOR INSERT
    TO authenticated
    WITH CHECK (public.advisor_can_read_application(application_id));

DROP POLICY IF EXISTS application_checklist_documents_update_advisors ON public.application_checklist_documents;
CREATE POLICY application_checklist_documents_update_advisors
    ON public.application_checklist_documents
    FOR UPDATE
    TO authenticated
    USING (public.advisor_can_read_application(application_id))
    WITH CHECK (public.advisor_can_read_application(application_id));
