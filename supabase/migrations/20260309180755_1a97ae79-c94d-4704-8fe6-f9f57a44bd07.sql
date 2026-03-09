-- Allow staff (mentor/admin/ops) to UPDATE and DELETE leads in their tenant
CREATE POLICY "prospections_staff_update"
ON public.crm_prospections
FOR UPDATE
TO authenticated
USING (tenant_id IN (SELECT get_user_tenant_ids()))
WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "prospections_staff_delete"
ON public.crm_prospections
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'ops', 'mentor', 'master_admin')
    AND status = 'active'
  )
);