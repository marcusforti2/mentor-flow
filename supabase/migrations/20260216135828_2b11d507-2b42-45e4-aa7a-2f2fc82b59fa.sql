
-- Fix 2a: ranking_entries - replace permissive USING(true) with tenant filter via membership
DROP POLICY IF EXISTS "ranking_view" ON ranking_entries;
CREATE POLICY "ranking_view_tenant" ON ranking_entries FOR SELECT
USING (
  membership_id IN (
    SELECT m2.id FROM memberships m2
    WHERE m2.tenant_id IN (
      SELECT m.tenant_id FROM memberships m 
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  )
);

-- Fix 2b: reward_catalog - restrict management to master_admin only (global table, no tenant_id)
DROP POLICY IF EXISTS "Mentors can manage rewards" ON reward_catalog;
CREATE POLICY "master_admin_manage_rewards" ON reward_catalog FOR ALL
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

-- Fix 4: Anti-escalation trigger on memberships
CREATE OR REPLACE FUNCTION public.prevent_membership_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role membership_role;
BEGIN
  -- Block tenant_id changes
  IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Não é permitido mover membership entre tenants';
  END IF;

  -- If role didn't change, allow
  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  -- Get caller's highest role
  SELECT role INTO v_caller_role
  FROM memberships
  WHERE user_id = auth.uid() AND status = 'active'
  ORDER BY CASE role 
    WHEN 'master_admin' THEN 1 
    WHEN 'admin' THEN 2 
    ELSE 3 
  END
  LIMIT 1;

  -- Nobody can self-escalate
  IF OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é permitido alterar o próprio papel';
  END IF;

  -- Only master_admin can promote to master_admin
  IF NEW.role = 'master_admin' AND v_caller_role != 'master_admin' THEN
    RAISE EXCEPTION 'Apenas master_admin pode promover para master_admin';
  END IF;

  -- Only master_admin can change admin roles
  IF OLD.role = 'admin' AND v_caller_role != 'master_admin' THEN
    RAISE EXCEPTION 'Apenas master_admin pode alterar papel de admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_membership_escalation ON memberships;
CREATE TRIGGER trg_prevent_membership_escalation
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_membership_escalation();
