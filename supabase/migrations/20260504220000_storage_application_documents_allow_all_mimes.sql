-- Allow any MIME type for application-documents uploads.
-- Browsers often send empty file.type; we were falling back to application/octet-stream,
-- which was rejected by the bucket allowlist and caused "upload failed" after insert.

UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'application-documents';
