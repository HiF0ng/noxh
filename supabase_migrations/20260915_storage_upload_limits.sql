-- NOXH 05D: enforce upload limits in Supabase Storage.
-- Run after 20260910_05b_security_hardening.sql.
-- Existing objects are unaffected; the limits apply to new uploads/replacements.

BEGIN;

UPDATE storage.buckets
SET
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ]::text[]
WHERE id = 'project-images';

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 50 * 1024 * 1024,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
    'image/jpeg',
    'image/png'
  ]::text[]
WHERE id = 'private-documents';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-images') THEN
    RAISE EXCEPTION 'Missing required Storage bucket: project-images';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'private-documents') THEN
    RAISE EXCEPTION 'Missing required Storage bucket: private-documents';
  END IF;
END $$;

COMMIT;

-- Verification query; both rows must be returned with the values above.
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('private-documents', 'project-images')
ORDER BY id;
