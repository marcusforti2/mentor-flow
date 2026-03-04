CREATE POLICY "staff_delete_submissions" ON public.form_submissions FOR DELETE TO authenticated
  USING (is_tenant_staff(auth.uid(), tenant_id));