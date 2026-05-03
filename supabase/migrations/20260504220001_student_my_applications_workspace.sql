-- Student "My Applications" workspace: extended profile + shortlist + documents + essays + recommendations + tasks.

-- ---------------------------------------------------------------------------
-- 1:1 extended application profile (per student user id = student_profiles.id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.student_application_profile (
    student_id UUID PRIMARY KEY REFERENCES public.student_profiles (id) ON DELETE CASCADE,

    grade TEXT,
    curriculum TEXT,
    target_intake TEXT,

    preferred_destinations TEXT[] NOT NULL DEFAULT '{}',
    interested_programs TEXT[] NOT NULL DEFAULT '{}',
    budget_range TEXT,
    need_based_aid TEXT,

    english_test_scores TEXT,
    sat_act_scores TEXT,
    predicted_grades TEXT,
    predicted_grades_set_by_school BOOLEAN NOT NULL DEFAULT FALSE,
    other_tests TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX student_application_profile_updated_at_idx
    ON public.student_application_profile (updated_at DESC);

-- ---------------------------------------------------------------------------
-- University shortlist (one student → many rows)
-- ---------------------------------------------------------------------------
CREATE TABLE public.student_shortlist_universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,

    university_name TEXT NOT NULL,
    country TEXT,
    major_program TEXT,
    application_method TEXT,
    application_deadline DATE,

    status TEXT NOT NULL DEFAULT 'considering',
    decision TEXT,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX student_shortlist_universities_student_id_idx
    ON public.student_shortlist_universities (student_id);

CREATE INDEX student_shortlist_universities_student_sort_idx
    ON public.student_shortlist_universities (student_id, sort_order);

-- ---------------------------------------------------------------------------
-- Document checklist rows (template + custom slots)
-- ---------------------------------------------------------------------------
CREATE TABLE public.student_my_application_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,

    slot_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,

    storage_path TEXT,
    file_name TEXT,
    status TEXT NOT NULL DEFAULT 'missing',

    uploaded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT student_my_application_documents_slot_unique UNIQUE (student_id, slot_key)
);

CREATE INDEX student_my_application_documents_student_id_idx
    ON public.student_my_application_documents (student_id);

-- ---------------------------------------------------------------------------
-- Essays
-- ---------------------------------------------------------------------------
CREATE TABLE public.student_my_application_essays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    essay_type TEXT,
    for_application TEXT,
    limit_note TEXT,
    body TEXT NOT NULL DEFAULT '',

    status TEXT NOT NULL DEFAULT 'not_started',
    comment_count INTEGER NOT NULL DEFAULT 0,

    last_edited_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX student_my_application_essays_student_id_idx
    ON public.student_my_application_essays (student_id);

-- ---------------------------------------------------------------------------
-- Recommendation letter requests
-- ---------------------------------------------------------------------------
CREATE TABLE public.student_my_application_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,

    teacher_name TEXT NOT NULL,
    teacher_email TEXT NOT NULL,
    for_application TEXT NOT NULL,
    personal_note TEXT,
    needed_by DATE NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending',

    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX student_my_application_recommendations_student_id_idx
    ON public.student_my_application_recommendations (student_id);

-- ---------------------------------------------------------------------------
-- Tasks (counselor-assigned or self)
-- ---------------------------------------------------------------------------
CREATE TABLE public.student_my_application_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    assigned_by_name TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date DATE,

    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX student_my_application_tasks_student_id_idx
    ON public.student_my_application_tasks (student_id);

-- ---------------------------------------------------------------------------
-- RLS (mirror student_activities: own row + platform admins)
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_application_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_shortlist_universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_my_application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_my_application_essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_my_application_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_my_application_tasks ENABLE ROW LEVEL SECURITY;

-- student_application_profile
CREATE POLICY student_application_profile_select_own ON public.student_application_profile
    FOR SELECT TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_application_profile_select_admins ON public.student_application_profile
    FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_application_profile_insert_own ON public.student_application_profile
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_application_profile_insert_admins ON public.student_application_profile
    FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_application_profile_update_own ON public.student_application_profile
    FOR UPDATE TO authenticated USING (student_id = auth.uid ()) WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_application_profile_update_admins ON public.student_application_profile
    FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_application_profile_delete_own ON public.student_application_profile
    FOR DELETE TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_application_profile_delete_admins ON public.student_application_profile
    FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

-- student_shortlist_universities
CREATE POLICY student_shortlist_universities_select_own ON public.student_shortlist_universities
    FOR SELECT TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_shortlist_universities_select_admins ON public.student_shortlist_universities
    FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_shortlist_universities_insert_own ON public.student_shortlist_universities
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_shortlist_universities_insert_admins ON public.student_shortlist_universities
    FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_shortlist_universities_update_own ON public.student_shortlist_universities
    FOR UPDATE TO authenticated USING (student_id = auth.uid ()) WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_shortlist_universities_update_admins ON public.student_shortlist_universities
    FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_shortlist_universities_delete_own ON public.student_shortlist_universities
    FOR DELETE TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_shortlist_universities_delete_admins ON public.student_shortlist_universities
    FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

-- student_my_application_documents
CREATE POLICY student_my_application_documents_select_own ON public.student_my_application_documents
    FOR SELECT TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_my_application_documents_select_admins ON public.student_my_application_documents
    FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_documents_insert_own ON public.student_my_application_documents
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_my_application_documents_insert_admins ON public.student_my_application_documents
    FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_documents_update_own ON public.student_my_application_documents
    FOR UPDATE TO authenticated USING (student_id = auth.uid ()) WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_my_application_documents_update_admins ON public.student_my_application_documents
    FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_documents_delete_own ON public.student_my_application_documents
    FOR DELETE TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_my_application_documents_delete_admins ON public.student_my_application_documents
    FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

-- student_my_application_essays
CREATE POLICY student_my_application_essays_select_own ON public.student_my_application_essays
    FOR SELECT TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_my_application_essays_select_admins ON public.student_my_application_essays
    FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_essays_insert_own ON public.student_my_application_essays
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_my_application_essays_insert_admins ON public.student_my_application_essays
    FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_essays_update_own ON public.student_my_application_essays
    FOR UPDATE TO authenticated USING (student_id = auth.uid ()) WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_my_application_essays_update_admins ON public.student_my_application_essays
    FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_essays_delete_own ON public.student_my_application_essays
    FOR DELETE TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_my_application_essays_delete_admins ON public.student_my_application_essays
    FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

-- student_my_application_recommendations
CREATE POLICY student_my_application_recommendations_select_own ON public.student_my_application_recommendations
    FOR SELECT TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_my_application_recommendations_select_admins ON public.student_my_application_recommendations
    FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_recommendations_insert_own ON public.student_my_application_recommendations
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_my_application_recommendations_insert_admins ON public.student_my_application_recommendations
    FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_recommendations_update_own ON public.student_my_application_recommendations
    FOR UPDATE TO authenticated USING (student_id = auth.uid ()) WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_my_application_recommendations_update_admins ON public.student_my_application_recommendations
    FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_recommendations_delete_own ON public.student_my_application_recommendations
    FOR DELETE TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_my_application_recommendations_delete_admins ON public.student_my_application_recommendations
    FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

-- student_my_application_tasks
CREATE POLICY student_my_application_tasks_select_own ON public.student_my_application_tasks
    FOR SELECT TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_my_application_tasks_select_admins ON public.student_my_application_tasks
    FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_tasks_insert_own ON public.student_my_application_tasks
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_my_application_tasks_insert_admins ON public.student_my_application_tasks
    FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_tasks_update_own ON public.student_my_application_tasks
    FOR UPDATE TO authenticated USING (student_id = auth.uid ()) WITH CHECK (student_id = auth.uid ());
CREATE POLICY student_my_application_tasks_update_admins ON public.student_my_application_tasks
    FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));
CREATE POLICY student_my_application_tasks_delete_own ON public.student_my_application_tasks
    FOR DELETE TO authenticated USING (student_id = auth.uid ());
CREATE POLICY student_my_application_tasks_delete_admins ON public.student_my_application_tasks
    FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid ()));

-- ---------------------------------------------------------------------------
-- Storage bucket for My Applications document files
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'student-my-applications',
    'student-my-applications',
    false,
    10485760,
    NULL
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY student_my_apps_storage_select_own ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'student-my-applications'
        AND (storage.foldername (name))[1] = auth.uid ()::text
    );

CREATE POLICY student_my_apps_storage_insert_own ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'student-my-applications'
        AND (storage.foldername (name))[1] = auth.uid ()::text
    );

CREATE POLICY student_my_apps_storage_update_own ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'student-my-applications'
        AND (storage.foldername (name))[1] = auth.uid ()::text
    )
    WITH CHECK (
        bucket_id = 'student-my-applications'
        AND (storage.foldername (name))[1] = auth.uid ()::text
    );

CREATE POLICY student_my_apps_storage_delete_own ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'student-my-applications'
        AND (storage.foldername (name))[1] = auth.uid ()::text
    );
