-- Store admin-assigned ambassadors who are not in the catalog.

ALTER TABLE public.ambassador_specific_requests
  ADD COLUMN IF NOT EXISTS external_ambassador_full_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS external_ambassador_email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS external_ambassador_linkedin TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS external_ambassador_overview TEXT DEFAULT NULL;
