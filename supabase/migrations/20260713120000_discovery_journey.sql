-- Discovery Journey: JSONB-centric config + student attempts

CREATE TABLE public.discovery_modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  number TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  answer_format TEXT NOT NULL,
  num_items INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES public.admins (id) ON DELETE SET NULL
);

CREATE INDEX discovery_modules_is_active_sort_idx
  ON public.discovery_modules (is_active, sort_order);

CREATE TABLE public.discovery_settings (
  id TEXT PRIMARY KEY,
  scales_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  combined_profiles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES public.admins (id) ON DELETE SET NULL
);

INSERT INTO public.discovery_settings (id, scales_json, combined_profiles_json, scoring_rules_json)
VALUES (
  'default',
  '{}'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'rating_1_5', jsonb_build_object('maxValue', 5),
    'forced_choice', jsonb_build_object('questionsPerPole', 3),
    'profile_match', jsonb_build_object('topCategoryBonus', 10),
    'confidence', jsonb_build_object('strongMinGap', 18, 'emergingMinGap', 8),
    'flags', jsonb_build_object(
      'straightLiningMinRatio', 0.8,
      'neutralHeavyMinRatio', 0.5,
      'neutralValue', 3,
      'lowVarianceRatingMaxSpread', 6,
      'lowVarianceForcedScenarioMaxSpread', 12
    )
  )
);

CREATE TABLE public.student_discovery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES public.discovery_modules (id) ON DELETE RESTRICT,
  answers_json JSONB NOT NULL,
  result_json JSONB NOT NULL,
  config_version INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT student_discovery_attempts_student_module_key UNIQUE (student_id, module_id)
);

CREATE INDEX student_discovery_attempts_student_id_idx
  ON public.student_discovery_attempts (student_id);

CREATE TABLE public.student_discovery_profiles (
  student_id UUID PRIMARY KEY REFERENCES public.student_profiles (id) ON DELETE CASCADE,
  completed_modules TEXT[] NOT NULL DEFAULT '{}',
  combined_profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  config_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION public.set_discovery_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER discovery_modules_set_updated_at
  BEFORE UPDATE ON public.discovery_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_discovery_updated_at();

CREATE TRIGGER discovery_settings_set_updated_at
  BEFORE UPDATE ON public.discovery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_discovery_updated_at();

CREATE TRIGGER student_discovery_attempts_set_updated_at
  BEFORE UPDATE ON public.student_discovery_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_discovery_updated_at();

CREATE TRIGGER student_discovery_profiles_set_updated_at
  BEFORE UPDATE ON public.student_discovery_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_discovery_updated_at();

ALTER TABLE public.discovery_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_discovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_discovery_profiles ENABLE ROW LEVEL SECURITY;

-- Students read active modules (content served via API with service role; authenticated read for future use)
CREATE POLICY "discovery_modules_select_authenticated"
  ON public.discovery_modules
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "student_discovery_attempts_select_own"
  ON public.student_discovery_attempts
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "student_discovery_attempts_insert_own"
  ON public.student_discovery_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "student_discovery_attempts_update_own"
  ON public.student_discovery_attempts
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "student_discovery_profiles_select_own"
  ON public.student_discovery_profiles
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "student_discovery_profiles_insert_own"
  ON public.student_discovery_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "student_discovery_profiles_update_own"
  ON public.student_discovery_profiles
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

GRANT SELECT ON public.discovery_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_discovery_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_discovery_profiles TO authenticated;
