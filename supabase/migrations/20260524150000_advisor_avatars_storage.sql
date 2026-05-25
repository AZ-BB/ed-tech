-- Public storage bucket for advisor profile photos.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'advisor-avatars',
    'advisor-avatars',
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

CREATE POLICY advisor_avatars_public_read ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'advisor-avatars');
