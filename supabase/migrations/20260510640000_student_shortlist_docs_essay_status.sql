-- Counselor / student shortlist: per-university docs & essay tracking for school portal.

ALTER TABLE public.student_shortlist_universities
  ADD COLUMN IF NOT EXISTS docs_status TEXT NOT NULL DEFAULT 'not_completed',
  ADD COLUMN IF NOT EXISTS essay_status TEXT NOT NULL DEFAULT 'not_reviewed';

ALTER TABLE public.student_shortlist_universities
  DROP CONSTRAINT IF EXISTS student_shortlist_universities_docs_status_check;

ALTER TABLE public.student_shortlist_universities
  ADD CONSTRAINT student_shortlist_universities_docs_status_check
    CHECK (docs_status IN ('completed', 'not_completed'));

ALTER TABLE public.student_shortlist_universities
  DROP CONSTRAINT IF EXISTS student_shortlist_universities_essay_status_check;

ALTER TABLE public.student_shortlist_universities
  ADD CONSTRAINT student_shortlist_universities_essay_status_check
    CHECK (essay_status IN ('approved', 'not_reviewed'));
