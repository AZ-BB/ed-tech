-- Per-application university targets (shortlist / submission tracking for staff).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'university_target_status') THEN
    CREATE TYPE public.university_target_status AS ENUM (
      'shortlisted',
      'considering',
      'advisor_recommended',
      'documents_needed',
      'in_progress',
      'ready_to_submit',
      'submitted'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'university_target_decision') THEN
    CREATE TYPE public.university_target_decision AS ENUM (
      'not_submitted',
      'awaiting_decision',
      'offer_received',
      'rejected',
      'waitlist'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'university_doc_requirement_status') THEN
    CREATE TYPE public.university_doc_requirement_status AS ENUM (
      'not_started',
      'in_progress',
      'complete',
      'not_required'
    );
  END IF;
END $$;

CREATE TABLE public.application_university_targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id integer NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    university_id uuid NULL REFERENCES public.universities (id) ON DELETE SET NULL,
    university_name text NOT NULL CHECK (btrim(university_name) <> ''),
    program text NULL,
    country_code varchar(2) NULL REFERENCES public.countries (id),
    deadline date NULL,
    portal_url text NULL,
    status public.university_target_status NOT NULL DEFAULT 'shortlisted',
    decision public.university_target_decision NOT NULL DEFAULT 'not_submitted',
    notes text NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX application_university_targets_application_sort_idx
    ON public.application_university_targets (application_id, sort_order, created_at);

COMMENT ON TABLE public.application_university_targets IS
    'Staff-tracked university application targets for an application support case.';

CREATE TABLE public.application_university_document_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    university_target_id uuid NOT NULL REFERENCES public.application_university_targets (id) ON DELETE CASCADE,
    display_name text NOT NULL CHECK (btrim(display_name) <> ''),
    status public.university_doc_requirement_status NOT NULL DEFAULT 'not_started',
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX application_university_document_requirements_target_sort_idx
    ON public.application_university_document_requirements (university_target_id, sort_order, created_at);

COMMENT ON TABLE public.application_university_document_requirements IS
    'Named document requirements for a university target; statuses managed in the documents modal.';

CREATE TABLE public.application_university_document_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id uuid NOT NULL UNIQUE REFERENCES public.application_university_document_requirements (id) ON DELETE CASCADE,
    source_type text NOT NULL CHECK (source_type IN ('upload', 'checklist_link')),
    url text NULL,
    file_name text NULL,
    file_size integer NULL,
    file_type text NULL,
    uploaded_at timestamptz NULL,
    checklist_document_id uuid NULL REFERENCES public.application_checklist_documents (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT application_university_document_files_upload_check CHECK (
        source_type <> 'upload'
        OR (
            url IS NOT NULL
            AND btrim(url) <> ''
            AND file_name IS NOT NULL
            AND btrim(file_name) <> ''
        )
    ),
    CONSTRAINT application_university_document_files_checklist_check CHECK (
        source_type <> 'checklist_link'
        OR checklist_document_id IS NOT NULL
    )
);

COMMENT ON TABLE public.application_university_document_files IS
    'Optional file attachment per university document requirement (upload or checklist link).';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.application_university_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_university_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_university_document_files ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_university_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_university_document_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_university_document_files TO authenticated;

-- application_university_targets — admins
DROP POLICY IF EXISTS application_university_targets_select_admins ON public.application_university_targets;
CREATE POLICY application_university_targets_select_admins
    ON public.application_university_targets
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_university_targets_insert_admins ON public.application_university_targets;
CREATE POLICY application_university_targets_insert_admins
    ON public.application_university_targets
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_university_targets_update_admins ON public.application_university_targets;
CREATE POLICY application_university_targets_update_admins
    ON public.application_university_targets
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_university_targets_delete_admins ON public.application_university_targets;
CREATE POLICY application_university_targets_delete_admins
    ON public.application_university_targets
    FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- application_university_targets — advisors
DROP POLICY IF EXISTS application_university_targets_select_advisors ON public.application_university_targets;
CREATE POLICY application_university_targets_select_advisors
    ON public.application_university_targets
    FOR SELECT
    TO authenticated
    USING (public.advisor_can_read_application(application_id));

DROP POLICY IF EXISTS application_university_targets_insert_advisors ON public.application_university_targets;
CREATE POLICY application_university_targets_insert_advisors
    ON public.application_university_targets
    FOR INSERT
    TO authenticated
    WITH CHECK (public.advisor_can_read_application(application_id));

DROP POLICY IF EXISTS application_university_targets_update_advisors ON public.application_university_targets;
CREATE POLICY application_university_targets_update_advisors
    ON public.application_university_targets
    FOR UPDATE
    TO authenticated
    USING (public.advisor_can_read_application(application_id))
    WITH CHECK (public.advisor_can_read_application(application_id));

DROP POLICY IF EXISTS application_university_targets_delete_advisors ON public.application_university_targets;
CREATE POLICY application_university_targets_delete_advisors
    ON public.application_university_targets
    FOR DELETE
    TO authenticated
    USING (public.advisor_can_read_application(application_id));

