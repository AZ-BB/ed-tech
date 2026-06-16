-- Application-scoped calls and follow-up tasks (admins + assigned advisors).

CREATE TABLE public.application_calls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id integer NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    call_type text NOT NULL CHECK (
        call_type IN (
            'free_intro_call',
            'paid_advisory_session',
            'application_package_session',
            'essay_review_session',
            'parent_consultation',
            'uni_shortlist_call'
        )
    ),
    duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
    call_date date NOT NULL,
    status text NOT NULL CHECK (
        status IN ('scheduled', 'rescheduled', 'canceled', 'no_show', 'completed')
    ),
    outcome text NULL CHECK (
        outcome IS NULL
        OR outcome IN (
            'needs_more_guidance',
            'package_recommended',
            'payment_request_sent',
            'converted_to_package',
            'not_ready_yet',
            'not_interested',
            'follow_up_required'
        )
    ),
    summary text NULL,
    author_user_id uuid NULL,
    author_role text NOT NULL CHECK (author_role IN ('admin', 'advisor')),
    author_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX application_calls_application_date_idx
    ON public.application_calls (application_id, call_date DESC);

COMMENT ON TABLE public.application_calls IS
    'Staff call logs for application support cases; visible to platform admins and the assigned advisor.';

CREATE TABLE public.application_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id integer NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    title text NOT NULL CHECK (btrim(title) <> ''),
    due_date date NULL,
    priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    completed boolean NOT NULL DEFAULT false,
    source_call_id uuid NULL REFERENCES public.application_calls (id) ON DELETE SET NULL,
    author_user_id uuid NULL,
    author_role text NOT NULL CHECK (author_role IN ('admin', 'advisor')),
    author_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX application_tasks_application_due_idx
    ON public.application_tasks (application_id, due_date NULLS LAST, created_at DESC);

COMMENT ON TABLE public.application_tasks IS
    'Staff tasks for application support cases; may be created manually or from call follow-ups.';

ALTER TABLE public.application_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.application_calls TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.application_tasks TO authenticated;

-- application_calls: admins
DROP POLICY IF EXISTS application_calls_select_admins ON public.application_calls;
CREATE POLICY application_calls_select_admins
    ON public.application_calls
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_calls_insert_admins ON public.application_calls;
CREATE POLICY application_calls_insert_admins
    ON public.application_calls
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        AND author_user_id = auth.uid()
        AND author_role = 'admin'
    );

DROP POLICY IF EXISTS application_calls_update_admins ON public.application_calls;
CREATE POLICY application_calls_update_admins
    ON public.application_calls
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- application_calls: advisors
DROP POLICY IF EXISTS application_calls_select_advisors ON public.application_calls;
CREATE POLICY application_calls_select_advisors
    ON public.application_calls
    FOR SELECT
    TO authenticated
    USING (public.advisor_can_read_application(application_id));

DROP POLICY IF EXISTS application_calls_insert_advisors ON public.application_calls;
CREATE POLICY application_calls_insert_advisors
    ON public.application_calls
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.advisor_can_read_application(application_id)
        AND author_user_id = auth.uid()
        AND author_role = 'advisor'
    );

DROP POLICY IF EXISTS application_calls_update_advisors ON public.application_calls;
CREATE POLICY application_calls_update_advisors
    ON public.application_calls
    FOR UPDATE
    TO authenticated
    USING (public.advisor_can_read_application(application_id))
    WITH CHECK (public.advisor_can_read_application(application_id));

-- application_tasks: admins
DROP POLICY IF EXISTS application_tasks_select_admins ON public.application_tasks;
CREATE POLICY application_tasks_select_admins
    ON public.application_tasks
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_tasks_insert_admins ON public.application_tasks;
CREATE POLICY application_tasks_insert_admins
    ON public.application_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        AND author_user_id = auth.uid()
        AND author_role = 'admin'
    );

DROP POLICY IF EXISTS application_tasks_update_admins ON public.application_tasks;
CREATE POLICY application_tasks_update_admins
    ON public.application_tasks
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- application_tasks: advisors
DROP POLICY IF EXISTS application_tasks_select_advisors ON public.application_tasks;
CREATE POLICY application_tasks_select_advisors
    ON public.application_tasks
    FOR SELECT
    TO authenticated
    USING (public.advisor_can_read_application(application_id));

DROP POLICY IF EXISTS application_tasks_insert_advisors ON public.application_tasks;
CREATE POLICY application_tasks_insert_advisors
    ON public.application_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.advisor_can_read_application(application_id)
        AND author_user_id = auth.uid()
        AND author_role = 'advisor'
    );

DROP POLICY IF EXISTS application_tasks_update_advisors ON public.application_tasks;
CREATE POLICY application_tasks_update_advisors
    ON public.application_tasks
    FOR UPDATE
    TO authenticated
    USING (public.advisor_can_read_application(application_id))
    WITH CHECK (public.advisor_can_read_application(application_id));
