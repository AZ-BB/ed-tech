-- Featured webinar flag for student portal hero section (one active webinar at a time).

ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS webinars_is_featured_idx
  ON public.webinars (is_featured)
  WHERE is_featured = true;

-- Only one featured webinar among upcoming/live sessions.
CREATE UNIQUE INDEX IF NOT EXISTS webinars_one_active_featured_idx
  ON public.webinars ((true))
  WHERE is_featured = true
    AND status IN ('upcoming'::public.webinar_status, 'live'::public.webinar_status);
