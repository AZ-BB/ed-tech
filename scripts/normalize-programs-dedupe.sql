-- =============================================================================
-- Programs normalize & dedupe — run in Supabase SQL Editor
-- =============================================================================
-- Preview sections are read-only. Run the FIX section only after reviewing.
--
-- Uniqueness target: name (globally unique). One program row per name; the
-- major↔program relationship lives in university_major_programs (via
-- university_majors), not in programs.major_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PREVIEW 1: Duplicate program names (same name, different ids / majors)
--              These will be merged; lowest id is kept.
-- -----------------------------------------------------------------------------
SELECT
  p.name AS program_name,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(p.id ORDER BY p.id) AS program_ids,
  MIN(p.id) AS keeper_id,
  ARRAY_AGG(DISTINCT p.major_id ORDER BY p.major_id) AS major_ids,
  ARRAY_AGG(DISTINCT m.name ORDER BY m.name) AS major_names
FROM public.programs p
JOIN public.majors m ON m.id = p.major_id
GROUP BY p.name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, program_name;

-- -----------------------------------------------------------------------------
-- PREVIEW 2: Names with extra whitespace (will be trimmed)
-- -----------------------------------------------------------------------------
SELECT id, major_id, name, btrim(name) AS trimmed_name
FROM public.programs
WHERE name IS DISTINCT FROM btrim(name)
ORDER BY id;

-- -----------------------------------------------------------------------------
-- PREVIEW 3: Trim would create new name collisions (review before fix)
-- -----------------------------------------------------------------------------
SELECT btrim(name) AS trimmed_name, COUNT(*) AS cnt, ARRAY_AGG(id ORDER BY id) AS ids
FROM public.programs
GROUP BY btrim(name)
HAVING COUNT(*) > 1
ORDER BY cnt DESC, trimmed_name;

-- -----------------------------------------------------------------------------
-- PREVIEW 4: Duplicate uni-major ↔ program links (collapsed after merge)
-- -----------------------------------------------------------------------------
SELECT
  ump.university_major_id,
  ump.program_id,
  COUNT(*) AS link_count,
  ARRAY_AGG(ump.id ORDER BY ump.id) AS link_ids
FROM public.university_major_programs ump
GROUP BY ump.university_major_id, ump.program_id
HAVING COUNT(*) > 1
ORDER BY link_count DESC;

-- -----------------------------------------------------------------------------
-- PREVIEW 5: Links that will survive merge (program name shared across majors)
-- -----------------------------------------------------------------------------
SELECT
  p.name AS program_name,
  COUNT(DISTINCT um.major_id) AS linked_major_count,
  COUNT(DISTINCT um.university_id) AS linked_university_count,
  COUNT(*) AS link_count
FROM public.university_major_programs ump
JOIN public.university_majors um ON um.id = ump.university_major_id
JOIN public.programs p ON p.id = ump.program_id
GROUP BY p.name
HAVING COUNT(DISTINCT um.major_id) > 1
ORDER BY linked_major_count DESC, program_name;

-- =============================================================================
-- FIX — one row per program name; preserve uni/major links via junction table
-- =============================================================================

BEGIN;

-- Remove old per-(major_id,name) index if present (blocks global name uniqueness goal)
DROP INDEX IF EXISTS public.programs_major_id_name_uidx;

-- 1. Trim whitespace on program names
UPDATE public.programs
SET name = btrim(name)
WHERE name IS DISTINCT FROM btrim(name);

-- 2. Repoint university_major_programs from duplicate program ids → keeper (lowest id per name)
UPDATE public.university_major_programs ump
SET program_id = keeper.keeper_id
FROM (
  SELECT id,
         MIN(id) OVER (PARTITION BY name) AS keeper_id
  FROM public.programs
) keeper
WHERE ump.program_id = keeper.id
  AND keeper.id <> keeper.keeper_id;

-- 3. Delete duplicate program rows (same name; keep lowest id)
DELETE FROM public.programs a
USING public.programs b
WHERE a.name = b.name
  AND a.id > b.id;

-- 4. Collapse duplicate university_major_programs rows created by repointing
DELETE FROM public.university_major_programs a
USING public.university_major_programs b
WHERE a.university_major_id = b.university_major_id
  AND a.program_id = b.program_id
  AND a.id > b.id;

-- 5. Enforce globally unique program names
CREATE UNIQUE INDEX IF NOT EXISTS programs_name_uidx
  ON public.programs (name);

COMMIT;

-- -----------------------------------------------------------------------------
-- VERIFY: should return 0 rows
-- -----------------------------------------------------------------------------
SELECT name, COUNT(*) AS cnt
FROM public.programs
GROUP BY name
HAVING COUNT(*) > 1;
