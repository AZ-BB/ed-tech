-- Student Stories: topics and ambassador video stories for the student portal.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_story_language') THEN
    CREATE TYPE public.student_story_language AS ENUM ('en', 'ar', 'mixed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.student_story_topics (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  gradient_css TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS student_story_topics_sort_order_idx
  ON public.student_story_topics (sort_order);

CREATE TABLE IF NOT EXISTS public.student_stories (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES public.student_story_topics (id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  duration_label TEXT,
  language public.student_story_language,
  ambassador_id UUID NOT NULL REFERENCES public.ambassadors (id) ON DELETE RESTRICT,
  byline_meta_override TEXT,
  is_lead BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS student_stories_topic_id_idx ON public.student_stories (topic_id);
CREATE INDEX IF NOT EXISTS student_stories_ambassador_id_idx ON public.student_stories (ambassador_id);
CREATE INDEX IF NOT EXISTS student_stories_is_active_idx ON public.student_stories (is_active);
CREATE INDEX IF NOT EXISTS student_stories_sort_order_idx ON public.student_stories (sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS student_stories_one_lead_idx
  ON public.student_stories (is_lead)
  WHERE is_lead = TRUE;

-- Seed default topics from the Student Stories HTML reference.
INSERT INTO public.student_story_topics (name, sort_order, gradient_css) VALUES
  ('Applications', 1, 'linear-gradient(150deg,#1B4332,#2D6A4F)'),
  ('Essays', 2, 'linear-gradient(150deg,#22503B,#52B788)'),
  ('Choosing a university', 3, 'linear-gradient(150deg,#1B4332,#40916C)'),
  ('Scholarships & money', 4, 'linear-gradient(150deg,#2c5443,#74C69D)'),
  ('Moving abroad', 5, 'linear-gradient(150deg,#16382a,#52B788)'),
  ('University life', 6, 'linear-gradient(150deg,#2D6A4F,#74C69D)'),
  ('Mistakes to avoid', 7, 'linear-gradient(150deg,#22503B,#40916C)')
ON CONFLICT (name) DO NOTHING;

-- RLS: student_story_topics
ALTER TABLE public.student_story_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_story_topics_select_authenticated ON public.student_story_topics;
CREATE POLICY student_story_topics_select_authenticated
  ON public.student_story_topics
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS student_story_topics_insert_admins ON public.student_story_topics;
CREATE POLICY student_story_topics_insert_admins
  ON public.student_story_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS student_story_topics_update_admins ON public.student_story_topics;
CREATE POLICY student_story_topics_update_admins
  ON public.student_story_topics
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS student_story_topics_delete_admins ON public.student_story_topics;
CREATE POLICY student_story_topics_delete_admins
  ON public.student_story_topics
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- RLS: student_stories
ALTER TABLE public.student_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_stories_select_authenticated ON public.student_stories;
CREATE POLICY student_stories_select_authenticated
  ON public.student_stories
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS student_stories_insert_admins ON public.student_stories;
CREATE POLICY student_stories_insert_admins
  ON public.student_stories
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS student_stories_update_admins ON public.student_stories;
CREATE POLICY student_stories_update_admins
  ON public.student_stories
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS student_stories_delete_admins ON public.student_stories;
CREATE POLICY student_stories_delete_admins
  ON public.student_stories
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
