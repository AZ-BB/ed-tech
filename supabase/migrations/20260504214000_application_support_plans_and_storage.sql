-- Application Support: default plans (5 / 10 / 15 universities) and document storage bucket.

INSERT INTO public.applications_plans (name, description, price, universities_count, is_most_popular, is_active)
SELECT v.name, v.description, v.price, v.universities_count, v.is_most_popular, true
FROM (
  VALUES
    ('5 Universities'::text, 'Best for focused applications with a clear shortlist'::text, 2000::int, 5::int, false::boolean),
    ('10 Universities'::text, 'Balanced approach for the strongest chances of acceptance'::text, 3500::int, 10::int, true::boolean),
    ('15 Universities'::text, 'Maximize your chances across more programs and countries'::text, 5000::int, 15::int, false::boolean)
) AS v(name, description, price, universities_count, is_most_popular)
WHERE NOT EXISTS (
  SELECT 1 FROM public.applications_plans p WHERE p.universities_count = v.universities_count
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents',
  'application-documents',
  false,
  52428800,
  NULL
)
ON CONFLICT (id) DO NOTHING;
