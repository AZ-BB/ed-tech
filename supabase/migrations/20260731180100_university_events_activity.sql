-- Student save activity for university events (enum + FK; index in follow-up migration)

ALTER TYPE public.student_activity_entity_type ADD VALUE IF NOT EXISTS 'event';

ALTER TABLE public.student_activities
  ADD COLUMN IF NOT EXISTS university_event_id UUID REFERENCES public.university_events (id);
