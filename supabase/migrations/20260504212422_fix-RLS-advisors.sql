-- If you already applied an older 20260504202530_rls_advisors_advisor_sessions.sql with strict
-- student_profiles / admins EXISTS checks, run this migration to restore catalog reads.
-- (Fresh installs use the relaxed policies in the updated 20260504202530 file.)

DROP POLICY IF EXISTS advisors_select_catalog ON public.advisors;
CREATE POLICY advisors_select_catalog
  ON public.advisors
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS advisor_tags_select_authenticated ON public.advisor_tags;
CREATE POLICY advisor_tags_select_authenticated
  ON public.advisor_tags
  FOR SELECT
  TO authenticated
  USING (true);

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

GRANT SELECT ON public.advisors TO authenticated;
GRANT SELECT ON public.advisor_tags TO authenticated;
GRANT SELECT ON public.advisor_tags_joint TO authenticated;
GRANT SELECT ON public.advisor_specializations_countries TO authenticated;
GRANT SELECT, INSERT ON public.advisor_sessions TO authenticated;
