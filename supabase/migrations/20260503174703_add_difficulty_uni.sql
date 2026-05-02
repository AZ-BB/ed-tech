CREATE TYPE university_difficulty AS ENUM ('easy', 'medium', 'hard');

ALTER TABLE universities ADD COLUMN difficulty university_difficulty DEFAULT NULL;