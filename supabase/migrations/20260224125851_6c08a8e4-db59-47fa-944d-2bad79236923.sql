
-- Function to seed default automations for a new tenant
CREATE OR REPLACE FUNCTION public.seed_tenant_automations()
RETURNS TRIGGER AS $$
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
    (NEW.id, 'celebrate_achievements', false, '0 10 * * *',   '{}')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on tenant creation
DROP TRIGGER IF EXISTS trg_seed_automations ON public.tenants;
CREATE TRIGGER trg_seed_automations
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_tenant_automations();

-- Seed automations for ALL existing tenants that don't have them yet
INSERT INTO public.tenant_automations (tenant_id, automation_key, is_enabled, schedule, config)
SELECT t.id, a.key, false, a.schedule, a.config::jsonb
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('weekly_digest',          '0 8 * * 1',    '{}'),
    ('re_engage_inactive',     '0 */12 * * *', '{"inactive_days": 7}'),
    ('auto_qualify_lead',      NULL,            '{}'),
    ('check_badges',           '0 3 * * *',    '{}'),
    ('check_alerts',           '0 */6 * * *',  '{}'),
    ('send_prospection_tips',  '0 9 * * 3',    '{}'),
    ('welcome_onboarding',     '0 */2 * * *',  '{}'),
    ('meeting_reminder',       '0 */2 * * *',  '{"hours_before": 24}'),
    ('monthly_mentor_report',  '0 8 1 * *',    '{}'),
    ('celebrate_achievements', '0 10 * * *',   '{}')
) AS a(key, schedule, config)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_automations ta
  WHERE ta.tenant_id = t.id AND ta.automation_key = a.key
);
