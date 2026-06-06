-- Queue university program imports in temp_meta_data; process via pg_cron in batches.

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS temp_meta_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.universities.temp_meta_data IS
  'Queued import program payload ({ version, majors }). Cleared by process_university_import_meta_batch after sync.';

CREATE INDEX IF NOT EXISTS universities_temp_meta_data_pending_idx
  ON public.universities (updated_at ASC)
  WHERE temp_meta_data IS NOT NULL;

-- Sync majors/programs/links for one university from queued JSON (mirrors university-csv-import syncProgramsForRow).
CREATE OR REPLACE FUNCTION public.sync_university_programs_from_meta (
  p_university_id uuid,
  p_meta jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  major_rec RECORD;
  program_name text;
  v_major_id int;
  v_uni_major_id int;
  v_program_id int;
BEGIN
  IF p_meta IS NULL THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE desired_program_links (
    major_name text NOT NULL,
    program_name text NOT NULL,
    PRIMARY KEY (major_name, program_name)
  ) ON COMMIT DROP;

  FOR major_rec IN
    SELECT btrim(elem->>'name') AS major_name, elem->'programs' AS programs_json
    FROM jsonb_array_elements(COALESCE(p_meta->'majors', '[]'::jsonb)) AS elem
    WHERE btrim(elem->>'name') <> ''
  LOOP
    IF major_rec.programs_json IS NOT NULL AND jsonb_typeof(major_rec.programs_json) = 'array' THEN
      FOR program_name IN
        SELECT btrim(value::text)
        FROM jsonb_array_elements_text(major_rec.programs_json) AS t(value)
        WHERE btrim(value::text) <> ''
      LOOP
        INSERT INTO desired_program_links (major_name, program_name)
        VALUES (major_rec.major_name, program_name)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;

  -- Remove program links not in desired set.
  DELETE FROM public.university_major_programs ump
  USING public.university_majors um
  JOIN public.majors m ON m.id = um.major_id
  JOIN public.programs p ON p.id = ump.program_id
  WHERE um.university_id = p_university_id
    AND ump.university_major_id = um.id
    AND NOT EXISTS (
      SELECT 1
      FROM desired_program_links d
      WHERE d.major_name = m.name
        AND d.program_name = p.name
    );

  -- Remove majors (and any remaining links) not in desired set.
  DELETE FROM public.university_major_programs ump
  USING public.university_majors um
  JOIN public.majors m ON m.id = um.major_id
  WHERE um.university_id = p_university_id
    AND ump.university_major_id = um.id
    AND NOT EXISTS (
      SELECT 1
      FROM desired_program_links d
      WHERE d.major_name = m.name
    );

  DELETE FROM public.university_majors um
  USING public.majors m
  WHERE um.university_id = p_university_id
    AND um.major_id = m.id
    AND NOT EXISTS (
      SELECT 1
      FROM desired_program_links d
      WHERE d.major_name = m.name
    );

  -- Upsert desired majors, programs, and links.
  FOR major_rec IN
    SELECT DISTINCT major_name
    FROM desired_program_links
    ORDER BY major_name
  LOOP
    INSERT INTO public.majors (name)
    VALUES (major_rec.major_name)
    ON CONFLICT (name) DO UPDATE
      SET name = EXCLUDED.name
    RETURNING id INTO v_major_id;

    INSERT INTO public.university_majors (university_id, major_id)
    VALUES (p_university_id, v_major_id)
    ON CONFLICT (university_id, major_id) DO UPDATE
      SET university_id = EXCLUDED.university_id
    RETURNING id INTO v_uni_major_id;

    FOR program_name IN
      SELECT d.program_name
      FROM desired_program_links d
      WHERE d.major_name = major_rec.major_name
      ORDER BY d.program_name
    LOOP
      INSERT INTO public.programs (major_id, name)
      VALUES (v_major_id, program_name)
      ON CONFLICT (name) DO UPDATE
        SET name = EXCLUDED.name
      RETURNING id INTO v_program_id;

      INSERT INTO public.university_major_programs (university_major_id, program_id)
      VALUES (v_uni_major_id, v_program_id)
      ON CONFLICT (university_major_id, program_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_university_programs_from_meta (uuid, jsonb) FROM PUBLIC;

COMMENT ON FUNCTION public.sync_university_programs_from_meta (uuid, jsonb) IS
  'Apply queued import program majors/links for one university; mirrors university-csv-import syncProgramsForRow.';

CREATE OR REPLACE FUNCTION public.process_university_import_meta_batch (p_limit int DEFAULT 300)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  processed_count int := 0;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 300;
  END IF;

  FOR r IN
    SELECT id, temp_meta_data
    FROM public.universities
    WHERE temp_meta_data IS NOT NULL
    ORDER BY updated_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM public.sync_university_programs_from_meta(r.id, r.temp_meta_data);

      UPDATE public.universities
      SET
        temp_meta_data = NULL,
        updated_at = now()
      WHERE id = r.id;

      processed_count := processed_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'university import meta sync failed for %: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN processed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_university_import_meta_batch (int) FROM PUBLIC;

COMMENT ON FUNCTION public.process_university_import_meta_batch (int) IS
  'pg_cron: process up to p_limit universities with queued temp_meta_data; clears column on success.';

DO $$
DECLARE
  j RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR j IN
      SELECT jobid FROM cron.job WHERE jobname = 'university-import-meta-batch'
    LOOP
      PERFORM cron.unschedule(j.jobid);
    END LOOP;
    PERFORM cron.schedule(
      'university-import-meta-batch',
      '*/20 * * * *',
      'SELECT public.process_university_import_meta_batch(300);'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;
