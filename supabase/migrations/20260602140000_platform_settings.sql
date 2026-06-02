-- Platform-wide settings stored in the existing system key/value table.

ALTER TABLE public.system
  ADD CONSTRAINT system_key_unique UNIQUE (key);

INSERT INTO public.system (key, value)
VALUES
  ('default_advisor_credit_limit', '2'),
  ('default_ambassador_credit_limit', '2'),
  ('feature_ai_university_matching', 'true'),
  ('feature_essay_review', 'true'),
  ('feature_advisor_sessions', 'true'),
  ('feature_ambassador_booking', 'true'),
  ('feature_application_support', 'true')
ON CONFLICT (key) DO NOTHING;
