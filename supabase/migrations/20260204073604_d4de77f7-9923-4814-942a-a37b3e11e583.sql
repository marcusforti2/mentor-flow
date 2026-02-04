-- Create email flows table for storing visual flow configurations
CREATE TABLE public.email_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create email flow triggers
CREATE TABLE public.email_flow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.email_flows(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'onboarding', 'inactivity', 'trail_completion', 'date', 'custom'
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create execution log for tracking
CREATE TABLE public.email_flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.email_flows(id) ON DELETE CASCADE,
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'paused', 'error'
  current_node_id TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.email_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_flow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_flow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_flows
CREATE POLICY "Mentors can view their own flows"
ON public.email_flows FOR SELECT
USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

CREATE POLICY "Mentors can create their own flows"
ON public.email_flows FOR INSERT
WITH CHECK (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

CREATE POLICY "Mentors can update their own flows"
ON public.email_flows FOR UPDATE
USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

CREATE POLICY "Mentors can delete their own flows"
ON public.email_flows FOR DELETE
USING (mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid()));

-- RLS for triggers
CREATE POLICY "Mentors can manage triggers for their flows"
ON public.email_flow_triggers FOR ALL
USING (flow_id IN (
  SELECT id FROM public.email_flows 
  WHERE mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
));

-- RLS for executions
CREATE POLICY "Mentors can view executions for their flows"
ON public.email_flow_executions FOR SELECT
USING (flow_id IN (
  SELECT id FROM public.email_flows 
  WHERE mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
));

-- Trigger for updated_at
CREATE TRIGGER update_email_flows_updated_at
BEFORE UPDATE ON public.email_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();