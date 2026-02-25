
-- Add custom_domain column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE;

-- Add index for fast domain lookups
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON public.tenants(custom_domain) WHERE custom_domain IS NOT NULL;

-- Set Learning Brand domain
UPDATE public.tenants SET custom_domain = 'sistema.learningbrand.com.br' WHERE slug = 'learning-brand';
