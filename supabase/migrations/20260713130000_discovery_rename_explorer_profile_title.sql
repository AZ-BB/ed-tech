-- Rename combined profile title: Multi-Directional Explorer → Creative & Communication Direction

UPDATE public.discovery_settings
SET combined_profiles_json = COALESCE(
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'title' = 'Multi-Directional Explorer'
          OR elem->>'profile_id' = 'dir-explorer'
        THEN jsonb_set(elem, '{title}', '"Creative & Communication Direction"'::jsonb)
        ELSE elem
      END
    )
    FROM jsonb_array_elements(combined_profiles_json) AS elem
  ),
  '[]'::jsonb
)
WHERE jsonb_array_length(combined_profiles_json) > 0;

UPDATE public.student_discovery_profiles
SET combined_profile_json = jsonb_set(
  combined_profile_json,
  '{profile,title}',
  '"Creative & Communication Direction"'::jsonb
)
WHERE combined_profile_json->'profile'->>'title' = 'Multi-Directional Explorer'
   OR combined_profile_json->'profile'->>'profile_id' = 'dir-explorer';
