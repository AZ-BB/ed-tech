-- Ensure all discovery modules are available to students (admin is_active is for drafts only).
UPDATE public.discovery_modules
SET is_active = TRUE
WHERE is_active = FALSE;
