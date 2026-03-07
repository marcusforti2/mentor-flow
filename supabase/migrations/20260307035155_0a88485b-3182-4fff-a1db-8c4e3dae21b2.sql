
-- Tabela de mensagens recebidas do WhatsApp (webhook)
CREATE TABLE public.whatsapp_incoming_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  from_phone TEXT NOT NULL,
  from_name TEXT,
  message_body TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  ultramsg_message_id TEXT,
  matched_membership_id UUID REFERENCES public.memberships(id),
  ai_reply_sent BOOLEAN DEFAULT false,
  ai_reply_text TEXT,
  status TEXT DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.whatsapp_incoming_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view incoming messages" ON public.whatsapp_incoming_messages
  FOR SELECT TO authenticated
  USING (public.is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can update incoming messages" ON public.whatsapp_incoming_messages
  FOR UPDATE TO authenticated
  USING (public.is_tenant_staff(auth.uid(), tenant_id));

-- Tabela de configuração de auto-reply por tenant
CREATE TABLE public.whatsapp_auto_reply_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  ai_persona TEXT DEFAULT 'Assistente virtual da mentoria',
  greeting_message TEXT DEFAULT 'Olá! 👋 Sou o assistente virtual. Como posso ajudar?',
  business_hours_start INTEGER DEFAULT 8,
  business_hours_end INTEGER DEFAULT 18,
  only_business_hours BOOLEAN DEFAULT false,
  qualify_leads BOOLEAN DEFAULT true,
  auto_route_to_mentor BOOLEAN DEFAULT true,
  custom_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_auto_reply_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage auto-reply config" ON public.whatsapp_auto_reply_config
  FOR ALL TO authenticated
  USING (public.is_tenant_staff(auth.uid(), tenant_id));

-- Tabela de resumos diários
CREATE TABLE public.whatsapp_daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  summary_date DATE NOT NULL,
  total_messages_received INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  total_auto_replies INTEGER DEFAULT 0,
  highlights JSONB DEFAULT '[]',
  pending_items JSONB DEFAULT '[]',
  next_steps JSONB DEFAULT '[]',
  full_summary TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, summary_date)
);

ALTER TABLE public.whatsapp_daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view daily summaries" ON public.whatsapp_daily_summaries
  FOR SELECT TO authenticated
  USING (public.is_tenant_staff(auth.uid(), tenant_id));

-- Enable realtime for incoming messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_incoming_messages;

-- Index for performance
CREATE INDEX idx_incoming_messages_tenant_created ON public.whatsapp_incoming_messages(tenant_id, created_at DESC);
CREATE INDEX idx_incoming_messages_phone ON public.whatsapp_incoming_messages(from_phone, tenant_id);
CREATE INDEX idx_daily_summaries_tenant_date ON public.whatsapp_daily_summaries(tenant_id, summary_date DESC);
