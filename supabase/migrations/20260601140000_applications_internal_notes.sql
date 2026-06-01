-- Admin-only internal notes on application support cases (distinct from student intake additional_notes).

ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT NULL;

COMMENT ON COLUMN public.applications.internal_notes IS 'Platform admin internal notes; not visible to students.';
