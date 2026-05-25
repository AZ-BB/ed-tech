-- Public storage bucket for ambassador profile photos.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ambassador-avatars',
    'ambassador-avatars',
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

CREATE POLICY ambassador_avatars_public_read ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'ambassador-avatars');
