-- Unique save index (runs after enum value is committed)

CREATE UNIQUE INDEX IF NOT EXISTS student_activities_internship_save_uidx
  ON public.student_activities (student_id, internship_id)
  WHERE entity_type = 'internship'
    AND type = 'save'
    AND internship_id IS NOT NULL;
