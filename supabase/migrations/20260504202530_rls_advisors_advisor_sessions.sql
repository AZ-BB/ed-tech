-- RLS for advisor catalog, junction tables, and advisor_sessions.
-- Matches existing patterns: students/school admins read catalog; platform admins full write;
-- students insert/select own advisor_sessions; service_role bypasses RLS for backend jobs.

-- ---------------------------------------------------------------------------
-- countries: RLS was enabled without policies — allow read for app users
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS countries_select_anon_authenticated ON public.countries;
CREATE POLICY countries_select_anon_authenticated
  ON public.countries
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- advisors
-- ---------------------------------------------------------------------------
ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisors_select_catalog ON public.advisors;
CREATE POLICY advisors_select_catalog
  ON public.advisors
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS advisors_select_admins_all ON public.advisors;
CREATE POLICY advisors_select_admins_all
  ON public.advisors
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS advisors_insert_admins ON public.advisors;
CREATE POLICY advisors_insert_admins
  ON public.advisors
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS advisors_update_admins ON public.advisors;
CREATE POLICY advisors_update_admins
  ON public.advisors
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS advisors_delete_admins ON public.advisors;
CREATE POLICY advisors_delete_admins
  ON public.advisors
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- advisor_tags (lookup)
-- ---------------------------------------------------------------------------
ALTER TABLE public.advisor_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_tags_select_authenticated ON public.advisor_tags;
CREATE POLICY advisor_tags_select_authenticated
  ON public.advisor_tags
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS advisor_tags_write_admins ON public.advisor_tags;
CREATE POLICY advisor_tags_write_admins
  ON public.advisor_tags
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- advisor_tags_joint
-- ---------------------------------------------------------------------------
ALTER TABLE public.advisor_tags_joint ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_tags_joint_select_catalog ON public.advisor_tags_joint;
CREATE POLICY advisor_tags_joint_select_catalog
  ON public.advisor_tags_joint
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.advisors adv
      WHERE adv.id = advisor_tags_joint.advisor_id
        AND adv.is_active = true
    )
  );

DROP POLICY IF EXISTS advisor_tags_joint_write_admins ON public.advisor_tags_joint;
CREATE POLICY advisor_tags_joint_write_admins
  ON public.advisor_tags_joint
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- advisor_specializations_countries
-- ---------------------------------------------------------------------------
ALTER TABLE public.advisor_specializations_countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_spec_countries_select_catalog ON public.advisor_specializations_countries;
CREATE POLICY advisor_spec_countries_select_catalog
  ON public.advisor_specializations_countries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.advisors adv
      WHERE adv.id = advisor_specializations_countries.advisor_id
        AND adv.is_active = true
    )
  );

DROP POLICY IF EXISTS advisor_spec_countries_write_admins ON public.advisor_specializations_countries;
CREATE POLICY advisor_spec_countries_write_admins
  ON public.advisor_specializations_countries
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- advisor_sessions
-- ---------------------------------------------------------------------------
ALTER TABLE public.advisor_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_sessions_select_own ON public.advisor_sessions;
CREATE POLICY advisor_sessions_select_own
  ON public.advisor_sessions
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS advisor_sessions_select_admins ON public.advisor_sessions;
CREATE POLICY advisor_sessions_select_admins
  ON public.advisor_sessions
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS advisor_sessions_insert_own ON public.advisor_sessions;
CREATE POLICY advisor_sessions_insert_own
  ON public.advisor_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS advisor_sessions_update_admins ON public.advisor_sessions;
CREATE POLICY advisor_sessions_update_admins
  ON public.advisor_sessions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS advisor_sessions_delete_admins ON public.advisor_sessions;
CREATE POLICY advisor_sessions_delete_admins
  ON public.advisor_sessions
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Explicit privileges (some environments default-deny without GRANT)
GRANT SELECT ON public.advisors TO authenticated;
GRANT SELECT ON public.advisor_tags TO authenticated;
GRANT SELECT ON public.advisor_tags_joint TO authenticated;
GRANT SELECT ON public.advisor_specializations_countries TO authenticated;
GRANT SELECT, INSERT ON public.advisor_sessions TO authenticated;
