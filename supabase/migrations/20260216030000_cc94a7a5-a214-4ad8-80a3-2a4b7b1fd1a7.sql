-- Add theme_mode to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS theme_mode text NOT NULL DEFAULT 'dark' CHECK (theme_mode IN ('dark', 'light'));

-- Add theme_mode to tenant_branding
ALTER TABLE public.tenant_branding ADD COLUMN IF NOT EXISTS theme_mode text DEFAULT 'dark' CHECK (theme_mode IN ('dark', 'light'));