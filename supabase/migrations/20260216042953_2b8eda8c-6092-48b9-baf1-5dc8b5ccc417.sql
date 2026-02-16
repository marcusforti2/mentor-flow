
-- Fix infinite recursion in playbooks RLS policies
-- The issue: playbook_access_rules policy references playbooks, which triggers playbooks policies recursively

-- Drop problematic policies
DROP POLICY IF EXISTS "Mentees can view allowed playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Staff can manage access rules" ON public.playbook_access_rules;
DROP POLICY IF EXISTS "Mentees can view pages of accessible playbooks" ON public.playbook_pages;

-- Create helper function to check playbook access (breaks RLS recursion)
CREATE OR REPLACE FUNCTION public.can_view_playbook(_user_id uuid, _playbook_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Staff can always view
    SELECT 1 FROM playbooks pb
    WHERE pb.id = _playbook_id
      AND is_tenant_staff(_user_id, pb.tenant_id)
  )
  OR EXISTS (
    -- Mentee with visibility = all_mentees or public
    SELECT 1 FROM playbooks pb
    JOIN memberships m ON m.tenant_id = pb.tenant_id
    WHERE pb.id = _playbook_id
      AND m.user_id = _user_id
      AND m.status = 'active'
      AND m.role = 'mentee'
      AND pb.visibility IN ('all_mentees', 'public')
  )
  OR EXISTS (
    -- Mentee with specific access rule
    SELECT 1 FROM playbooks pb
    JOIN playbook_access_rules ar ON ar.playbook_id = pb.id
    JOIN memberships m ON m.id = ar.membership_id
    WHERE pb.id = _playbook_id
      AND m.user_id = _user_id
      AND ar.can_view = true
      AND pb.visibility = 'specific_mentees'
  );
$$;

-- Helper to check if user is staff for a playbook's tenant
CREATE OR REPLACE FUNCTION public.is_playbook_staff(_user_id uuid, _playbook_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM playbooks pb
    WHERE pb.id = _playbook_id
      AND is_tenant_staff(_user_id, pb.tenant_id)
  );
$$;

-- Re-create mentee policy for playbooks using SECURITY DEFINER function
CREATE POLICY "Mentees can view allowed playbooks"
  ON public.playbooks FOR SELECT
  USING (
    is_tenant_staff(auth.uid(), tenant_id)
    OR (
      visibility IN ('all_mentees', 'public')
      AND EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.user_id = auth.uid()
          AND m.tenant_id = playbooks.tenant_id
          AND m.status = 'active'
      )
    )
    OR (
      visibility = 'specific_mentees'
      AND EXISTS (
        SELECT 1 FROM playbook_access_rules ar
        JOIN memberships m ON m.id = ar.membership_id
        WHERE ar.playbook_id = playbooks.id
          AND m.user_id = auth.uid()
          AND ar.can_view = true
      )
    )
  );

-- Re-create access rules policy using SECURITY DEFINER function
CREATE POLICY "Staff can manage access rules"
  ON public.playbook_access_rules FOR ALL
  USING (is_playbook_staff(auth.uid(), playbook_id))
  WITH CHECK (is_playbook_staff(auth.uid(), playbook_id));

-- Re-create pages policy using SECURITY DEFINER function  
CREATE POLICY "Mentees can view pages of accessible playbooks"
  ON public.playbook_pages FOR SELECT
  USING (can_view_playbook(auth.uid(), playbook_id));
