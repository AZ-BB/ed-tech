-- Webinars and student registrations.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webinar_status') THEN
    CREATE TYPE public.webinar_status AS ENUM (
      'draft',
      'upcoming',
      'live',
      'completed',
      'cancelled'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.webinars (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone_label TEXT NOT NULL DEFAULT 'GST',
  format TEXT NOT NULL DEFAULT 'Live online webinar',
  advisor_id UUID NOT NULL REFERENCES public.advisors (id),
  max_students INTEGER NOT NULL CHECK (max_students > 0),
  tags TEXT[] NOT NULL DEFAULT '{}',
  agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
  meeting_link TEXT,
  status public.webinar_status NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS webinars_scheduled_at_idx ON public.webinars (scheduled_at);
CREATE INDEX IF NOT EXISTS webinars_status_idx ON public.webinars (status);
CREATE INDEX IF NOT EXISTS webinars_advisor_id_idx ON public.webinars (advisor_id);

CREATE TABLE IF NOT EXISTS public.webinar_registrations (
  id SERIAL PRIMARY KEY,
  webinar_id INTEGER NOT NULL REFERENCES public.webinars (id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reminder_sent_at TIMESTAMPTZ,
  meeting_link_sent_at TIMESTAMPTZ,
  UNIQUE (webinar_id, student_id)
);

CREATE INDEX IF NOT EXISTS webinar_registrations_webinar_id_idx
  ON public.webinar_registrations (webinar_id);

CREATE INDEX IF NOT EXISTS webinar_registrations_student_id_idx
  ON public.webinar_registrations (student_id);

CREATE INDEX IF NOT EXISTS webinar_registrations_reminder_sent_at_idx
  ON public.webinar_registrations (reminder_sent_at)
  WHERE reminder_sent_at IS NULL;

-- RLS: webinars
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webinars_select_authenticated ON public.webinars;
CREATE POLICY webinars_select_authenticated
  ON public.webinars
  FOR SELECT
  TO authenticated
  USING (status IN ('upcoming'::public.webinar_status, 'live'::public.webinar_status));

DROP POLICY IF EXISTS webinars_insert_admins ON public.webinars;
CREATE POLICY webinars_insert_admins
  ON public.webinars
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS webinars_update_admins ON public.webinars;
CREATE POLICY webinars_update_admins
  ON public.webinars
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS webinars_delete_admins ON public.webinars;
CREATE POLICY webinars_delete_admins
  ON public.webinars
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- RLS: webinar_registrations
ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webinar_registrations_select_own ON public.webinar_registrations;
CREATE POLICY webinar_registrations_select_own
  ON public.webinar_registrations
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS webinar_registrations_insert_own ON public.webinar_registrations;
CREATE POLICY webinar_registrations_insert_own
  ON public.webinar_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS webinar_registrations_select_admins ON public.webinar_registrations;
CREATE POLICY webinar_registrations_select_admins
  ON public.webinar_registrations
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS webinar_registrations_delete_admins ON public.webinar_registrations;
CREATE POLICY webinar_registrations_delete_admins
  ON public.webinar_registrations
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
