-- Repoint application assignments from handlers to advisors, then drop handlers.

-- Map existing handler assignments to advisors by email where possible.
UPDATE public.applications AS app
SET assigned_to = adv.id
FROM public.handlers AS h
INNER JOIN public.advisors AS adv
    ON lower(trim(adv.email)) = lower(trim(h.email))
WHERE app.assigned_to = h.id;

-- Clear assignments that could not be mapped to an advisor.
UPDATE public.applications AS app
SET assigned_to = NULL,
    assigned_at = NULL
WHERE app.assigned_to IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.advisors AS adv
      WHERE adv.id = app.assigned_to
  );

ALTER TABLE public.applications
    DROP CONSTRAINT IF EXISTS applications_assigned_to_fkey;

ALTER TABLE public.applications
    ADD CONSTRAINT applications_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.advisors (id) ON DELETE SET NULL;

DROP POLICY IF EXISTS handlers_select_authenticated ON public.handlers;
DROP POLICY IF EXISTS handlers_insert_admins ON public.handlers;
DROP POLICY IF EXISTS handlers_update_admins ON public.handlers;
DROP POLICY IF EXISTS handlers_delete_admins ON public.handlers;

DROP TABLE IF EXISTS public.handlers;
