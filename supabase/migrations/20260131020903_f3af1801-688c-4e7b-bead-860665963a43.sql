-- 1. Criar tabela de perfil de negócio do mentorado
CREATE TABLE public.mentorado_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  business_name TEXT,
  business_type TEXT,
  target_audience TEXT,
  main_offer TEXT,
  price_range TEXT,
  unique_value_proposition TEXT,
  pain_points_solved TEXT[],
  ideal_client_profile TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mentorado_id)
);

-- Enable RLS
ALTER TABLE public.mentorado_business_profiles ENABLE ROW LEVEL SECURITY;

-- Mentorados podem gerenciar seu próprio perfil de negócio
CREATE POLICY "Mentorados can manage their business profile"
ON public.mentorado_business_profiles
FOR ALL
USING (EXISTS (
  SELECT 1 FROM mentorados m
  WHERE m.id = mentorado_business_profiles.mentorado_id
  AND m.user_id = auth.uid()
));

-- Mentores podem ver todos os perfis
CREATE POLICY "Mentors can view all business profiles"
ON public.mentorado_business_profiles
FOR SELECT
USING (has_role(auth.uid(), 'mentor'::app_role));

-- 2. Adicionar colunas na crm_prospections
ALTER TABLE public.crm_prospections 
ADD COLUMN IF NOT EXISTS ai_insights JSONB,
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'cold',
ADD COLUMN IF NOT EXISTS screenshot_urls TEXT[];

-- 3. Criar bucket para screenshots (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-screenshots', 'lead-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para o bucket
CREATE POLICY "Mentorados can upload their screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lead-screenshots' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Mentorados can view their screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lead-screenshots'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Mentorados can delete their screenshots"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lead-screenshots'
  AND auth.uid() IS NOT NULL
);

-- Trigger para updated_at
CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON public.mentorado_business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();