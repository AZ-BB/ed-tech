ALTER TABLE advisors
  ADD COLUMN IF NOT EXISTS receives_free_funnel_application_support BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS advisors_one_free_funnel_application_support_receiver
  ON advisors ((receives_free_funnel_application_support))
  WHERE receives_free_funnel_application_support IS TRUE;
