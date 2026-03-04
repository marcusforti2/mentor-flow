
-- Fix: drop existing then recreate for campaigns
DROP POLICY IF EXISTS "Staff can manage own tenant whatsapp campaigns" ON public.whatsapp_campaigns;
CREATE POLICY "Staff can manage own tenant whatsapp campaigns"
ON public.whatsapp_campaigns
FOR ALL
USING (is_tenant_staff(auth.uid(), tenant_id))
WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

-- Fix logs
DROP POLICY IF EXISTS "Staff can manage own tenant whatsapp logs" ON public.whatsapp_message_logs;
CREATE POLICY "Staff can manage own tenant whatsapp logs"
ON public.whatsapp_message_logs
FOR ALL
USING (is_tenant_staff(auth.uid(), tenant_id))
WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));
