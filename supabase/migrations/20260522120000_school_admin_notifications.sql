-- School admin in-app notifications for core student actions.

CREATE TABLE public.school_admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  body text,
  link_path text,
  source_table text NOT NULL,
  source_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX school_admin_notifications_source_unique
  ON public.school_admin_notifications (source_table, source_id, event_type);

CREATE INDEX school_admin_notifications_school_created_idx
  ON public.school_admin_notifications (school_id, created_at DESC);

CREATE TABLE public.school_admin_notification_reads (
  notification_id uuid NOT NULL REFERENCES public.school_admin_notifications (id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.school_admin_profiles (id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, admin_id)
);

CREATE INDEX school_admin_notification_reads_admin_idx
  ON public.school_admin_notification_reads (admin_id);

-- ---------------------------------------------------------------------------
-- Helper: insert notification (SECURITY DEFINER — bypasses RLS for triggers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_school_admin_notification(
  p_student_id uuid,
  p_event_type text,
  p_body text DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_display_name text;
  v_title text;
  v_link_path text;
BEGIN
  IF p_student_id IS NULL OR p_event_type IS NULL OR p_source_table IS NULL OR p_source_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    sp.school_id,
    COALESCE(
      NULLIF(trim(sp.first_name), ''),
      NULLIF(trim(sp.email), ''),
      'A student'
    )
  INTO v_school_id, v_display_name
  FROM public.student_profiles sp
  WHERE sp.id = p_student_id;

  IF v_school_id IS NULL THEN
    RETURN;
  END IF;

  v_title := CASE p_event_type
    WHEN 'university_shortlist_add' THEN v_display_name || ' shortlisted a university'
    WHEN 'scholarship_shortlisted' THEN v_display_name || ' shortlisted a scholarship'
    WHEN 'advisor_session_booking_requested' THEN v_display_name || ' booked an advisor session'
    WHEN 'ambassador_session_requested' THEN v_display_name || ' requested an ambassador session'
    WHEN 'task_completed' THEN v_display_name || ' completed a task'
    WHEN 'document_submitted' THEN v_display_name || ' submitted a document'
    ELSE v_display_name || ' had new activity'
  END;

  v_link_path := CASE p_event_type
    WHEN 'task_completed' THEN '/school/students/' || p_student_id::text || '?tab=tasks'
    WHEN 'document_submitted' THEN '/school/documents'
    ELSE '/school/students/' || p_student_id::text
  END;

  INSERT INTO public.school_admin_notifications (
    school_id,
    student_id,
    event_type,
    title,
    body,
    link_path,
    source_table,
    source_id
  )
  VALUES (
    v_school_id,
    p_student_id,
    p_event_type,
    v_title,
    p_body,
    v_link_path,
    p_source_table,
    p_source_id
  )
  ON CONFLICT (source_table, source_id, event_type) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.create_school_admin_notification(uuid, text, text, text, text) FROM PUBLIC;

COMMENT ON FUNCTION public.create_school_admin_notification(uuid, text, text, text, text) IS
  'Creates a school-scoped admin notification for a student event; deduped by source.';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_school_admin_notification_from_activity_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by_type IS DISTINCT FROM 'student'::public.activity_log_entity_type THEN
    RETURN NEW;
  END IF;

  IF NEW.student_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.action NOT IN (
    'university_shortlist_add',
    'scholarship_shortlisted',
    'advisor_session_booking_requested',
    'ambassador_session_requested'
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_school_admin_notification(
    NEW.student_id,
    NEW.action,
    NEW.message,
    'acitivity_logs',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS school_admin_notification_from_activity_log
  ON public.acitivity_logs;

CREATE TRIGGER school_admin_notification_from_activity_log
  AFTER INSERT ON public.acitivity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_school_admin_notification_from_activity_log();

CREATE OR REPLACE FUNCTION public.trg_school_admin_notification_task_completed()
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

  PERFORM public.create_school_admin_notification(
    NEW.student_id,
    'task_completed',
    NEW.title,
    'student_my_application_tasks',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS school_admin_notification_task_completed
  ON public.student_my_application_tasks;

CREATE TRIGGER school_admin_notification_task_completed
  AFTER UPDATE OF completed ON public.student_my_application_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_school_admin_notification_task_completed();

CREATE OR REPLACE FUNCTION public.trg_school_admin_notification_document_submitted()
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

  PERFORM public.create_school_admin_notification(
    NEW.student_id,
    'document_submitted',
    NEW.display_name,
    'student_my_application_documents',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS school_admin_notification_document_submitted
  ON public.student_my_application_documents;

CREATE TRIGGER school_admin_notification_document_submitted
  AFTER UPDATE OF status ON public.student_my_application_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_school_admin_notification_document_submitted();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.school_admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admin_notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_admin_notifications_select_same_school
  ON public.school_admin_notifications;

CREATE POLICY school_admin_notifications_select_same_school
  ON public.school_admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    public.current_school_admin_school_id() IS NOT NULL
      AND school_id = public.current_school_admin_school_id()
  );

DROP POLICY IF EXISTS school_admin_notification_reads_select_own
  ON public.school_admin_notification_reads;

CREATE POLICY school_admin_notification_reads_select_own
  ON public.school_admin_notification_reads
  FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

DROP POLICY IF EXISTS school_admin_notification_reads_insert_own
  ON public.school_admin_notification_reads;

CREATE POLICY school_admin_notification_reads_insert_own
  ON public.school_admin_notification_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.school_admin_notifications n
        WHERE n.id = notification_id
          AND n.school_id = public.current_school_admin_school_id()
      )
  );

DROP POLICY IF EXISTS school_admin_notification_reads_update_own
  ON public.school_admin_notification_reads;

CREATE POLICY school_admin_notification_reads_update_own
  ON public.school_admin_notification_reads
  FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

GRANT SELECT ON public.school_admin_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.school_admin_notification_reads TO authenticated;
