-- Default admin role permission templates (JSON arrays in system table).

INSERT INTO public.system (key, value)
VALUES
  (
    'role_permissions_super_admin',
    '["edit_students","edit_teachers","edit_advisors","edit_ambassadors","edit_admins","edit_permissions","edit_system_default","edit_system_features","edit_system_plans","edit_applications","edit_documents","edit_schools","edit_sessions"]'
  ),
  (
    'role_permissions_admin',
    '["edit_students","edit_teachers","edit_advisors","edit_ambassadors","edit_system_default","edit_system_features","edit_system_plans","edit_applications","edit_documents","edit_schools","edit_sessions"]'
  ),
  (
    'role_permissions_moderator',
    '["edit_students","edit_applications","edit_documents","edit_sessions"]'
  )
ON CONFLICT (key) DO NOTHING;
