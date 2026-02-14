-- Drop legacy functions that reference the dropped user_roles table
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.assign_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.approve_mentorado(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_pending_users();
DROP FUNCTION IF EXISTS public.is_first_mentor();
DROP FUNCTION IF EXISTS public.accept_invite(text, uuid);

-- Also drop the legacy app_role enum (no longer used by any table or function)
-- has_role still uses it in signature, so we need to drop and recreate has_role first
-- Actually, has_role signature uses app_role, so we keep it for now
-- We can only drop app_role after migrating has_role signature too

-- For safety, just drop the dead functions for now