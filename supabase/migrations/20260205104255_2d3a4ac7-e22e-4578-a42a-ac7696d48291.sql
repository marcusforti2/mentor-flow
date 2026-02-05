-- Adicionar coluna status à tabela tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial'));

-- Atualizar registros existentes
UPDATE public.tenants SET status = 'active' WHERE status IS NULL;