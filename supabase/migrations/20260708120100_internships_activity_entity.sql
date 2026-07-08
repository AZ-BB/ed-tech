-- Add internship to student_activity_entity_type.
-- Index that references the new value must live in a later migration
-- (Postgres forbids using a newly added enum value in the same transaction).

ALTER TYPE public.student_activity_entity_type ADD VALUE IF NOT EXISTS 'internship';
