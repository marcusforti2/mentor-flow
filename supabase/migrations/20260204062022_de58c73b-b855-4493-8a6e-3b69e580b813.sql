-- Table to store role-play simulation sessions
CREATE TABLE public.roleplay_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_prospections(id) ON DELETE SET NULL,
  lead_name TEXT,
  negotiation_phase TEXT NOT NULL DEFAULT 'cold_response',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedback TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roleplay_simulations ENABLE ROW LEVEL SECURITY;

-- Mentorados can manage their own simulations
CREATE POLICY "Mentorados can manage their simulations"
ON public.roleplay_simulations
FOR ALL
USING (EXISTS (
  SELECT 1 FROM mentorados m
  WHERE m.id = roleplay_simulations.mentorado_id
  AND m.user_id = auth.uid()
));

-- Mentors can view all simulations
CREATE POLICY "Mentors can view all simulations"
ON public.roleplay_simulations
FOR SELECT
USING (has_role(auth.uid(), 'mentor'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_roleplay_simulations_updated_at
BEFORE UPDATE ON public.roleplay_simulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_roleplay_simulations_mentorado ON public.roleplay_simulations(mentorado_id);
CREATE INDEX idx_roleplay_simulations_created ON public.roleplay_simulations(created_at DESC);