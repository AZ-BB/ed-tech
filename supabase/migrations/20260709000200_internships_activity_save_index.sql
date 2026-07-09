CREATE TABLE public.programs_discovery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,

    category TEXT NOT NULL,

    short_description TEXT,
    description TEXT,

    characteristic_ids TEXT[],
    tags TEXT[],

    salary_potential TEXT,
    demand_level TEXT,
    math_intensity TEXT,
    ai_resilience TEXT,

    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,

    -- JSON Sections
    career_paths JSONB,
    core_skills JSONB,
    study_plan JSONB,
    day_in_life JSONB,
    salary_regions JSONB,
    career_examples JSONB,
    employers JSONB,
    videos JSONB,

    self_assessment_questions JSONB,
    careers JSONB,
    industries JSONB,
    notable_employers JSONB,
    things_to_know JSONB,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.programs_discovery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS programs_discovery_select_authenticated ON public.programs_discovery;
CREATE POLICY programs_discovery_select_authenticated
  ON public.programs_discovery
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS programs_discovery_insert_admins ON public.programs_discovery;
CREATE POLICY programs_discovery_insert_admins
  ON public.programs_discovery
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS programs_discovery_update_admins ON public.programs_discovery;
CREATE POLICY programs_discovery_update_admins
  ON public.programs_discovery
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS programs_discovery_delete_admins ON public.programs_discovery;
CREATE POLICY programs_discovery_delete_admins
  ON public.programs_discovery
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs_discovery TO authenticated;
GRANT ALL ON public.programs_discovery TO service_role;

