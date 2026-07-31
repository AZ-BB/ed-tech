-- Index for event saves (must run after enum value 'event' is committed)

CREATE INDEX IF NOT EXISTS student_activities_event_save_idx
  ON public.student_activities (student_id, university_event_id)
  WHERE entity_type = 'event'
    AND type = 'save'
    AND university_event_id IS NOT NULL;
