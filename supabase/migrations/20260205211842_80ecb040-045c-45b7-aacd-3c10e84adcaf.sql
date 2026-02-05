
-- Make mentorado_id nullable in tables that will use membership_id as primary reference
-- This allows the system to work without the legacy mentorados table

-- 1. activity_logs: make mentorado_id nullable, ensure membership_id is usable
ALTER TABLE public.activity_logs ALTER COLUMN mentorado_id DROP NOT NULL;

-- 2. crm_prospections: make mentorado_id nullable
ALTER TABLE public.crm_prospections ALTER COLUMN mentorado_id DROP NOT NULL;

-- 3. ai_tool_usage: make mentorado_id nullable  
ALTER TABLE public.ai_tool_usage ALTER COLUMN mentorado_id DROP NOT NULL;

-- 4. Add indexes on membership_id for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_membership_id ON public.activity_logs(membership_id);
CREATE INDEX IF NOT EXISTS idx_crm_prospections_membership_id ON public.crm_prospections(membership_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_usage_membership_id ON public.ai_tool_usage(membership_id);

-- 5. Add index on tenant_id for activity_logs filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_id ON public.activity_logs(tenant_id);
