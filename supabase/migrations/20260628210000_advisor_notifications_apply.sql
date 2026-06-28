-- Advisor notifications were marked applied via migration repair without running
-- 20260628200000_advisor_notifications.sql. This migration creates the missing objects.

CREATE TABLE IF NOT EXISTS public.advisor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL REFERENCES public.advisors (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,
  application_id bigint REFERENCES public.applications (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  body text,
  link_path text,
  source_table text NOT NULL,
  source_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS advisor_notifications_source_unique
  ON public.advisor_notifications (advisor_id, source_table, source_id, event_type);

CREATE INDEX IF NOT EXISTS advisor_notifications_advisor_created_idx
  ON public.advisor_notifications (advisor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.advisor_notification_reads (
  notification_id uuid NOT NULL REFERENCES public.advisor_notifications (id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES public.advisors (id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, advisor_id)
);

CREATE INDEX IF NOT EXISTS advisor_notification_reads_advisor_idx
  ON public.advisor_notification_reads (advisor_id);

CREATE OR REPLACE FUNCTION public.create_advisor_notification(
  p_advisor_id uuid,
  p_student_id uuid,
  p_event_type text,
  p_body text DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id text DEFAULT NULL,
  p_application_id bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_title text;
  v_link_path text;
BEGIN
  IF p_advisor_id IS NULL
    OR p_student_id IS NULL
    OR p_event_type IS NULL
    OR p_source_table IS NULL
    OR p_source_id IS NULL
  THEN
    RETURN;
  END IF;

  SELECT COALESCE(
    NULLIF(trim(concat_ws(' ', sp.first_name, sp.last_name)), ''),
    NULLIF(trim(sp.email), ''),
    'A student'
  )
  INTO v_display_name
  FROM public.student_profiles sp
  WHERE sp.id = p_student_id;

  IF v_display_name IS NULL THEN
    v_display_name := 'A student';
  END IF;

  v_title := CASE p_event_type
    WHEN 'task_completed' THEN v_display_name || ' completed a task'
    WHEN 'document_submitted' THEN v_display_name || ' submitted a document'
    WHEN 'advisor_session_booked' THEN v_display_name || ' booked an advisor session'
    WHEN 'advisor_session_status_changed' THEN v_display_name || ' session was updated'
    ELSE v_display_name || ' had new activity'
  END;

  v_link_path := CASE
    WHEN p_application_id IS NOT NULL THEN
      '/advisor/applications/' || p_application_id::text
    ELSE '/advisor/students/' || p_student_id::text
  END;

  INSERT INTO public.advisor_notifications (
    advisor_id,
    student_id,
    application_id,
    event_type,
    title,
    body,
    link_path,
    source_table,
    source_id
  )
  VALUES (
    p_advisor_id,
    p_student_id,
    p_application_id,
    p_event_type,
    v_title,
    p_body,
    v_link_path,
    p_source_table,
    p_source_id
  )
  ON CONFLICT (advisor_id, source_table, source_id, event_type) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.create_advisor_notification(uuid, uuid, text, text, text, text, bigint) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.notify_assigned_advisors_for_student(
  p_student_id uuid,
  p_event_type text,
  p_body text,
  p_source_table text,
  p_source_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  IF p_student_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_row IN
    SELECT DISTINCT a.assigned_to AS advisor_id, a.id AS application_id
    FROM public.applications a
    WHERE a.student_id = p_student_id
      AND a.assigned_to IS NOT NULL
  LOOP
    PERFORM public.create_advisor_notification(
      v_row.advisor_id,
      p_student_id,
      p_event_type,
      p_body,
      p_source_table,
      p_source_id,
      v_row.application_id
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_assigned_advisors_for_student(uuid, text, text, text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.trg_advisor_notification_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completed IS NOT TRUE OR OLD.completed IS TRUE THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS DISTINCT FROM NEW.student_id THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_assigned_advisors_for_student(
    NEW.student_id,
    'task_completed',
    NEW.title,
    'student_my_application_tasks',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advisor_notification_task_completed
  ON public.student_my_application_tasks;

CREATE TRIGGER advisor_notification_task_completed
  AFTER UPDATE OF completed ON public.student_my_application_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_advisor_notification_task_completed();

CREATE OR REPLACE FUNCTION public.trg_advisor_notification_document_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'submitted' OR OLD.status = 'submitted' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS DISTINCT FROM NEW.student_id THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_assigned_advisors_for_student(
    NEW.student_id,
    'document_submitted',
    NEW.display_name,
    'student_my_application_documents',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advisor_notification_document_submitted
  ON public.student_my_application_documents;

CREATE TRIGGER advisor_notification_document_submitted
  AFTER UPDATE OF status ON public.student_my_application_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_advisor_notification_document_submitted();

CREATE OR REPLACE FUNCTION public.trg_advisor_notification_session_booked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_advisor_notification(
    NEW.advisor_id,
    NEW.student_id,
    'advisor_session_booked',
    COALESCE(NEW.help_with, NEW.current_stage),
    'advisor_sessions',
    NEW.id::text,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advisor_notification_session_booked
  ON public.advisor_sessions;

CREATE TRIGGER advisor_notification_session_booked
  AFTER INSERT ON public.advisor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_advisor_notification_session_booked();

CREATE OR REPLACE FUNCTION public.trg_advisor_notification_session_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_advisor_notification(
    NEW.advisor_id,
    NEW.student_id,
    'advisor_session_status_changed',
    NEW.status::text,
    'advisor_sessions',
    NEW.id::text || ':' || COALESCE(NEW.status::text, ''),
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advisor_notification_session_status_changed
  ON public.advisor_sessions;

CREATE TRIGGER advisor_notification_session_status_changed
  AFTER UPDATE OF status ON public.advisor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_advisor_notification_session_status_changed();

ALTER TABLE public.advisor_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_notifications_select_own
  ON public.advisor_notifications;

CREATE POLICY advisor_notifications_select_own
  ON public.advisor_notifications
  FOR SELECT
  TO authenticated
  USING (
    public.current_advisor_id() IS NOT NULL
      AND advisor_id = public.current_advisor_id()
  );

DROP POLICY IF EXISTS advisor_notification_reads_select_own
  ON public.advisor_notification_reads;

CREATE POLICY advisor_notification_reads_select_own
  ON public.advisor_notification_reads
  FOR SELECT
  TO authenticated
  USING (advisor_id = public.current_advisor_id());

DROP POLICY IF EXISTS advisor_notification_reads_insert_own
  ON public.advisor_notification_reads;

CREATE POLICY advisor_notification_reads_insert_own
  ON public.advisor_notification_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    advisor_id = public.current_advisor_id()
      AND EXISTS (
        SELECT 1
        FROM public.advisor_notifications n
        WHERE n.id = notification_id
          AND n.advisor_id = public.current_advisor_id()
      )
  );

DROP POLICY IF EXISTS advisor_notification_reads_update_own
  ON public.advisor_notification_reads;

CREATE POLICY advisor_notification_reads_update_own
  ON public.advisor_notification_reads
  FOR UPDATE
  TO authenticated
  USING (advisor_id = public.current_advisor_id())
  WITH CHECK (advisor_id = public.current_advisor_id());

GRANT SELECT ON public.advisor_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.advisor_notification_reads TO authenticated;

-- Refresh PostgREST schema cache so the API can see the new tables.
NOTIFY pgrst, 'reload schema';
