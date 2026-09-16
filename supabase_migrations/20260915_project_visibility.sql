-- NOXH 07: reversible public visibility for projects.
-- Run this in the Supabase SQL Editor before deploying the matching frontend.

BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS projects_public_visible_listing_idx
  ON public.projects (created_at DESC)
  WHERE is_draft = false AND is_hidden = false;

DROP POLICY IF EXISTS "Public read published projects" ON public.projects;
CREATE POLICY "Public read published projects" ON public.projects
  FOR SELECT TO anon, authenticated
  USING (is_draft = false AND is_hidden = false);

COMMIT;
