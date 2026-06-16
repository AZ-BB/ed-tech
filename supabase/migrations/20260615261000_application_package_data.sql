-- Package progress and lifecycle checklist stored per application (advisor/admin portal).

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS package_data jsonb NOT NULL DEFAULT '{
    "universitiesAdded": 0,
    "applicationsSubmitted": 0,
    "startedAt": null,
    "lifecycle": {
      "intro_call_completed": false,
      "package_recommended": false,
      "payment_confirmed": false,
      "documents_collected": false,
      "university_shortlist_finalized": false,
      "personal_statement_reviewed": false,
      "all_applications_prepared": false,
      "applications_submitted": false,
      "proof_of_submission_uploaded": false,
      "package_completed": false
    }
  }'::jsonb;

COMMENT ON COLUMN public.applications.package_data IS
  'Advisor/admin package tab: progress counters and lifecycle checklist.';
