-- Performance indexes for frequently filtered queries
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_role_status ON public.memberships (tenant_id, role, status);
CREATE INDEX IF NOT EXISTS idx_crm_prospections_membership_created ON public.crm_prospections (membership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_prospections_tenant ON public.crm_prospections (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_membership ON public.activity_logs (tenant_id, membership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_date ON public.calendar_events (tenant_id, event_date, event_time);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_tenant_dismissed ON public.smart_alerts (tenant_id, is_dismissed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_flows_tenant ON public.email_flows (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON public.email_templates (tenant_id, created_at DESC);