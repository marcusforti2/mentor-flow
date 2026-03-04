
-- WhatsApp config per tenant (stores UltraMsg credentials)
CREATE TABLE public.tenant_whatsapp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ultramsg_instance_id TEXT,
  ultramsg_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sender_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own tenant whatsapp config"
ON public.tenant_whatsapp_config FOR SELECT
TO authenticated
USING (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Admin can manage own tenant whatsapp config"
ON public.tenant_whatsapp_config FOR ALL
TO authenticated
USING (public.is_tenant_admin(tenant_id, auth.uid()))
WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));

CREATE TRIGGER update_tenant_whatsapp_config_updated_at
  BEFORE UPDATE ON public.tenant_whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WhatsApp campaigns table
CREATE TABLE public.whatsapp_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_membership_id UUID REFERENCES public.memberships(id),
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  audience_type TEXT NOT NULL DEFAULT 'all_mentees',
  audience_membership_ids UUID[] DEFAULT '{}',
  use_ai_personalization BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own tenant whatsapp campaigns"
ON public.whatsapp_campaigns FOR SELECT
TO authenticated
USING (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can manage own tenant whatsapp campaigns"
ON public.whatsapp_campaigns FOR ALL
TO authenticated
USING (public.is_tenant_staff(auth.uid(), tenant_id))
WITH CHECK (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE TRIGGER update_whatsapp_campaigns_updated_at
  BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WhatsApp message logs
CREATE TABLE public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL,
  recipient_membership_id UUID REFERENCES public.memberships(id),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own tenant whatsapp logs"
ON public.whatsapp_message_logs FOR SELECT
TO authenticated
USING (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can insert own tenant whatsapp logs"
ON public.whatsapp_message_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_tenant_staff(auth.uid(), tenant_id));
