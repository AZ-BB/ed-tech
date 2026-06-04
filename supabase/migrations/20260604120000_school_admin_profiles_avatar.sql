-- Profile photo for school portal accounts (teachers / counselors).

ALTER TABLE public.school_admin_profiles
    ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.school_admin_profiles.avatar_url IS
    'Public URL for the counselor/teacher profile photo (school portal settings).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'school-admin-avatars',
    'school-admin-avatars',
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

CREATE POLICY school_admin_avatars_public_read ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'school-admin-avatars');
