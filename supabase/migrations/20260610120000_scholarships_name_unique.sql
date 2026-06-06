-- Deduplicate scholarships by exact name, then enforce unique index for import upsert.

UPDATE public.scholarships
SET name = btrim(name)
WHERE name IS DISTINCT FROM btrim(name);

-- Drop destination rows on duplicate scholarships when the keeper already has that country.
DELETE FROM public.scholarship_destinations sd
USING (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY name ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS keeper_id
  FROM public.scholarships
) keeper
WHERE sd.scholarship_id = keeper.id
  AND keeper.id <> keeper.keeper_id
  AND EXISTS (
    SELECT 1
    FROM public.scholarship_destinations existing
    WHERE existing.scholarship_id = keeper.keeper_id
      AND existing.country_code = sd.country_code
  );

UPDATE public.scholarship_destinations sd
SET scholarship_id = keeper.keeper_id
FROM (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY name ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS keeper_id
  FROM public.scholarships
) keeper
WHERE sd.scholarship_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

-- Drop student activity rows that would duplicate after merge.
DELETE FROM public.student_activities sa
USING (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY name ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS keeper_id
  FROM public.scholarships
) keeper
WHERE sa.scholarship_id = keeper.id
  AND keeper.id <> keeper.keeper_id
  AND sa.entity_type = 'scholarship'::public.student_activity_entity_type
  AND EXISTS (
    SELECT 1
    FROM public.student_activities existing
    WHERE existing.student_id = sa.student_id
      AND existing.type = sa.type
      AND existing.entity_type = sa.entity_type
      AND existing.scholarship_id = keeper.keeper_id
  );

UPDATE public.student_activities sa
SET scholarship_id = keeper.keeper_id
FROM (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY name ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS keeper_id
  FROM public.scholarships
) keeper
WHERE sa.scholarship_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

DELETE FROM public.scholarships a
USING public.scholarships b
WHERE a.name = b.name
  AND a.created_at > b.created_at;

DELETE FROM public.scholarships a
USING public.scholarships b
WHERE a.name = b.name
  AND a.created_at = b.created_at
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS scholarships_name_uidx
  ON public.scholarships (name);
