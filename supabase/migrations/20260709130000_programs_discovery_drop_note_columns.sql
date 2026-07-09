ALTER TABLE public.programs_discovery
  DROP COLUMN IF EXISTS ranking_note,
  DROP COLUMN IF EXISTS tuition_note,
  DROP COLUMN IF EXISTS program_short_description,
  DROP COLUMN IF EXISTS program_school_note;
