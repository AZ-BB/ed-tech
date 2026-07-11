ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES public.admins (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_admin_at timestamptz;

CREATE INDEX IF NOT EXISTS applications_assigned_admin_id_idx
  ON public.applications (assigned_admin_id);
