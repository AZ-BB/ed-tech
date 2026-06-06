-- Fix batch sync: reuse temp table across universities in the same transaction.

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

  CREATE TEMP TABLE IF NOT EXISTS desired_program_links (
    major_name text NOT NULL,
    program_name text NOT NULL,
    PRIMARY KEY (major_name, program_name)
  ) ON COMMIT DROP;

  TRUNCATE TABLE desired_program_links;

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
  USING public.university_majors um,
        public.majors m,
        public.programs p
  WHERE um.university_id = p_university_id
    AND ump.university_major_id = um.id
    AND m.id = um.major_id
    AND p.id = ump.program_id
    AND NOT EXISTS (
      SELECT 1
      FROM desired_program_links d
      WHERE d.major_name = m.name
        AND d.program_name = p.name
    );

  -- Remove majors (and any remaining links) not in desired set.
  DELETE FROM public.university_major_programs ump
  USING public.university_majors um,
        public.majors m
  WHERE um.university_id = p_university_id
    AND ump.university_major_id = um.id
    AND m.id = um.major_id
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
