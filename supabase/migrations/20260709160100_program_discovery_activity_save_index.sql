-- Unique save index (runs after enum value is committed)

CREATE UNIQUE INDEX IF NOT EXISTS student_activities_program_discovery_save_uidx
  ON public.student_activities (student_id, program_discovery_id)
  WHERE entity_type = 'program'
    AND type = 'save'
    AND program_discovery_id IS NOT NULL;
