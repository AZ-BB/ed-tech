-- Overall essay review limit for free (unpaid) funnel students (empty value = unlimited).

INSERT INTO public.system (key, value)
VALUES ('ai_funnel_overall_limit_essay_review', '')
ON CONFLICT (key) DO NOTHING;
