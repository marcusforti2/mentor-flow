
-- Domain management table for multi-tenant custom domains
CREATE TABLE public.tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'active', 'error', 'offline', 'removed')),
  dns_verified BOOLEAN NOT NULL DEFAULT false,
  ssl_active BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  last_check_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain)
);

-- RLS
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- Only master_admin can manage domains
CREATE POLICY "master_admin_full_access" ON public.tenant_domains
  FOR ALL TO authenticated
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

-- Tenant staff can view their own domains
CREATE POLICY "staff_view_own_domains" ON public.tenant_domains
  FOR SELECT TO authenticated
  USING (public.is_tenant_staff(auth.uid(), tenant_id));

-- Updated_at trigger
CREATE TRIGGER update_tenant_domains_updated_at
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
