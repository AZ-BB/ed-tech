-- Match advisor_sessions contact fields (see 20260504212424_altering-sessions-table.sql).
ALTER TABLE public.ambassador_session_requests ADD COLUMN IF NOT EXISTS student_name TEXT DEFAULT NULL;
ALTER TABLE public.ambassador_session_requests ADD COLUMN IF NOT EXISTS student_email TEXT DEFAULT NULL;
ALTER TABLE public.ambassador_session_requests ADD COLUMN IF NOT EXISTS student_phone TEXT DEFAULT NULL;
