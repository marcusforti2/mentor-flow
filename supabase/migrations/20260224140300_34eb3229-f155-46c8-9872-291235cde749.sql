
-- 1. Adicionar colunas de custo operacional em program_investments
ALTER TABLE public.program_investments
  ADD COLUMN IF NOT EXISTS monthly_ads_cost_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_team_cost_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_other_cost_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_program_value_cents integer NOT NULL DEFAULT 0;

-- 2. Adicionar nova automação metrics_reminder ao trigger
CREATE OR REPLACE FUNCTION public.seed_tenant_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.tenant_automations (tenant_id, automation_key, is_enabled, schedule, config)
  VALUES
    (NEW.id, 'weekly_digest',          false, '0 8 * * 1',    '{}'),
    (NEW.id, 're_engage_inactive',     false, '0 */12 * * *', '{"inactive_days": 7}'),
    (NEW.id, 'auto_qualify_lead',      false, NULL,           '{}'),
    (NEW.id, 'check_badges',           false, '0 3 * * *',    '{}'),
    (NEW.id, 'check_alerts',           false, '0 */6 * * *',  '{}'),
    (NEW.id, 'send_prospection_tips',  false, '0 9 * * 3',    '{}'),
    (NEW.id, 'welcome_onboarding',     false, '0 */2 * * *',  '{}'),
    (NEW.id, 'meeting_reminder',       false, '0 */2 * * *',  '{"hours_before": 24}'),
    (NEW.id, 'monthly_mentor_report',  false, '0 8 1 * *',    '{}'),
    (NEW.id, 'celebrate_achievements', false, '0 10 * * *',   '{}'),
    (NEW.id, 'metrics_reminder',       false, '0 8 * * 1',    '{}')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- 3. Inserir retroativamente para tenants existentes
INSERT INTO public.tenant_automations (tenant_id, automation_key, is_enabled, schedule, config)
SELECT t.id, 'metrics_reminder', false, '0 8 * * 1', '{}'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_automations ta
  WHERE ta.tenant_id = t.id AND ta.automation_key = 'metrics_reminder'
);
