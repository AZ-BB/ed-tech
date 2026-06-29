-- Optional custom webinar host (when speaker is not an existing advisor).

ALTER TABLE public.webinars
  ALTER COLUMN advisor_id DROP NOT NULL;

ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS host_name TEXT,
  ADD COLUMN IF NOT EXISTS host_title TEXT,
  ADD COLUMN IF NOT EXISTS host_bio TEXT,
  ADD COLUMN IF NOT EXISTS host_image_url TEXT;

ALTER TABLE public.webinars
  DROP CONSTRAINT IF EXISTS webinars_host_source_check;

ALTER TABLE public.webinars
  ADD CONSTRAINT webinars_host_source_check
  CHECK (
    advisor_id IS NOT NULL
    OR NULLIF(TRIM(host_name), '') IS NOT NULL
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'webinar-host-images',
  'webinar-host-images',
  true,
  5242880,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY webinar_host_images_public_read ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'webinar-host-images');
