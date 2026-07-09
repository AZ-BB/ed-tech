-- Links universities to programs_discovery with per-university program notes.
-- Import Excel uses program_id = programs_discovery.slug and university_name for lookup.

CREATE TABLE public.university_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.programs_discovery(id) ON DELETE CASCADE,

    ranking_note TEXT,
    tuition_note TEXT,
    short_description TEXT,
    program_school_note TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (university_id, program_id)
);

CREATE INDEX university_programs_university_id_idx
    ON public.university_programs (university_id);

CREATE INDEX university_programs_program_id_idx
    ON public.university_programs (program_id);

ALTER TABLE public.university_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS university_programs_select_authenticated ON public.university_programs;
CREATE POLICY university_programs_select_authenticated
  ON public.university_programs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS university_programs_insert_admins ON public.university_programs;
CREATE POLICY university_programs_insert_admins
  ON public.university_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS university_programs_update_admins ON public.university_programs;
CREATE POLICY university_programs_update_admins
  ON public.university_programs
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS university_programs_delete_admins ON public.university_programs;
CREATE POLICY university_programs_delete_admins
  ON public.university_programs
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.university_programs TO authenticated;
GRANT ALL ON public.university_programs TO service_role;