-- application_university_document_requirements — admins
DROP POLICY IF EXISTS application_university_document_requirements_select_admins ON public.application_university_document_requirements;
CREATE POLICY application_university_document_requirements_select_admins
    ON public.application_university_document_requirements
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_university_document_requirements_insert_admins ON public.application_university_document_requirements;
CREATE POLICY application_university_document_requirements_insert_admins
    ON public.application_university_document_requirements
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_university_document_requirements_update_admins ON public.application_university_document_requirements;
CREATE POLICY application_university_document_requirements_update_admins
    ON public.application_university_document_requirements
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_university_document_requirements_delete_admins ON public.application_university_document_requirements;
CREATE POLICY application_university_document_requirements_delete_admins
    ON public.application_university_document_requirements
    FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- application_university_document_requirements — advisors
DROP POLICY IF EXISTS application_university_document_requirements_select_advisors ON public.application_university_document_requirements;
CREATE POLICY application_university_document_requirements_select_advisors
    ON public.application_university_document_requirements
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.application_university_targets t
            WHERE t.id = application_university_document_requirements.university_target_id
              AND public.advisor_can_read_application(t.application_id)
        )
    );

DROP POLICY IF EXISTS application_university_document_requirements_insert_advisors ON public.application_university_document_requirements;
CREATE POLICY application_university_document_requirements_insert_advisors
    ON public.application_university_document_requirements
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.application_university_targets t
            WHERE t.id = application_university_document_requirements.university_target_id
              AND public.advisor_can_read_application(t.application_id)
        )
    );

DROP POLICY IF EXISTS application_university_document_requirements_update_advisors ON public.application_university_document_requirements;
CREATE POLICY application_university_document_requirements_update_advisors
    ON public.application_university_document_requirements
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.application_university_targets t
            WHERE t.id = application_university_document_requirements.university_target_id
              AND public.advisor_can_read_application(t.application_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.application_university_targets t
            WHERE t.id = application_university_document_requirements.university_target_id
              AND public.advisor_can_read_application(t.application_id)
        )
    );

DROP POLICY IF EXISTS application_university_document_requirements_delete_advisors ON public.application_university_document_requirements;
CREATE POLICY application_university_document_requirements_delete_advisors
    ON public.application_university_document_requirements
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.application_university_targets t
            WHERE t.id = application_university_document_requirements.university_target_id
              AND public.advisor_can_read_application(t.application_id)
        )
    );

-- application_university_document_files — admins
DROP POLICY IF EXISTS application_university_document_files_select_admins ON public.application_university_document_files;
CREATE POLICY application_university_document_files_select_admins
    ON public.application_university_document_files
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_university_document_files_insert_admins ON public.application_university_document_files;
CREATE POLICY application_university_document_files_insert_admins
    ON public.application_university_document_files
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_university_document_files_update_admins ON public.application_university_document_files;
CREATE POLICY application_university_document_files_update_admins
    ON public.application_university_document_files
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_university_document_files_delete_admins ON public.application_university_document_files;
CREATE POLICY application_university_document_files_delete_admins
    ON public.application_university_document_files
    FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- application_university_document_files — advisors
DROP POLICY IF EXISTS application_university_document_files_select_advisors ON public.application_university_document_files;
CREATE POLICY application_university_document_files_select_advisors
    ON public.application_university_document_files
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.application_university_document_requirements r
            JOIN public.application_university_targets t ON t.id = r.university_target_id
            WHERE r.id = application_university_document_files.requirement_id
              AND public.advisor_can_read_application(t.application_id)
        )
    );

DROP POLICY IF EXISTS application_university_document_files_insert_advisors ON public.application_university_document_files;
CREATE POLICY application_university_document_files_insert_advisors
    ON public.application_university_document_files
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.application_university_document_requirements r
            JOIN public.application_university_targets t ON t.id = r.university_target_id
            WHERE r.id = application_university_document_files.requirement_id
              AND public.advisor_can_read_application(t.application_id)
        )
    );

DROP POLICY IF EXISTS application_university_document_files_update_advisors ON public.application_university_document_files;
CREATE POLICY application_university_document_files_update_advisors
    ON public.application_university_document_files
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.application_university_document_requirements r
            JOIN public.application_university_targets t ON t.id = r.university_target_id
            WHERE r.id = application_university_document_files.requirement_id
              AND public.advisor_can_read_application(t.application_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.application_university_document_requirements r
            JOIN public.application_university_targets t ON t.id = r.university_target_id
            WHERE r.id = application_university_document_files.requirement_id
              AND public.advisor_can_read_application(t.application_id)
        )
    );

DROP POLICY IF EXISTS application_university_document_files_delete_advisors ON public.application_university_document_files;
CREATE POLICY application_university_document_files_delete_advisors
    ON public.application_university_document_files
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.application_university_document_requirements r
            JOIN public.application_university_targets t ON t.id = r.university_target_id
            WHERE r.id = application_university_document_files.requirement_id
              AND public.advisor_can_read_application(t.application_id)
        )
    );
