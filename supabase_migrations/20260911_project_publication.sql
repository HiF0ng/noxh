-- NOXH 07: stable public project URLs and publication timestamps.
-- Run after the 05B migration. This is additive and preserves every project.

BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.noxh_project_slug(input_text text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT coalesce(
    nullif(
      trim(both '-' from regexp_replace(
        regexp_replace(lower(extensions.unaccent(coalesce(input_text, ''))), '[^a-z0-9]+', '-', 'g'),
        '-+', '-', 'g'
      )),
      ''
    ),
    'du-an'
  );
$$;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS previous_slugs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Give legacy rows deterministic, unique URLs. A changed title never changes
-- this value automatically after the migration.
WITH base AS (
  SELECT id, public.noxh_project_slug(title) AS base_slug
  FROM public.projects
  WHERE slug IS NULL OR btrim(slug) = ''
), ranked AS (
  SELECT id, base_slug, row_number() OVER (PARTITION BY base_slug ORDER BY id) AS position
  FROM base
)
UPDATE public.projects project
SET slug = CASE WHEN ranked.position = 1 THEN ranked.base_slug ELSE ranked.base_slug || '-' || ranked.position END
FROM ranked
WHERE project.id = ranked.id;

ALTER TABLE public.projects ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique_idx ON public.projects (slug);
CREATE INDEX IF NOT EXISTS projects_previous_slugs_idx ON public.projects USING gin (previous_slugs);
CREATE INDEX IF NOT EXISTS projects_publication_updated_idx ON public.projects (updated_at DESC) WHERE is_draft = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_slug_format_check' AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_slug_format_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.noxh_projects_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE old_slug text;
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.slug IS NULL OR btrim(NEW.slug) = '') THEN
    NEW.slug := public.noxh_project_slug(NEW.title);
  ELSIF TG_OP = 'UPDATE' AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    NEW.slug := public.noxh_project_slug(NEW.slug);
    old_slug := OLD.slug;
    IF old_slug IS NOT NULL AND old_slug <> NEW.slug THEN
      NEW.previous_slugs := array_remove(array_cat(coalesce(OLD.previous_slugs, '{}'), ARRAY[old_slug]), NEW.slug);
      SELECT array_agg(DISTINCT item ORDER BY item) INTO NEW.previous_slugs
      FROM unnest(NEW.previous_slugs) AS item;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS noxh_projects_before_write ON public.projects;
CREATE TRIGGER noxh_projects_before_write
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.noxh_projects_before_write();

COMMIT;
