-- Universities catalog: authenticated users read; mutations limited to platform admins.

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_major_programs ENABLE ROW LEVEL SECURITY;

-- universities
CREATE POLICY universities_select_authenticated
  ON universities
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY universities_insert_admins_only
  ON universities
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY universities_update_admins_only
  ON universities
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY universities_delete_admins_only
  ON universities
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- majors
CREATE POLICY majors_select_authenticated
  ON majors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY majors_insert_admins_only
  ON majors
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY majors_update_admins_only
  ON majors
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY majors_delete_admins_only
  ON majors
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- programs
CREATE POLICY programs_select_authenticated
  ON programs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY programs_insert_admins_only
  ON programs
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY programs_update_admins_only
  ON programs
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY programs_delete_admins_only
  ON programs
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- university_majors
CREATE POLICY university_majors_select_authenticated
  ON university_majors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY university_majors_insert_admins_only
  ON university_majors
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY university_majors_update_admins_only
  ON university_majors
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY university_majors_delete_admins_only
  ON university_majors
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- university_major_programs
CREATE POLICY university_major_programs_select_authenticated
  ON university_major_programs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY university_major_programs_insert_admins_only
  ON university_major_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY university_major_programs_update_admins_only
  ON university_major_programs
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY university_major_programs_delete_admins_only
  ON university_major_programs
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
