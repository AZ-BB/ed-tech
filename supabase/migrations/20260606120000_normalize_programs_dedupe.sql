-- Normalize degree programs: one row per program name.
--
-- The major↔program relationship is stored in university_major_programs (through
-- university_majors), not by duplicating the same name under programs.major_id.
--
-- Safe order:
--   1. Drop old (major_id, name) unique index
--   2. Trim names
--   3. Repoint links from duplicate program ids to the keeper (lowest id per name)
--   4. Delete duplicate program rows
--   5. Collapse duplicate university_major_programs rows created by repointing
--   6. Enforce unique (name)

DROP INDEX IF EXISTS public.programs_major_id_name_uidx;

UPDATE public.programs
SET name = btrim(name)
WHERE name IS DISTINCT FROM btrim(name);

UPDATE public.university_major_programs ump
SET program_id = keeper.keeper_id
FROM (
  SELECT id,
         MIN(id) OVER (PARTITION BY name) AS keeper_id
  FROM public.programs
) keeper
WHERE ump.program_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

DELETE FROM public.programs a
USING public.programs b
WHERE a.name = b.name
  AND a.id > b.id;

DELETE FROM public.university_major_programs a
USING public.university_major_programs b
WHERE a.university_major_id = b.university_major_id
  AND a.program_id = b.program_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS programs_name_uidx
  ON public.programs (name);
