-- Custom student type: self-serve signup via /custom with monthly subscription paywall.

ALTER TYPE public.student_type ADD VALUE IF NOT EXISTS 'custom';

COMMENT ON COLUMN public.student_profiles.student_type IS
  'Account origin: school (school invite/signup), individual (self-serve one-time fee), funnel (external provision/API), custom (self-serve monthly subscription via /custom).';
