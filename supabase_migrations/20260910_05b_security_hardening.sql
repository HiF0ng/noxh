-- NOXH 05B: prepare on staging first; production execution is 05C only.
-- Take a verified database and Storage backup before running this migration.
-- Do not run supabase_schema.sql after this migration.

BEGIN;

-- Put publication state in columns protected by RLS, rather than in frontend JSON.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
UPDATE public.projects
SET is_draft = true
WHERE lower(coalesce(details_json ->> 'isDraft', 'false')) IN ('true', '1', 'yes');
UPDATE public.projects
SET details_json = coalesce(details_json, '{}'::jsonb) - 'isDraft'
WHERE details_json ? 'isDraft';
CREATE INDEX IF NOT EXISTS projects_public_listing_idx
  ON public.projects (created_at DESC)
  WHERE is_draft = false;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS draft_key text;
CREATE INDEX IF NOT EXISTS documents_public_listing_idx
  ON public.documents (created_at DESC)
  WHERE is_draft = false;
CREATE INDEX IF NOT EXISTS documents_draft_key_idx
  ON public.documents (draft_key)
  WHERE is_draft = true;

-- Supabase Auth owns credentials. The legacy profile field is removed only by
-- this approved migration after the 05C backup has been confirmed.
ALTER TABLE public.users
  DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin')) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.users VALIDATE CONSTRAINT users_role_check;

-- Lock down all application tables first, then recreate only the intended policies.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_followed_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'projects', 'user_saved_projects', 'user_followed_projects', 'documents', 'faqs', 'news')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END $$;

-- The admin check reads the profile linked to the authenticated Supabase user.
-- It is not writable by the caller through RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Authenticated users share one database role, so RLS alone cannot distinguish
-- an admin editing another profile from a user editing their own identity fields.
-- Permit the low-risk activity heartbeat for users while keeping name/phone edits
-- available to an authenticated admin through the existing admin UI.
CREATE OR REPLACE FUNCTION public.guard_user_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only administrators can update profile identity fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_user_profile_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_user_profile_update ON public.users;
CREATE TRIGGER guard_user_profile_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_profile_update();

-- Data API table privileges are deliberate because project creation disables
-- automatic table exposure. RLS below still decides which rows each role sees.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.projects, public.documents, public.faqs, public.news
  TO anon, authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE (full_name, phone, last_active_at) ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.projects, public.documents, public.faqs, public.news,
     public.user_saved_projects, public.user_followed_projects
  TO authenticated;

CREATE POLICY "Users read own profile or admin" ON public.users
  FOR SELECT TO authenticated
  USING (auth_user_id = (select auth.uid()) OR (select public.is_admin()));
CREATE POLICY "Users update own profile or admin" ON public.users
  FOR UPDATE TO authenticated
  USING (auth_user_id = (select auth.uid()) OR (select public.is_admin()))
  WITH CHECK (auth_user_id = (select auth.uid()) OR (select public.is_admin()));

CREATE POLICY "Public read published projects" ON public.projects
  FOR SELECT TO anon, authenticated
  USING (is_draft = false);
CREATE POLICY "Admins manage projects" ON public.projects
  FOR ALL TO authenticated
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

CREATE POLICY "Public read published documents" ON public.documents
  FOR SELECT TO anon, authenticated
  USING (is_draft = false);
CREATE POLICY "Admins manage documents" ON public.documents
  FOR ALL TO authenticated
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

CREATE POLICY "Public read faqs" ON public.faqs
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Admins manage faqs" ON public.faqs
  FOR ALL TO authenticated
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

CREATE POLICY "Public read published news" ON public.news
  FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE POLICY "Admins manage news" ON public.news
  FOR ALL TO authenticated
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

CREATE POLICY "Users manage own saved projects" ON public.user_saved_projects
  FOR ALL TO authenticated
  USING (
    (select public.is_admin()) OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (select public.is_admin()) OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_user_id = (select auth.uid())
    )
  );
CREATE POLICY "Users manage own followed projects" ON public.user_followed_projects
  FOR ALL TO authenticated
  USING (
    (select public.is_admin()) OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (select public.is_admin()) OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_user_id = (select auth.uid())
    )
  );

-- Public images remain in their dedicated bucket; documents require a login.
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-documents', 'private-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Anon project image upload" ON storage.objects;
DROP POLICY IF EXISTS "Anon project image update" ON storage.objects;
DROP POLICY IF EXISTS "Anon project image delete" ON storage.objects;
DROP POLICY IF EXISTS "Public project image read" ON storage.objects;
DROP POLICY IF EXISTS "Private document read for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload private documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins update private documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete private documents" ON storage.objects;

CREATE POLICY "Public project image read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'project-images');
CREATE POLICY "Private document read for authenticated users" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'private-documents');
CREATE POLICY "Admins upload private documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'private-documents' AND (select public.is_admin()));
CREATE POLICY "Admins update private documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'private-documents' AND (select public.is_admin()))
  WITH CHECK (bucket_id = 'private-documents' AND (select public.is_admin()));
CREATE POLICY "Admins delete private documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'private-documents' AND (select public.is_admin()));

COMMIT;
