
-- Smart Alerts table for proactive mentor notifications
CREATE TABLE public.smart_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  mentor_membership_id UUID NOT NULL REFERENCES public.memberships(id),
  mentee_membership_id UUID REFERENCES public.memberships(id),
  alert_type TEXT NOT NULL, -- 'inactive', 'lead_cooling', 'task_overdue', 'streak_broken', 'trail_stalled', 'sos_pending'
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_smart_alerts_tenant ON public.smart_alerts(tenant_id);
CREATE INDEX idx_smart_alerts_mentor ON public.smart_alerts(mentor_membership_id);
CREATE INDEX idx_smart_alerts_unread ON public.smart_alerts(mentor_membership_id, is_read, is_dismissed) WHERE NOT is_read AND NOT is_dismissed;

-- Enable RLS
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;

-- Staff can view alerts for their tenant
CREATE POLICY "Staff can view tenant alerts"
ON public.smart_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = smart_alerts.mentor_membership_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
  OR public.is_master_admin(auth.uid())
);

-- Staff can update (mark read/dismissed) their own alerts
CREATE POLICY "Staff can update own alerts"
ON public.smart_alerts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = smart_alerts.mentor_membership_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
);

-- Service role / edge functions can insert alerts
CREATE POLICY "Service can insert alerts"
ON public.smart_alerts FOR INSERT
WITH CHECK (true);

-- Service role can delete expired alerts
CREATE POLICY "Service can delete alerts"
ON public.smart_alerts FOR DELETE
USING (true);

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.smart_alerts;
