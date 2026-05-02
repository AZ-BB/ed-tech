-- Postgres has no CREATE TYPE ... IF NOT EXISTS for enums; gate on pg_type instead.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_type t
        INNER JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'university_difficulty'
    ) THEN
        CREATE TYPE public.university_difficulty AS ENUM ('easy', 'medium', 'hard');
    END IF;
END
$$;

ALTER TABLE public.universities
    ADD COLUMN IF NOT EXISTS difficulty public.university_difficulty DEFAULT NULL;
