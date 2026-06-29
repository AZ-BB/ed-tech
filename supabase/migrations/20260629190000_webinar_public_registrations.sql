-- Public (non-platform) webinar registrations alongside platform student registrations.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webinar_registration_type') THEN
    CREATE TYPE public.webinar_registration_type AS ENUM (
      'platform',
      'non_platform'
    );
  END IF;
END
$$;

ALTER TABLE public.webinar_registrations
  ADD COLUMN IF NOT EXISTS registration_type public.webinar_registration_type NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

ALTER TABLE public.webinar_registrations
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE public.webinar_registrations
  DROP CONSTRAINT IF EXISTS webinar_registrations_webinar_id_student_id_key;

ALTER TABLE public.webinar_registrations
  DROP CONSTRAINT IF EXISTS webinar_registrations_source_check;

ALTER TABLE public.webinar_registrations
  ADD CONSTRAINT webinar_registrations_source_check CHECK (
    (
      registration_type = 'platform'::public.webinar_registration_type
      AND student_id IS NOT NULL
      AND guest_name IS NULL
      AND guest_email IS NULL
      AND guest_phone IS NULL
    )
    OR (
      registration_type = 'non_platform'::public.webinar_registration_type
      AND student_id IS NULL
      AND guest_name IS NOT NULL
      AND NULLIF(TRIM(guest_name), '') IS NOT NULL
      AND guest_email IS NOT NULL
      AND NULLIF(TRIM(guest_email), '') IS NOT NULL
    )
  );

DROP INDEX IF EXISTS webinar_registrations_platform_uidx;
CREATE UNIQUE INDEX webinar_registrations_platform_uidx
  ON public.webinar_registrations (webinar_id, student_id)
  WHERE registration_type = 'platform'::public.webinar_registration_type
    AND student_id IS NOT NULL;

DROP INDEX IF EXISTS webinar_registrations_guest_email_uidx;
CREATE UNIQUE INDEX webinar_registrations_guest_email_uidx
  ON public.webinar_registrations (webinar_id, lower(guest_email))
  WHERE registration_type = 'non_platform'::public.webinar_registration_type
    AND guest_email IS NOT NULL;
