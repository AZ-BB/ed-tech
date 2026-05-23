-- Public storage bucket for university logo images migrated from external URLs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'university-logos',
    'university-logos',
    true,
    5242880,
    ARRAY[
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/gif',
        'image/svg+xml'
    ]::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY university_logos_public_read ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'university-logos');
