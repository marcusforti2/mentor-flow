
-- Fix INSERT policies to allow master_admin cross-tenant

-- mentee_activities
DROP POLICY IF EXISTS "Staff insert mentee_activities" ON public.mentee_activities;
CREATE POLICY "Staff insert mentee_activities" ON public.mentee_activities
  FOR INSERT WITH CHECK (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));

-- mentee_deals
DROP POLICY IF EXISTS "Staff insert mentee_deals" ON public.mentee_deals;
CREATE POLICY "Staff insert mentee_deals" ON public.mentee_deals
  FOR INSERT WITH CHECK (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));

-- mentee_payments
DROP POLICY IF EXISTS "Staff insert mentee_payments" ON public.mentee_payments;
CREATE POLICY "Staff insert mentee_payments" ON public.mentee_payments
  FOR INSERT WITH CHECK (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));

-- program_investments
DROP POLICY IF EXISTS "Staff insert program_investments" ON public.program_investments;
CREATE POLICY "Staff insert program_investments" ON public.program_investments
  FOR INSERT WITH CHECK (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));

-- metrics_snapshots
DROP POLICY IF EXISTS "Staff insert metrics_snapshots" ON public.metrics_snapshots;
CREATE POLICY "Staff insert metrics_snapshots" ON public.metrics_snapshots
  FOR INSERT WITH CHECK (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));

-- Also fix SELECT/UPDATE/DELETE for master_admin cross-tenant
-- mentee_activities
DROP POLICY IF EXISTS "Staff select mentee_activities" ON public.mentee_activities;
CREATE POLICY "Staff select mentee_activities" ON public.mentee_activities
  FOR SELECT USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff update mentee_activities" ON public.mentee_activities;
CREATE POLICY "Staff update mentee_activities" ON public.mentee_activities
  FOR UPDATE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff delete mentee_activities" ON public.mentee_activities;
CREATE POLICY "Staff delete mentee_activities" ON public.mentee_activities
  FOR DELETE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));

-- mentee_deals
DROP POLICY IF EXISTS "Staff select mentee_deals" ON public.mentee_deals;
CREATE POLICY "Staff select mentee_deals" ON public.mentee_deals
  FOR SELECT USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff update mentee_deals" ON public.mentee_deals;
CREATE POLICY "Staff update mentee_deals" ON public.mentee_deals
  FOR UPDATE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff delete mentee_deals" ON public.mentee_deals;
CREATE POLICY "Staff delete mentee_deals" ON public.mentee_deals
  FOR DELETE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));

-- mentee_payments
DROP POLICY IF EXISTS "Staff select mentee_payments" ON public.mentee_payments;
CREATE POLICY "Staff select mentee_payments" ON public.mentee_payments
  FOR SELECT USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff update mentee_payments" ON public.mentee_payments;
CREATE POLICY "Staff update mentee_payments" ON public.mentee_payments
  FOR UPDATE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff delete mentee_payments" ON public.mentee_payments;
CREATE POLICY "Staff delete mentee_payments" ON public.mentee_payments
  FOR DELETE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));

-- program_investments
DROP POLICY IF EXISTS "Staff select program_investments" ON public.program_investments;
CREATE POLICY "Staff select program_investments" ON public.program_investments
  FOR SELECT USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff update program_investments" ON public.program_investments;
CREATE POLICY "Staff update program_investments" ON public.program_investments
  FOR UPDATE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff delete program_investments" ON public.program_investments;
CREATE POLICY "Staff delete program_investments" ON public.program_investments
  FOR DELETE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));

-- metrics_snapshots
DROP POLICY IF EXISTS "Staff select metrics_snapshots" ON public.metrics_snapshots;
CREATE POLICY "Staff select metrics_snapshots" ON public.metrics_snapshots
  FOR SELECT USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff update metrics_snapshots" ON public.metrics_snapshots;
CREATE POLICY "Staff update metrics_snapshots" ON public.metrics_snapshots
  FOR UPDATE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff delete metrics_snapshots" ON public.metrics_snapshots;
CREATE POLICY "Staff delete metrics_snapshots" ON public.metrics_snapshots
  FOR DELETE USING (is_tenant_staff(auth.uid(), tenant_id) OR is_master_admin(auth.uid()));
