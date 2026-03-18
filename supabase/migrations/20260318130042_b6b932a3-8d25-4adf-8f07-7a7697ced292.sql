
-- Fix: Allow staff (admin, ops, mentor, master_admin) to INSERT leads for mentees in the same tenant
-- This enables impersonation mode and collaborative lead management
DROP POLICY IF EXISTS "prospections_insert_own" ON public.crm_prospections;

CREATE POLICY "prospections_insert_own_or_staff"
ON public.crm_prospections
FOR INSERT
TO authenticated
WITH CHECK (
  -- Own membership
  (membership_id IN (
    SELECT id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
  ))
  OR
  -- Staff in the same tenant
  (tenant_id IN (
    SELECT tenant_id FROM memberships
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'ops', 'mentor', 'master_admin')
      AND status = 'active'
  ))
);
