-- Deduplicate universities by exact name, then enforce unique index for import upsert.

UPDATE public.universities
SET name = btrim(name)
WHERE name IS DISTINCT FROM btrim(name);

-- Repoint FKs from duplicate university rows to the keeper (earliest created_at, then id).
UPDATE public.university_majors um
SET university_id = keeper.keeper_id
FROM (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY name ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS keeper_id
  FROM public.universities
) keeper
WHERE um.university_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

UPDATE public.ambassadors a
SET university_id = keeper.keeper_id
FROM (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY name ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS keeper_id
  FROM public.universities
) keeper
WHERE a.university_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

UPDATE public.student_activities sa
SET uni_id = keeper.keeper_id
FROM (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY name ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS keeper_id
  FROM public.universities
) keeper
WHERE sa.uni_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

-- Drop shortlist rows that would violate (student_id, catalog_university_id) after merge.
DELETE FROM public.student_shortlist_universities ssu
USING (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY name ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS keeper_id
  FROM public.universities
) keeper
WHERE ssu.catalog_university_id = keeper.id
  AND keeper.id <> keeper.keeper_id
  AND EXISTS (
    SELECT 1
    FROM public.student_shortlist_universities existing
    WHERE existing.student_id = ssu.student_id
      AND existing.catalog_university_id = keeper.keeper_id
  );

UPDATE public.student_shortlist_universities ssu
SET catalog_university_id = keeper.keeper_id
FROM (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY name ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS keeper_id
  FROM public.universities
) keeper
WHERE ssu.catalog_university_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

-- Collapse duplicate university_majors created by repointing.
UPDATE public.university_major_programs ump
SET university_major_id = keeper.keeper_id
FROM (
  SELECT id,
         MIN(id) OVER (PARTITION BY university_id, major_id) AS keeper_id
  FROM public.university_majors
) keeper
WHERE ump.university_major_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

DELETE FROM public.university_majors a
USING public.university_majors b
WHERE a.university_id = b.university_id
  AND a.major_id = b.major_id
  AND a.id > b.id;

DELETE FROM public.universities a
USING public.universities b
WHERE a.name = b.name
  AND a.created_at > b.created_at;

DELETE FROM public.universities a
USING public.universities b
WHERE a.name = b.name
  AND a.created_at = b.created_at
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS universities_name_uidx
  ON public.universities (name);
