-- Allow staff to delete application call records.

GRANT DELETE ON public.application_calls TO authenticated;

DROP POLICY IF EXISTS application_calls_delete_admins ON public.application_calls;
CREATE POLICY application_calls_delete_admins
    ON public.application_calls
    FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS application_calls_delete_advisors ON public.application_calls;
CREATE POLICY application_calls_delete_advisors
    ON public.application_calls
    FOR DELETE
    TO authenticated
    USING (public.advisor_can_read_application(application_id));
