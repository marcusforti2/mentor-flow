
-- Fix start_impersonation to allow master_admin and cross-tenant access
CREATE OR REPLACE FUNCTION public.start_impersonation(
  _admin_membership_id uuid, 
  _target_membership_id uuid, 
  _ip_address text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
  v_admin_role membership_role;
  v_can_impersonate BOOLEAN;
  v_is_master BOOLEAN;
  v_same_tenant BOOLEAN;
BEGIN
  -- Validate admin has permission
  SELECT role, can_impersonate INTO v_admin_role, v_can_impersonate
  FROM public.memberships WHERE id = _admin_membership_id;
  
  -- Check if user is master_admin (can impersonate across tenants)
  v_is_master := (v_admin_role = 'master_admin');
  
  -- Allow master_admin, admin, or anyone with can_impersonate flag
  IF v_admin_role NOT IN ('admin', 'master_admin') AND NOT v_can_impersonate THEN
    RAISE EXCEPTION 'Sem permissão para impersonar';
  END IF;
  
  -- Validate same tenant (skip for master_admin - they can access any tenant)
  IF NOT v_is_master THEN
    SELECT EXISTS (
      SELECT 1 FROM public.memberships m1
      JOIN public.memberships m2 ON m1.tenant_id = m2.tenant_id
      WHERE m1.id = _admin_membership_id AND m2.id = _target_membership_id
    ) INTO v_same_tenant;
    
    IF NOT v_same_tenant THEN
      RAISE EXCEPTION 'Memberships devem ser do mesmo tenant';
    END IF;
  END IF;
  
  -- Create log entry
  INSERT INTO public.impersonation_logs (admin_membership_id, target_membership_id, ip_address)
  VALUES (_admin_membership_id, _target_membership_id, _ip_address)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;
