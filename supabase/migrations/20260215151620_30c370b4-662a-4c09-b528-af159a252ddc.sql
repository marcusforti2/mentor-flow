
-- Add unique constraint on tenant_id for upsert support
ALTER TABLE public.tenant_branding ADD CONSTRAINT tenant_branding_tenant_id_unique UNIQUE (tenant_id);
