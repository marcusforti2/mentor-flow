-- 1. Fix otp_rate_limits: deny direct access (only service_role uses it)
CREATE POLICY "Deny direct access to otp_rate_limits"
ON public.otp_rate_limits
FOR ALL
TO authenticated, anon
USING (false);

-- 2. Create notifications table for in-app notification center
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'))
WITH CHECK (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Staff can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND tenant_id = notifications.tenant_id AND status = 'active' AND role IN ('admin', 'ops', 'mentor', 'master_admin')));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE INDEX idx_notifications_membership_read ON public.notifications(membership_id, is_read, created_at DESC);