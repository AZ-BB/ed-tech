-- New school rows should start with zero main pool and extra pool unless explicitly set.
ALTER TABLE public.schools
  ALTER COLUMN credit_pool SET DEFAULT 0,
  ALTER COLUMN extra_credits SET DEFAULT 0;
