CREATE TABLE IF NOT EXISTS public.handlers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS handlers_email_unique_idx
    ON public.handlers (lower(trim(email)));

ALTER TABLE public.applications
    DROP CONSTRAINT IF EXISTS applications_assigned_to_fkey;

-- Previous assignments pointed at admins; clear them before re-linking to handlers.
UPDATE public.applications
SET assigned_to = NULL,
    assigned_at = NULL
WHERE assigned_to IS NOT NULL;

ALTER TABLE public.applications
    ADD CONSTRAINT applications_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.handlers (id) ON DELETE SET NULL;

ALTER TABLE public.handlers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS handlers_select_authenticated ON public.handlers;
CREATE POLICY handlers_select_authenticated
    ON public.handlers
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS handlers_insert_admins ON public.handlers;
CREATE POLICY handlers_insert_admins
    ON public.handlers
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS handlers_update_admins ON public.handlers;
CREATE POLICY handlers_update_admins
    ON public.handlers
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS handlers_delete_admins ON public.handlers;
CREATE POLICY handlers_delete_admins
    ON public.handlers
    FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
