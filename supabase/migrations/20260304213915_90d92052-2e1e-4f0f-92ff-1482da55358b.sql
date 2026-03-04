
CREATE TABLE public.whatsapp_automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_membership_id UUID REFERENCES public.memberships(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}',
  steps JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT false,
  audience_type TEXT DEFAULT 'all_mentees',
  audience_membership_ids TEXT[] DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_automation_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_whatsapp_flows"
ON public.whatsapp_automation_flows
FOR ALL
TO authenticated
USING (public.is_tenant_staff(auth.uid(), tenant_id))
WITH CHECK (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE TRIGGER update_whatsapp_flows_updated_at
  BEFORE UPDATE ON public.whatsapp_automation_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
