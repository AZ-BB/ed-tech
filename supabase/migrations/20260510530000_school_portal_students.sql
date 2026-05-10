-- School portal: student profile extras + school admin read paths for student shortlist / activity +
-- optional invite rows via school_students with RLS.

ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS grade TEXT NULL;

ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS counselor_school_admin_id UUID NULL
        REFERENCES public.school_admin_profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_profiles_counselor_school_admin_id_idx
    ON public.student_profiles (counselor_school_admin_id)
    WHERE counselor_school_admin_id IS NOT NULL;

-- student_shortlist_universities: school admins view rows for students at their school
DROP POLICY IF EXISTS student_shortlist_universities_select_school_admin_same_school
    ON public.student_shortlist_universities;

CREATE POLICY student_shortlist_universities_select_school_admin_same_school
    ON public.student_shortlist_universities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.student_profiles sp
            INNER JOIN public.school_admin_profiles sap
                ON sap.school_id = sp.school_id AND sap.id = auth.uid ()
            WHERE sp.id = student_shortlist_universities.student_id
        )
    );

-- student_activities: school admins view activity for students at their school (e.g. last active)
DROP POLICY IF EXISTS student_activities_select_school_admin_same_school
    ON public.student_activities;

CREATE POLICY student_activities_select_school_admin_same_school
    ON public.student_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.student_profiles sp
            INNER JOIN public.school_admin_profiles sap
                ON sap.school_id = sp.school_id AND sap.id = auth.uid ()
            WHERE sp.id = student_activities.student_id
        )
    );

-- school_students: school admins manage invite list for their school only
ALTER TABLE public.school_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_students_select_school_admin_same_school ON public.school_students;
CREATE POLICY school_students_select_school_admin_same_school
    ON public.school_students
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.school_admin_profiles sap
            WHERE sap.id = auth.uid () AND sap.school_id = school_students.school_id
        )
    );

DROP POLICY IF EXISTS school_students_insert_school_admin_same_school ON public.school_students;
CREATE POLICY school_students_insert_school_admin_same_school
    ON public.school_students
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.school_admin_profiles sap
            WHERE sap.id = auth.uid () AND sap.school_id = school_students.school_id
        )
    );

GRANT SELECT, INSERT ON public.school_students TO authenticated;
