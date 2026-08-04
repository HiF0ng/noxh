-- NOXH.HELP: Supabase Auth + RLS migration
-- Run this only AFTER the updated website code has been deployed locally.
-- Replace the email below with the email of the Auth user that must be admin.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- Create/link a public profile for existing Supabase Auth users.
INSERT INTO public.users (auth_user_id, email, full_name, phone, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', split_part(au.email, '@', 1)),
  NULLIF(au.raw_user_meta_data ->> 'phone', ''),
  'user'
FROM auth.users au
ON CONFLICT (email) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id
WHERE public.users.auth_user_id IS NULL;

-- Set your existing Auth account as the administrator.
UPDATE public.users
SET role = 'admin'
WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = '2fong.vn@gmail.com');

-- Auto-create the public profile whenever a new Auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    'user'
  )
  ON CONFLICT (email) DO UPDATE
  SET auth_user_id = EXCLUDED.auth_user_id
  WHERE public.users.auth_user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- Keep the public profile email synchronized only after Supabase Auth confirms it.
CREATE OR REPLACE FUNCTION public.sync_auth_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users SET email = NEW.email WHERE auth_user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_auth_user_email();

-- Safe helper: the client cannot promote itself to admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;

-- A normal user may never change their own role through a direct API request.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can change roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_role_escalation ON public.users;
CREATE TRIGGER prevent_user_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_escalation();

-- Enable RLS.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_followed_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Remove insecure policies from the previous implementation.
DROP POLICY IF EXISTS "Anon full access users" ON public.users;
DROP POLICY IF EXISTS "Anon full access projects" ON public.projects;
DROP POLICY IF EXISTS "Anon full access user saved projects" ON public.user_saved_projects;
DROP POLICY IF EXISTS "Anon full access user followed projects" ON public.user_followed_projects;
DROP POLICY IF EXISTS "Anon full access documents" ON public.documents;
DROP POLICY IF EXISTS "Anon full access faqs" ON public.faqs;
DROP POLICY IF EXISTS "Anon full access news" ON public.news;
DROP POLICY IF EXISTS "Users read own profile or admin" ON public.users;
DROP POLICY IF EXISTS "Users update own profile or admin" ON public.users;
DROP POLICY IF EXISTS "Public read projects" ON public.projects;
DROP POLICY IF EXISTS "Admins manage projects" ON public.projects;
DROP POLICY IF EXISTS "Public read documents" ON public.documents;
DROP POLICY IF EXISTS "Admins manage documents" ON public.documents;
DROP POLICY IF EXISTS "Public read faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins manage faqs" ON public.faqs;
DROP POLICY IF EXISTS "Public read news" ON public.news;
DROP POLICY IF EXISTS "Admins manage news" ON public.news;
DROP POLICY IF EXISTS "Users manage own saved projects" ON public.user_saved_projects;
DROP POLICY IF EXISTS "Users manage own followed projects" ON public.user_followed_projects;

-- User profiles: own profile only, except administrators.
CREATE POLICY "Users read own profile or admin" ON public.users FOR SELECT TO authenticated
USING (auth_user_id = (select auth.uid()) OR (select public.is_admin()));
CREATE POLICY "Users update own profile or admin" ON public.users FOR UPDATE TO authenticated
USING (auth_user_id = (select auth.uid()) OR (select public.is_admin()))
WITH CHECK (auth_user_id = (select auth.uid()) OR (select public.is_admin()));

-- Public content can be read; only admins can change it.
CREATE POLICY "Public read projects" ON public.projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage projects" ON public.projects FOR ALL TO authenticated
USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Public read documents" ON public.documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage documents" ON public.documents FOR ALL TO authenticated
USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage faqs" ON public.faqs FOR ALL TO authenticated
USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Public read news" ON public.news FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage news" ON public.news FOR ALL TO authenticated
USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));

-- Saved/followed projects belong only to the authenticated owner.
CREATE POLICY "Users manage own saved projects" ON public.user_saved_projects FOR ALL TO authenticated
USING (
  (select public.is_admin()) OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_id AND u.auth_user_id = (select auth.uid())
  )
)
WITH CHECK (
  (select public.is_admin()) OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_id AND u.auth_user_id = (select auth.uid())
  )
);
CREATE POLICY "Users manage own followed projects" ON public.user_followed_projects FOR ALL TO authenticated
USING (
  (select public.is_admin()) OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_id AND u.auth_user_id = (select auth.uid())
  )
)
WITH CHECK (
  (select public.is_admin()) OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_id AND u.auth_user_id = (select auth.uid())
  )
);

-- Storage: public reads, administrators manage uploaded files.
DROP POLICY IF EXISTS "Anon project image upload" ON storage.objects;
DROP POLICY IF EXISTS "Anon project image update" ON storage.objects;
DROP POLICY IF EXISTS "Anon project image delete" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Admins update project files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete project files" ON storage.objects;
CREATE POLICY "Admins upload project files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-images' AND (select public.is_admin()));
CREATE POLICY "Admins update project files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-images' AND (select public.is_admin()))
WITH CHECK (bucket_id = 'project-images' AND (select public.is_admin()));
CREATE POLICY "Admins delete project files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-images' AND (select public.is_admin()));
