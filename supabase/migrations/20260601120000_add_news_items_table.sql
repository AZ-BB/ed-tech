DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'news_tag') THEN
        CREATE TYPE public.news_tag AS ENUM ('visa', 'deadline', 'update');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.news_items (
    id SERIAL PRIMARY KEY,
    tag public.news_tag NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
