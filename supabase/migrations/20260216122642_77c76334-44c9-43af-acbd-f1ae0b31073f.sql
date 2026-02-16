-- Add monthly_value to tenants for MRR tracking
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS monthly_value numeric DEFAULT 0;

COMMENT ON COLUMN public.tenants.monthly_value IS 'Valor mensal recorrente (MRR) do tenant em reais';
