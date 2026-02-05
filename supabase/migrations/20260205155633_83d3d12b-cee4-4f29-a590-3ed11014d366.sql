-- Create activity_logs table to track all mentorado actions
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.memberships(id),
  tenant_id UUID REFERENCES public.tenants(id),
  action_type TEXT NOT NULL, -- 'lead_created', 'lead_status_changed', 'lesson_completed', 'trail_started', 'file_uploaded', 'meeting_confirmed', 'sos_sent', 'ai_tool_used'
  action_description TEXT,
  metadata JSONB DEFAULT '{}',
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_activity_logs_mentorado_id ON public.activity_logs(mentorado_id);
CREATE INDEX idx_activity_logs_tenant_id ON public.activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);

-- RLS Policies
-- Mentorados can view their own activities
CREATE POLICY "Mentorados can view own activities"
  ON public.activity_logs FOR SELECT
  USING (
    mentorado_id IN (
      SELECT id FROM public.mentorados WHERE user_id = auth.uid()
    )
  );

-- Mentorados can insert their own activities
CREATE POLICY "Mentorados can insert own activities"
  ON public.activity_logs FOR INSERT
  WITH CHECK (
    mentorado_id IN (
      SELECT id FROM public.mentorados WHERE user_id = auth.uid()
    )
  );

-- Mentors can view activities of their mentorados (via tenant)
CREATE POLICY "Mentors can view tenant activities"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = activity_logs.tenant_id
        AND m.role IN ('mentor', 'admin', 'master_admin')
        AND m.status = 'active'
    )
  );

-- Enable realtime for activity_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;