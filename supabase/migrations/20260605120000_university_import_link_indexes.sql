-- Deduplicate program-link tables, then add unique indexes for fast import lookups.

-- 1. majors: collapse duplicate names (keep lowest id)
UPDATE public.programs p
SET major_id = keeper.keeper_id
FROM (
  SELECT id, MIN(id) OVER (PARTITION BY name) AS keeper_id
  FROM public.majors
) keeper
WHERE p.major_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

UPDATE public.university_majors um
SET major_id = keeper.keeper_id
FROM (
  SELECT id, MIN(id) OVER (PARTITION BY name) AS keeper_id
  FROM public.majors
) keeper
WHERE um.major_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

DELETE FROM public.majors a
USING public.majors b
WHERE a.name = b.name
  AND a.id > b.id;

-- 2. programs: collapse duplicate (major_id, name)
UPDATE public.university_major_programs ump
SET program_id = keeper.keeper_id
FROM (
  SELECT id, MIN(id) OVER (PARTITION BY major_id, name) AS keeper_id
  FROM public.programs
) keeper
WHERE ump.program_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

DELETE FROM public.programs a
USING public.programs b
WHERE a.major_id = b.major_id
  AND a.name = b.name
  AND a.id > b.id;

-- 3. university_majors: collapse duplicate (university_id, major_id)
UPDATE public.university_major_programs ump
SET university_major_id = keeper.keeper_id
FROM (
  SELECT id, MIN(id) OVER (PARTITION BY university_id, major_id) AS keeper_id
  FROM public.university_majors
) keeper
WHERE ump.university_major_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

DELETE FROM public.university_majors a
USING public.university_majors b
WHERE a.university_id = b.university_id
  AND a.major_id = b.major_id
  AND a.id > b.id;

-- 4. university_major_programs: collapse duplicate (university_major_id, program_id)
DELETE FROM public.university_major_programs a
USING public.university_major_programs b
WHERE a.university_major_id = b.university_major_id
  AND a.program_id = b.program_id
  AND a.id > b.id;

-- 5. unique indexes aligned with import getOrCreate lookups
CREATE UNIQUE INDEX IF NOT EXISTS majors_name_uidx
  ON public.majors (name);

CREATE UNIQUE INDEX IF NOT EXISTS programs_major_id_name_uidx
  ON public.programs (major_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS university_majors_university_id_major_id_uidx
  ON public.university_majors (university_id, major_id);

CREATE UNIQUE INDEX IF NOT EXISTS university_major_programs_uni_major_program_uidx
  ON public.university_major_programs (university_major_id, program_id);

CREATE INDEX IF NOT EXISTS university_major_programs_university_major_id_idx
  ON public.university_major_programs (university_major_id);
