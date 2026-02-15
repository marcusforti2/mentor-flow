
-- Bucket para uploads de branding (prints, logos, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('branding-assets', 'branding-assets', false);

-- Política: Master admin pode fazer tudo no bucket
CREATE POLICY "Master admin full access branding-assets"
ON storage.objects FOR ALL
USING (bucket_id = 'branding-assets' AND public.is_master_admin(auth.uid()));

-- Tabela de propostas de branding geradas pela IA
CREATE TABLE public.tenant_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  
  -- Assets enviados (URLs no storage)
  uploaded_assets TEXT[] DEFAULT '{}',
  
  -- Proposta gerada pela IA
  brand_concept TEXT,
  brand_attributes JSONB,
  color_palette JSONB,
  system_colors JSONB,
  suggested_name TEXT,
  suggested_logo_url TEXT,
  typography JSONB,
  ai_analysis TEXT,
  
  -- Metadata
  generated_by UUID REFERENCES public.memberships(id),
  approved_by UUID REFERENCES public.memberships(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin full access tenant_branding"
ON public.tenant_branding FOR ALL
USING (public.is_master_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_tenant_branding_updated_at
BEFORE UPDATE ON public.tenant_branding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campos extras na tabela tenants para branding aplicado
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS font_family TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS brand_attributes JSONB,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;
