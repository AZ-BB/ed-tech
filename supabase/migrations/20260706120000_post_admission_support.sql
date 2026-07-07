-- Post-admission support cases, notes, calls; polymorphic payments/payouts.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_admission_status') THEN
    CREATE TYPE public.post_admission_status AS ENUM (
      'lead',
      'not_suitable',
      'payment_requested',
      'active',
      'completed'
    );
  END IF;
END $$;

CREATE TABLE public.post_admission_cases (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.schools (id) ON DELETE SET NULL,
    assigned_to UUID NULL REFERENCES public.advisors (id) ON DELETE SET NULL,
    status public.post_admission_status NOT NULL DEFAULT 'lead',
    student_name TEXT NULL,
    student_email TEXT NULL,
    school_name TEXT NULL,
    scheduled_at TIMESTAMPTZ NULL,
    assigned_at TIMESTAMPTZ NULL,
    payment_in_progress_at TIMESTAMPTZ NULL,
    payment_completed_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    blocked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX post_admission_cases_student_id_idx
    ON public.post_admission_cases (student_id);

CREATE INDEX post_admission_cases_assigned_status_idx
    ON public.post_admission_cases (assigned_to, status);

CREATE INDEX post_admission_cases_scheduled_at_idx
    ON public.post_admission_cases (scheduled_at)
    WHERE scheduled_at IS NOT NULL;

COMMENT ON TABLE public.post_admission_cases IS
    'Post-admission support leads and active cases; assigned to receiving advisor.';

-- ---------------------------------------------------------------------------
-- Internal notes
-- ---------------------------------------------------------------------------
CREATE TABLE public.post_admission_internal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_admission_case_id INTEGER NOT NULL REFERENCES public.post_admission_cases (id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,
    author_user_id UUID NULL,
    author_role TEXT NOT NULL CHECK (author_role IN ('admin', 'advisor')),
    author_name TEXT NOT NULL,
    content TEXT NOT NULL CHECK (btrim(content) <> ''),
    visibility TEXT NOT NULL DEFAULT 'internal'
        CHECK (visibility IN ('internal', 'public')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX post_admission_internal_notes_case_created_idx
    ON public.post_admission_internal_notes (post_admission_case_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Call logs
-- ---------------------------------------------------------------------------
CREATE TABLE public.post_admission_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_admission_case_id INTEGER NOT NULL REFERENCES public.post_admission_cases (id) ON DELETE CASCADE,
    call_type TEXT NOT NULL CHECK (
        call_type IN (
            'free_intro_call',
            'paid_advisory_session',
            'application_package_session',
            'essay_review_session',
            'parent_consultation',
            'uni_shortlist_call',
            'post_admission_session'
        )
    ),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    call_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN ('scheduled', 'rescheduled', 'canceled', 'no_show', 'completed')
    ),
    outcome TEXT NULL CHECK (
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
    summary TEXT NULL,
    author_user_id UUID NULL,
    author_role TEXT NOT NULL CHECK (author_role IN ('admin', 'advisor')),
    author_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX post_admission_calls_case_date_idx
    ON public.post_admission_calls (post_admission_case_id, call_date DESC);

-- ---------------------------------------------------------------------------
-- Polymorphic payments
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments
    ALTER COLUMN application_id DROP NOT NULL;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS post_admission_case_id INTEGER NULL
        REFERENCES public.post_admission_cases (id) ON DELETE CASCADE;

ALTER TABLE public.payments
    DROP CONSTRAINT IF EXISTS payments_parent_xor_check;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_parent_xor_check CHECK (
        (application_id IS NOT NULL AND post_admission_case_id IS NULL)
        OR (application_id IS NULL AND post_admission_case_id IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS payments_post_admission_case_id_idx
    ON public.payments (post_admission_case_id)
    WHERE post_admission_case_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Polymorphic advisor payouts
-- ---------------------------------------------------------------------------
ALTER TABLE public.advisor_payouts
    ALTER COLUMN application_id DROP NOT NULL;

ALTER TABLE public.advisor_payouts
    ADD COLUMN IF NOT EXISTS post_admission_case_id INTEGER NULL
        REFERENCES public.post_admission_cases (id) ON DELETE CASCADE;

ALTER TABLE public.advisor_payouts
    DROP CONSTRAINT IF EXISTS advisor_payouts_parent_xor_check;

ALTER TABLE public.advisor_payouts
    ADD CONSTRAINT advisor_payouts_parent_xor_check CHECK (
        (application_id IS NOT NULL AND post_admission_case_id IS NULL)
        OR (application_id IS NULL AND post_admission_case_id IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS advisor_payouts_post_admission_case_id_idx
    ON public.advisor_payouts (post_admission_case_id)
    WHERE post_admission_case_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advisor_can_read_post_admission_case(p_case_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_advisor_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.post_admission_cases c
      WHERE c.id = p_case_id
        AND c.assigned_to = public.current_advisor_id()
    );
$$;

COMMENT ON FUNCTION public.advisor_can_read_post_admission_case(integer) IS
    'True when the logged-in advisor is assigned to this post-admission case — bypasses RLS.';

REVOKE ALL ON FUNCTION public.advisor_can_read_post_admission_case(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advisor_can_read_post_admission_case(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- post_admission_cases RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.post_admission_cases ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.post_admission_cases TO authenticated;

DROP POLICY IF EXISTS post_admission_cases_select_admins ON public.post_admission_cases;
CREATE POLICY post_admission_cases_select_admins
    ON public.post_admission_cases FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS post_admission_cases_update_admins ON public.post_admission_cases;
CREATE POLICY post_admission_cases_update_admins
    ON public.post_admission_cases FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS post_admission_cases_select_assigned_advisor ON public.post_admission_cases;
CREATE POLICY post_admission_cases_select_assigned_advisor
    ON public.post_admission_cases FOR SELECT TO authenticated
    USING (assigned_to = public.current_advisor_id());

DROP POLICY IF EXISTS post_admission_cases_update_assigned_advisor ON public.post_admission_cases;
CREATE POLICY post_admission_cases_update_assigned_advisor
    ON public.post_admission_cases FOR UPDATE TO authenticated
    USING (assigned_to = public.current_advisor_id())
    WITH CHECK (assigned_to = public.current_advisor_id());

DROP POLICY IF EXISTS post_admission_cases_select_own_student ON public.post_admission_cases;
CREATE POLICY post_admission_cases_select_own_student
    ON public.post_admission_cases FOR SELECT TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS post_admission_cases_insert_own_student ON public.post_admission_cases;
CREATE POLICY post_admission_cases_insert_own_student
    ON public.post_admission_cases FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

-- ---------------------------------------------------------------------------
-- post_admission_internal_notes RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.post_admission_internal_notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.post_admission_internal_notes TO authenticated;

DROP POLICY IF EXISTS post_admission_internal_notes_select_admins ON public.post_admission_internal_notes;
CREATE POLICY post_admission_internal_notes_select_admins
    ON public.post_admission_internal_notes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS post_admission_internal_notes_insert_admins ON public.post_admission_internal_notes;
CREATE POLICY post_admission_internal_notes_insert_admins
    ON public.post_admission_internal_notes FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        AND author_user_id = auth.uid()
        AND author_role = 'admin'
    );

DROP POLICY IF EXISTS post_admission_internal_notes_select_advisors ON public.post_admission_internal_notes;
CREATE POLICY post_admission_internal_notes_select_advisors
    ON public.post_admission_internal_notes FOR SELECT TO authenticated
    USING (public.advisor_can_read_post_admission_case(post_admission_case_id));

DROP POLICY IF EXISTS post_admission_internal_notes_insert_advisors ON public.post_admission_internal_notes;
CREATE POLICY post_admission_internal_notes_insert_advisors
    ON public.post_admission_internal_notes FOR INSERT TO authenticated
    WITH CHECK (
        public.advisor_can_read_post_admission_case(post_admission_case_id)
        AND author_user_id = auth.uid()
        AND author_role = 'advisor'
    );

-- ---------------------------------------------------------------------------
-- post_admission_calls RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.post_admission_calls ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_admission_calls TO authenticated;

DROP POLICY IF EXISTS post_admission_calls_select_admins ON public.post_admission_calls;
CREATE POLICY post_admission_calls_select_admins
    ON public.post_admission_calls FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS post_admission_calls_insert_admins ON public.post_admission_calls;
CREATE POLICY post_admission_calls_insert_admins
    ON public.post_admission_calls FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        AND author_user_id = auth.uid()
        AND author_role = 'admin'
    );

DROP POLICY IF EXISTS post_admission_calls_update_admins ON public.post_admission_calls;
CREATE POLICY post_admission_calls_update_admins
    ON public.post_admission_calls FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS post_admission_calls_delete_admins ON public.post_admission_calls;
CREATE POLICY post_admission_calls_delete_admins
    ON public.post_admission_calls FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS post_admission_calls_select_advisors ON public.post_admission_calls;
CREATE POLICY post_admission_calls_select_advisors
    ON public.post_admission_calls FOR SELECT TO authenticated
    USING (public.advisor_can_read_post_admission_case(post_admission_case_id));

DROP POLICY IF EXISTS post_admission_calls_insert_advisors ON public.post_admission_calls;
CREATE POLICY post_admission_calls_insert_advisors
    ON public.post_admission_calls FOR INSERT TO authenticated
    WITH CHECK (
        public.advisor_can_read_post_admission_case(post_admission_case_id)
        AND author_user_id = auth.uid()
        AND author_role = 'advisor'
    );

DROP POLICY IF EXISTS post_admission_calls_update_advisors ON public.post_admission_calls;
CREATE POLICY post_admission_calls_update_advisors
    ON public.post_admission_calls FOR UPDATE TO authenticated
    USING (public.advisor_can_read_post_admission_case(post_admission_case_id))
    WITH CHECK (public.advisor_can_read_post_admission_case(post_admission_case_id));

DROP POLICY IF EXISTS post_admission_calls_delete_advisors ON public.post_admission_calls;
CREATE POLICY post_admission_calls_delete_advisors
    ON public.post_admission_calls FOR DELETE TO authenticated
    USING (public.advisor_can_read_post_admission_case(post_admission_case_id));

-- ---------------------------------------------------------------------------
-- payments — post-admission advisor read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS payments_select_post_admission_advisor ON public.payments;
CREATE POLICY payments_select_post_admission_advisor
    ON public.payments FOR SELECT TO authenticated
    USING (
        post_admission_case_id IS NOT NULL
        AND public.advisor_can_read_post_admission_case(post_admission_case_id)
    );
