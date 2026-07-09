ALTER TABLE public.programs_discovery
  DROP COLUMN IF EXISTS self_assessment_questions,
  DROP COLUMN IF EXISTS careers,
  DROP COLUMN IF EXISTS industries,
  DROP COLUMN IF EXISTS notable_employers,
  DROP COLUMN IF EXISTS things_to_know;
