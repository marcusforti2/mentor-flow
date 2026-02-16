CREATE TABLE public.playbook_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id TEXT NOT NULL,
  playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_playbook_views_membership ON public.playbook_views(membership_id, tenant_id, viewed_at DESC);
CREATE UNIQUE INDEX idx_playbook_views_unique ON public.playbook_views(membership_id, playbook_id);

ALTER TABLE public.playbook_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playbook views"
ON public.playbook_views FOR SELECT
USING (membership_id IN (
  SELECT id::text FROM public.memberships WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert own playbook views"
ON public.playbook_views FOR INSERT
WITH CHECK (membership_id IN (
  SELECT id::text FROM public.memberships WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update own playbook views"
ON public.playbook_views FOR UPDATE
USING (membership_id IN (
  SELECT id::text FROM public.memberships WHERE user_id = auth.uid()
));