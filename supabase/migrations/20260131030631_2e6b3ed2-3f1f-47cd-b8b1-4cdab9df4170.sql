-- Adicionar campos para análise de IA na tabela sos_requests
ALTER TABLE public.sos_requests 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS ai_chat_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS initial_guidance TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Criar índice para busca por status
CREATE INDEX IF NOT EXISTS idx_sos_requests_status ON public.sos_requests(status);

-- Criar índice para busca por mentorado
CREATE INDEX IF NOT EXISTS idx_sos_requests_mentorado ON public.sos_requests(mentorado_id);

-- Adicionar política para mentorados verem seus próprios pedidos SOS
CREATE POLICY "Mentorados can view their own SOS requests"
ON public.sos_requests FOR SELECT
USING (mentorado_id IN (SELECT id FROM public.mentorados WHERE user_id = auth.uid()));

-- Adicionar política para mentorados criarem pedidos SOS
CREATE POLICY "Mentorados can create SOS requests"
ON public.sos_requests FOR INSERT
WITH CHECK (mentorado_id IN (SELECT id FROM public.mentorados WHERE user_id = auth.uid()));

-- Adicionar política para mentorados atualizarem seus pedidos SOS
CREATE POLICY "Mentorados can update their own SOS requests"
ON public.sos_requests FOR UPDATE
USING (mentorado_id IN (SELECT id FROM public.mentorados WHERE user_id = auth.uid()));

-- Política para mentores verem todos os pedidos SOS dos seus mentorados
CREATE POLICY "Mentors can view SOS requests from their mentorados"
ON public.sos_requests FOR SELECT
USING (
  mentorado_id IN (
    SELECT m.id FROM public.mentorados m
    JOIN public.mentors mt ON m.mentor_id = mt.id
    WHERE mt.user_id = auth.uid()
  )
);

-- Política para mentores atualizarem pedidos SOS
CREATE POLICY "Mentors can update SOS requests from their mentorados"
ON public.sos_requests FOR UPDATE
USING (
  mentorado_id IN (
    SELECT m.id FROM public.mentorados m
    JOIN public.mentors mt ON m.mentor_id = mt.id
    WHERE mt.user_id = auth.uid()
  )
);

-- Habilitar RLS
ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;