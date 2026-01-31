-- Create table for storing training analyses
CREATE TABLE public.training_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('transcricao', 'prints')),
  nota_geral INTEGER DEFAULT 0,
  resumo TEXT,
  pontos_fortes JSONB DEFAULT '[]'::jsonb,
  pontos_fracos JSONB DEFAULT '[]'::jsonb,
  muda_urgente JSONB DEFAULT '[]'::jsonb,
  ouro_nao_mude JSONB DEFAULT '[]'::jsonb,
  errou_feio JSONB DEFAULT '[]'::jsonb,
  como_melhorar JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_analyses ENABLE ROW LEVEL SECURITY;

-- Mentorados can view their own analyses
CREATE POLICY "Mentorados can view their own analyses"
ON public.training_analyses
FOR SELECT
USING (
  mentorado_id IN (
    SELECT id FROM public.mentorados WHERE user_id = auth.uid()
  )
);

-- Mentorados can insert their own analyses
CREATE POLICY "Mentorados can insert their own analyses"
ON public.training_analyses
FOR INSERT
WITH CHECK (
  mentorado_id IN (
    SELECT id FROM public.mentorados WHERE user_id = auth.uid()
  )
);

-- Mentors can view analyses of their mentorados
CREATE POLICY "Mentors can view mentorado analyses"
ON public.training_analyses
FOR SELECT
USING (
  mentorado_id IN (
    SELECT m.id FROM public.mentorados m
    JOIN public.mentors mt ON m.mentor_id = mt.id
    WHERE mt.user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_training_analyses_mentorado ON public.training_analyses(mentorado_id);
CREATE INDEX idx_training_analyses_created ON public.training_analyses(created_at DESC);