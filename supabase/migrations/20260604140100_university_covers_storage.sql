-- Public storage bucket for university cover/banner images.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'university-covers',
    'university-covers',
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

CREATE POLICY university_covers_public_read ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'university-covers');
