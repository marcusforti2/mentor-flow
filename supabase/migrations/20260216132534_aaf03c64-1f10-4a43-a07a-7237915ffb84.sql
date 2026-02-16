-- Allow staff (mentors, admins, ops) to INSERT files for mentorados in their tenant
CREATE POLICY "files_staff_insert"
ON public.mentorado_files
FOR INSERT
WITH CHECK (
  is_tenant_staff(auth.uid(), tenant_id)
);

-- Allow staff to DELETE files in their tenant
CREATE POLICY "files_staff_delete"
ON public.mentorado_files
FOR DELETE
USING (
  is_tenant_staff(auth.uid(), tenant_id)
);