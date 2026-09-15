-- NOXH 05E: prevent authenticated users from editing profile identity or role.
-- Row-level security limits which profile row can be updated. Column grants
-- and the trigger below independently limit which fields may change.

BEGIN;

REVOKE UPDATE ON TABLE public.users FROM authenticated;
GRANT UPDATE (full_name, phone, last_active_at) ON TABLE public.users TO authenticated;

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

COMMIT;

-- Expected: table_update=false; the three explicitly granted fields=true;
-- email, role and auth_user_id=false. The trigger additionally rejects
-- full_name/phone changes from non-admin sessions.
SELECT
  has_table_privilege('authenticated', 'public.users', 'UPDATE') AS table_update,
  has_column_privilege('authenticated', 'public.users', 'full_name', 'UPDATE') AS update_full_name,
  has_column_privilege('authenticated', 'public.users', 'phone', 'UPDATE') AS update_phone,
  has_column_privilege('authenticated', 'public.users', 'last_active_at', 'UPDATE') AS update_last_active,
  has_column_privilege('authenticated', 'public.users', 'email', 'UPDATE') AS update_email,
  has_column_privilege('authenticated', 'public.users', 'role', 'UPDATE') AS update_role,
  has_column_privilege('authenticated', 'public.users', 'auth_user_id', 'UPDATE') AS update_auth_user_id,
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.users'::regclass
      AND tgname = 'guard_user_profile_update'
      AND NOT tgisinternal
  ) AS profile_guard_trigger;
