-- Link My Applications shortlist rows to catalog universities when the student
-- shortlists from University Search (or moves from Favorites).

ALTER TABLE public.student_shortlist_universities
  ADD COLUMN IF NOT EXISTS catalog_university_id UUID REFERENCES public.universities (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_shortlist_universities_catalog_uni_idx
  ON public.student_shortlist_universities (catalog_university_id)
  WHERE catalog_university_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS student_shortlist_universities_student_catalog_uni_unique
  ON public.student_shortlist_universities (student_id, catalog_university_id)
  WHERE catalog_university_id IS NOT NULL;

-- Backfill: one application shortlist row per existing discovery shortlist activity.
INSERT INTO public.student_shortlist_universities (
  student_id,
  university_name,
  country,
  major_program,
  application_method,
  application_deadline,
  status,
  decision,
  sort_order,
  catalog_university_id
)
SELECT
  q.student_id,
  q.university_name,
  q.country,
  q.major_program,
  q.application_method,
  q.application_deadline,
  q.status,
  q.decision,
  q.base_max + q.rn,
  q.catalog_university_id
FROM (
  SELECT DISTINCT ON (sa.student_id, sa.uni_id)
    sa.student_id,
    u.name AS university_name,
    COALESCE(co.name, u.country_code) AS country,
    'Undecided'::text AS major_program,
    COALESCE(NULLIF(trim(u.method), ''), 'Direct application via university website') AS application_method,
    u.deadline_date AS application_deadline,
    'considering'::text AS status,
    NULL::text AS decision,
    sa.uni_id AS catalog_university_id,
    ROW_NUMBER() OVER (
      PARTITION BY sa.student_id
      ORDER BY sa.created_at DESC NULLS LAST
    ) AS rn,
    (
      SELECT COALESCE(MAX(s.sort_order), -1)
      FROM public.student_shortlist_universities s
      WHERE s.student_id = sa.student_id
    ) AS base_max
  FROM public.student_activities sa
  INNER JOIN public.universities u ON u.id = sa.uni_id
  LEFT JOIN public.countries co ON co.id = u.country_code
  WHERE sa.entity_type = 'university'
    AND sa.type = 'shortlist'
    AND sa.uni_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.student_shortlist_universities existing
      WHERE existing.student_id = sa.student_id
        AND existing.catalog_university_id = sa.uni_id
    )
  ORDER BY sa.student_id, sa.uni_id, sa.created_at DESC NULLS LAST
) q;
