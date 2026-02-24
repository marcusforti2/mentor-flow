
-- Table to persist all AI tool outputs as history
CREATE TABLE public.ai_tool_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL,
  title TEXT,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  output_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_ai_tool_history_membership ON public.ai_tool_history(membership_id, tool_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_tool_history ENABLE ROW LEVEL SECURITY;

-- Mentees can see/create their own history
CREATE POLICY "Users can view own ai_tool_history"
  ON public.ai_tool_history FOR SELECT
  USING (
    membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own ai_tool_history"
  ON public.ai_tool_history FOR INSERT
  WITH CHECK (
    membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
  );

-- Staff can view mentee history within tenant
CREATE POLICY "Staff can view tenant ai_tool_history"
  ON public.ai_tool_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND tenant_id = ai_tool_history.tenant_id
        AND role IN ('admin', 'ops', 'mentor', 'master_admin')
        AND status = 'active'
    )
  );

-- Master admin full access
CREATE POLICY "Master admin full access ai_tool_history"
  ON public.ai_tool_history FOR ALL
  USING (public.is_master_admin(auth.uid()));
