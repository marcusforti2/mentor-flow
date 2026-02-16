
-- Tabela de configurações de automação por tenant
CREATE TABLE public.tenant_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  automation_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  schedule TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, automation_key)
);

-- RLS
ALTER TABLE public.tenant_automations ENABLE ROW LEVEL SECURITY;

-- Staff do tenant pode ler
CREATE POLICY "Staff can view tenant automations"
ON public.tenant_automations FOR SELECT
USING (is_tenant_staff(auth.uid(), tenant_id));

-- Admin do tenant pode inserir
CREATE POLICY "Admin can insert tenant automations"
ON public.tenant_automations FOR INSERT
WITH CHECK (is_tenant_admin(tenant_id, auth.uid()));

-- Admin do tenant pode atualizar
CREATE POLICY "Admin can update tenant automations"
ON public.tenant_automations FOR UPDATE
USING (is_tenant_admin(tenant_id, auth.uid()));

-- Admin do tenant pode deletar
CREATE POLICY "Admin can delete tenant automations"
ON public.tenant_automations FOR DELETE
USING (is_tenant_admin(tenant_id, auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_tenant_automations_updated_at
BEFORE UPDATE ON public.tenant_automations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: inserir automações padrão para cada tenant existente
INSERT INTO public.tenant_automations (tenant_id, automation_key, is_enabled, schedule, config)
SELECT t.id, a.key, a.enabled, a.schedule, a.config::jsonb
FROM public.tenants t
CROSS JOIN (VALUES
  ('weekly_digest', false, '0 9 * * 1', '{"day_of_week": 1, "hour": 9}'),
  ('re_engage_inactive', false, '0 10 * * *', '{"inactive_days": 5, "hour": 10}'),
  ('auto_qualify_lead', false, NULL, '{}'),
  ('check_badges', false, '0 8 * * *', '{"frequency": "daily"}'),
  ('check_alerts', false, '0 */6 * * *', '{"frequency": "every_6h"}'),
  ('send_prospection_tips', false, '0 9 * * 1,3,5', '{"frequency": "3x_week"}')
) AS a(key, enabled, schedule, config);
