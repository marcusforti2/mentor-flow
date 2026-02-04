-- Tabela para armazenar fingerprints de propriedade intelectual
CREATE TABLE public.system_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sha256_hash TEXT NOT NULL,
  content_summary TEXT,
  full_content TEXT,
  version TEXT,
  author TEXT,
  system_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- RLS: Apenas admin_master pode visualizar
ALTER TABLE public.system_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master can view fingerprints"
ON public.system_fingerprints
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin_master'
  )
);

-- Ninguém pode deletar ou atualizar (imutável)
-- INSERT apenas via service role (edge function)