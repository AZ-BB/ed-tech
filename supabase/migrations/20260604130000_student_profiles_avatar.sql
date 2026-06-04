-- Profile photo for student accounts (student portal settings).

ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.student_profiles.avatar_url IS
    'Public URL for the student profile photo (student portal settings).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'student-avatars',
    'student-avatars',
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

CREATE POLICY student_avatars_public_read ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'student-avatars');
