-- Cover/banner image for university detail pages.

ALTER TABLE universities
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT NULL;
