-- WhatsApp day-before session reminder metadata and dedup tracking.

ALTER TABLE public.advisor_sessions
  ADD COLUMN IF NOT EXISTS invitee_timezone TEXT NULL,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent_at TIMESTAMPTZ NULL;

ALTER TABLE public.post_admission_cases
  ADD COLUMN IF NOT EXISTS invitee_timezone TEXT NULL,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.advisor_sessions.invitee_timezone IS
  'IANA timezone from Calendly invitee at booking time (e.g. Asia/Dubai).';

COMMENT ON COLUMN public.advisor_sessions.meeting_link IS
  'Calendly meeting join URL captured at booking time.';

COMMENT ON COLUMN public.advisor_sessions.whatsapp_reminder_sent_at IS
  'When the day-before WhatsApp session reminder was sent.';

COMMENT ON COLUMN public.post_admission_cases.invitee_timezone IS
  'IANA timezone from Calendly invitee at booking time (e.g. Asia/Dubai).';

COMMENT ON COLUMN public.post_admission_cases.meeting_link IS
  'Calendly meeting join URL captured at booking time.';

COMMENT ON COLUMN public.post_admission_cases.whatsapp_reminder_sent_at IS
  'When the day-before WhatsApp session reminder was sent.';

CREATE INDEX IF NOT EXISTS advisor_sessions_booked_at_whatsapp_reminder_idx
  ON public.advisor_sessions (booked_at)
  WHERE booked_at IS NOT NULL AND whatsapp_reminder_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS post_admission_cases_scheduled_at_whatsapp_reminder_idx
  ON public.post_admission_cases (scheduled_at)
  WHERE scheduled_at IS NOT NULL AND whatsapp_reminder_sent_at IS NULL;
