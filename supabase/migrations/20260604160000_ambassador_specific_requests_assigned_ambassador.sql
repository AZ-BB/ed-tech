-- Link confirmed ambassador lookup requests to a catalog ambassador.

ALTER TABLE public.ambassador_specific_requests
  ADD COLUMN IF NOT EXISTS assigned_ambassador_id UUID NULL
  REFERENCES public.ambassadors (id);

CREATE INDEX IF NOT EXISTS ambassador_specific_requests_assigned_ambassador_id_idx
  ON public.ambassador_specific_requests (assigned_ambassador_id)
  WHERE assigned_ambassador_id IS NOT NULL;
