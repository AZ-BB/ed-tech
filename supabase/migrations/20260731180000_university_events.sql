-- University events catalog (student discovery + admin import/export)

CREATE TABLE public.university_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  recommended_tag TEXT,
  date_start DATE,
  date_end DATE,
  month TEXT,
  year INTEGER,
  start_time TEXT,
  end_time TEXT,
  timezone TEXT,
  mode TEXT,
  country TEXT,
  city TEXT,
  venue TEXT,
  region_focus TEXT,
  short_description TEXT,
  full_overview TEXT,
  topics_covered TEXT,
  target_audience TEXT,
  why_attend TEXT,
  universities_attending TEXT,
  university_count INTEGER,
  organizer TEXT,
  organizer_type TEXT,
  cost TEXT,
  language TEXT,
  registration_status TEXT,
  registration_required TEXT,
  registration_url TEXT,
  source_name TEXT,
  source_url TEXT,
  date_verified DATE,
  record_status TEXT NOT NULL DEFAULT 'Active',
  internal_notes TEXT,
  prep_steps TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT university_events_event_id_key UNIQUE (event_id)
);

CREATE INDEX university_events_event_id_idx ON public.university_events (event_id);
CREATE INDEX university_events_record_status_idx ON public.university_events (record_status);
CREATE INDEX university_events_date_start_idx ON public.university_events (date_start)
  WHERE lower(record_status) = 'active';
CREATE INDEX university_events_event_type_idx ON public.university_events (event_type);
CREATE INDEX university_events_country_idx ON public.university_events (country);
CREATE INDEX university_events_mode_idx ON public.university_events (mode);

CREATE OR REPLACE FUNCTION public.set_university_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER university_events_set_updated_at
  BEFORE UPDATE ON public.university_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_university_events_updated_at();

ALTER TABLE public.university_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY university_events_select_active
  ON public.university_events
  FOR SELECT
  TO authenticated
  USING (lower(record_status) = 'active');

CREATE POLICY university_events_select_admins
  ON public.university_events
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

CREATE POLICY university_events_insert_admins
  ON public.university_events
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

CREATE POLICY university_events_update_admins
  ON public.university_events
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

CREATE POLICY university_events_delete_admins
  ON public.university_events
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

GRANT SELECT ON public.university_events TO authenticated;
