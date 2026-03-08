
-- Update seed_tenant_automations to include 9 new automations
CREATE OR REPLACE FUNCTION public.seed_tenant_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    (NEW.id, 'metrics_reminder',       false, '0 8 * * 1',    '{}'),
    (NEW.id, 'engagement_score',       false, '0 7 * * 1',    '{}'),
    (NEW.id, 'cold_lead_followup',     false, '0 9 * * *',    '{"stale_days": 5}'),
    (NEW.id, 'overdue_task_reminder',  false, '0 8 * * *',    '{}'),
    (NEW.id, 'content_rotation',       false, '0 10 * * 2',   '{}'),
    (NEW.id, 'stale_deal_alert',       false, '0 9 * * *',    '{"stale_days": 7}'),
    (NEW.id, 'weekly_whatsapp_summary',false, '0 18 * * 5',   '{}'),
    (NEW.id, 'incomplete_trail_nudge', false, '0 10 * * 3',   '{}'),
    (NEW.id, 'mentor_mentee_match',    false, '0 8 1 * *',    '{}'),
    (NEW.id, 'meeting_prep_briefing',  false, '0 */4 * * *',  '{"hours_before": 24}')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;
