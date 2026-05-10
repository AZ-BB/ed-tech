-- Drop all RLS policies tied to school admins — reconfigure access yourself.
-- Tables that only had school-admin policies get RLS disabled so invites / reads are not hard-blocked.

DROP POLICY IF EXISTS acitivity_logs_select_own_school_admin ON public.acitivity_logs;

DROP POLICY IF EXISTS student_profiles_select_school_admin_same_school ON public.student_profiles;

DROP POLICY IF EXISTS student_shortlist_universities_select_school_admin_same_school ON public.student_shortlist_universities;

DROP POLICY IF EXISTS student_activities_select_school_admin_same_school ON public.student_activities;

DROP POLICY IF EXISTS school_students_select_school_admin_same_school ON public.school_students;
DROP POLICY IF EXISTS school_students_insert_school_admin_same_school ON public.school_students;

DROP POLICY IF EXISTS school_admin_profiles_select_own ON public.school_admin_profiles;
DROP POLICY IF EXISTS school_admin_profiles_select_same_school ON public.school_admin_profiles;
DROP POLICY IF EXISTS school_admin_profiles_select_same_school_admins ON public.school_admin_profiles;

DROP POLICY IF EXISTS schools_select_school_admin_same_school ON public.schools;
DROP POLICY IF EXISTS schools_update_school_admin_same_school ON public.schools;

DROP FUNCTION IF EXISTS public.current_school_admin_school_id ();