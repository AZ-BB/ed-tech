-- Student activities: program discovery FK (enum value added here; unique index in follow-up migration)

ALTER TYPE public.student_activity_entity_type ADD VALUE IF NOT EXISTS 'program';

ALTER TABLE public.student_activities
  ADD COLUMN IF NOT EXISTS program_discovery_id UUID REFERENCES public.programs_discovery (id) ON DELETE CASCADE;
