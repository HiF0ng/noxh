-- NOXH 05C.2: run only after 05C has created private-documents and copied
-- every referenced object from project-images into that private bucket.
-- This migration moves legacy metadata references and then prevents a document
-- from pointing outside its private Storage group.

BEGIN;

DO $$
DECLARE
  missing_private_copies integer;
BEGIN
  WITH legacy_references AS (
    SELECT split_part(file_url, '/storage/v1/object/public/project-images/', 2) AS object_name
    FROM public.documents
    WHERE file_url LIKE '%/storage/v1/object/public/project-images/%'
    UNION
    SELECT split_part(
      (regexp_matches(content, 'https://[^/]+\\.supabase\\.co/storage/v1/object/public/project-images/[^" ]+', 'g'))[1],
      '/storage/v1/object/public/project-images/',
      2
    ) AS object_name
    FROM public.documents
    WHERE content LIKE '%/storage/v1/object/public/project-images/%'
  )
  SELECT count(*) INTO missing_private_copies
  FROM legacy_references reference
  WHERE reference.object_name <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM storage.objects destination
      WHERE destination.bucket_id = 'private-documents'
        AND destination.name = reference.object_name
    );

  IF missing_private_copies <> 0 THEN
    RAISE EXCEPTION 'Refusing to update document metadata: % private Storage copies are missing.', missing_private_copies;
  END IF;
END $$;

UPDATE public.documents
SET
  file_url = regexp_replace(
    file_url,
    'https://[^/]+\\.supabase\\.co/storage/v1/object/public/project-images/',
    'storage://private-documents/'
  ),
  content = regexp_replace(
    content,
    'https://[^/]+\\.supabase\\.co/storage/v1/object/public/project-images/',
    'storage://private-documents/',
    'g'
  )
WHERE file_url LIKE '%/storage/v1/object/public/project-images/%'
   OR content LIKE '%/storage/v1/object/public/project-images/%';

CREATE OR REPLACE FUNCTION public.document_storage_group_for_category(document_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN document_category IN ('Đơn đăng ký', 'Xác nhận nhà ở', 'Đối tượng & Thu nhập') THEN 'forms'
    WHEN document_category = 'Văn bản luật' THEN 'legal'
    WHEN document_category LIKE 'Bộ tài liệu - %' THEN 'packages'
    WHEN document_category = 'Hướng dẫn' THEN 'guides'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.document_reference_matches_storage_group(reference text, storage_group text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN coalesce(btrim(reference), '') = '' THEN true
    WHEN storage_group IS NULL THEN false
    ELSE reference LIKE 'storage://private-documents/documents/' || storage_group || '/%'
  END;
$$;

CREATE OR REPLACE FUNCTION public.document_references_match_storage_group(
  document_category text,
  document_file_url text,
  document_content text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  storage_group text := public.document_storage_group_for_category(document_category);
  metadata jsonb;
  reference text;
  guide_images jsonb;
BEGIN
  IF storage_group IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.document_reference_matches_storage_group(document_file_url, storage_group) THEN
    RETURN false;
  END IF;

  IF coalesce(btrim(document_content), '') = '' OR left(ltrim(document_content), 1) <> '{' THEN
    RETURN true;
  END IF;

  BEGIN
    metadata := document_content::jsonb;
  EXCEPTION WHEN others THEN
    RETURN true;
  END;

  IF metadata ->> '_noxhDocument' IS DISTINCT FROM '2' THEN
    RETURN true;
  END IF;

  FOREACH reference IN ARRAY ARRAY[
    nullif(metadata #>> '{attachments,pdf}', ''),
    nullif(metadata #>> '{attachments,docx}', '')
  ] LOOP
    IF NOT public.document_reference_matches_storage_group(reference, storage_group) THEN
      RETURN false;
    END IF;
  END LOOP;

  IF NOT public.document_reference_matches_storage_group(
    nullif(metadata #>> '{guide,imageUrl}', ''),
    'guides'
  ) THEN
    RETURN false;
  END IF;

  guide_images := metadata #> '{guide,imageUrls}';
  IF jsonb_typeof(guide_images) = 'array' THEN
    FOR reference IN SELECT jsonb_array_elements_text(guide_images) LOOP
      IF NOT public.document_reference_matches_storage_group(reference, 'guides') THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
END;
$$;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_private_storage_group_check;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_private_storage_group_check
  CHECK (public.document_references_match_storage_group(category, file_url, content)) NOT VALID;
ALTER TABLE public.documents
  VALIDATE CONSTRAINT documents_private_storage_group_check;

COMMIT;
