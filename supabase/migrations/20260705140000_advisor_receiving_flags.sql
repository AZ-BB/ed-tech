ALTER TABLE advisors
  ADD COLUMN IF NOT EXISTS receives_application_support BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS receives_post_admission_support BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS advisors_one_application_support_receiver
  ON advisors ((receives_application_support))
  WHERE receives_application_support IS TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS advisors_one_post_admission_support_receiver
  ON advisors ((receives_post_admission_support))
  WHERE receives_post_admission_support IS TRUE;
