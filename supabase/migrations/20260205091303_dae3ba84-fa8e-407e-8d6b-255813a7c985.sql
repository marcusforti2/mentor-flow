-- Add tenant_id and membership columns to functional tables
-- This migration adds multi-tenant support to existing content tables

-- 1. Add tenant_id to ai_tool_usage (keep mentorado_id for backward compatibility during transition)
ALTER TABLE public.ai_tool_usage 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 2. Add tenant_id to trail_progress (if exists) - check first
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trail_progress') THEN
    ALTER TABLE public.trail_progress 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
    ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);
  END IF;
END $$;

-- 3. Add tenant_id to crm_prospections
ALTER TABLE public.crm_prospections
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 4. Add tenant_id to sos_requests
ALTER TABLE public.sos_requests
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 5. Add tenant_id to behavioral_responses
ALTER TABLE public.behavioral_responses
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 6. Add tenant_id to community_posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS author_membership_id UUID REFERENCES public.memberships(id);

-- 7. Add tenant_id to community_messages
ALTER TABLE public.community_messages
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS author_membership_id UUID REFERENCES public.memberships(id);

-- 8. Add tenant_id to mentorado_files
ALTER TABLE public.mentorado_files
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS owner_membership_id UUID REFERENCES public.memberships(id);

-- 9. Add tenant_id to crm_leads  
ALTER TABLE public.crm_leads
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS owner_membership_id UUID REFERENCES public.memberships(id);

-- 10. Add tenant_id to trails
ALTER TABLE public.trails
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS creator_membership_id UUID REFERENCES public.memberships(id);

-- 11. Add tenant_id to badges
ALTER TABLE public.badges
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 12. Add tenant_id to calendar_events
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 13. Add tenant_id to meetings
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 14. Add tenant_id to email_templates
ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 15. Add tenant_id to email_flows
ALTER TABLE public.email_flows
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_tool_usage_tenant ON public.ai_tool_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_usage_membership ON public.ai_tool_usage(membership_id);
CREATE INDEX IF NOT EXISTS idx_crm_prospections_tenant ON public.crm_prospections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_prospections_membership ON public.crm_prospections(membership_id);
CREATE INDEX IF NOT EXISTS idx_sos_requests_tenant ON public.sos_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_tenant ON public.community_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mentorado_files_tenant ON public.mentorado_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trails_tenant ON public.trails(tenant_id);
CREATE INDEX IF NOT EXISTS idx_badges_tenant ON public.badges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_tenant ON public.crm_leads(tenant_id);

-- Migrate existing data to include tenant_id (using the default LBV tenant)
-- First get the LBV tenant ID
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'lbv' LIMIT 1;
  
  IF v_tenant_id IS NOT NULL THEN
    -- Update ai_tool_usage
    UPDATE public.ai_tool_usage 
    SET tenant_id = v_tenant_id,
        membership_id = (
          SELECT m.id FROM public.memberships m 
          JOIN public.mentorados mt ON mt.user_id = m.user_id 
          WHERE mt.id = ai_tool_usage.mentorado_id AND m.role = 'mentee'
          LIMIT 1
        )
    WHERE tenant_id IS NULL;

    -- Update crm_prospections
    UPDATE public.crm_prospections 
    SET tenant_id = v_tenant_id,
        membership_id = (
          SELECT m.id FROM public.memberships m 
          JOIN public.mentorados mt ON mt.user_id = m.user_id 
          WHERE mt.id = crm_prospections.mentorado_id AND m.role = 'mentee'
          LIMIT 1
        )
    WHERE tenant_id IS NULL;

    -- Update sos_requests
    UPDATE public.sos_requests 
    SET tenant_id = v_tenant_id,
        membership_id = (
          SELECT m.id FROM public.memberships m 
          JOIN public.mentorados mt ON mt.user_id = m.user_id 
          WHERE mt.id = sos_requests.mentorado_id AND m.role = 'mentee'
          LIMIT 1
        )
    WHERE tenant_id IS NULL;

    -- Update behavioral_responses
    UPDATE public.behavioral_responses 
    SET tenant_id = v_tenant_id,
        membership_id = (
          SELECT m.id FROM public.memberships m 
          JOIN public.mentorados mt ON mt.user_id = m.user_id 
          WHERE mt.id = behavioral_responses.mentorado_id AND m.role = 'mentee'
          LIMIT 1
        )
    WHERE tenant_id IS NULL;

    -- Update community_posts
    UPDATE public.community_posts 
    SET tenant_id = v_tenant_id,
        author_membership_id = (
          SELECT m.id FROM public.memberships m 
          JOIN public.mentorados mt ON mt.user_id = m.user_id 
          WHERE mt.id = community_posts.mentorado_id AND m.role = 'mentee'
          LIMIT 1
        )
    WHERE tenant_id IS NULL;

    -- Update community_messages
    UPDATE public.community_messages 
    SET tenant_id = v_tenant_id,
        author_membership_id = (
          SELECT m.id FROM public.memberships m 
          JOIN public.mentorados mt ON mt.user_id = m.user_id 
          WHERE mt.id = community_messages.mentorado_id AND m.role = 'mentee'
          LIMIT 1
        )
    WHERE tenant_id IS NULL;

    -- Update mentorado_files
    UPDATE public.mentorado_files 
    SET tenant_id = v_tenant_id,
        owner_membership_id = (
          SELECT m.id FROM public.memberships m 
          JOIN public.mentorados mt ON mt.user_id = m.user_id 
          WHERE mt.id = mentorado_files.mentorado_id AND m.role = 'mentee'
          LIMIT 1
        )
    WHERE tenant_id IS NULL;

    -- Update crm_leads
    UPDATE public.crm_leads 
    SET tenant_id = v_tenant_id,
        owner_membership_id = (
          SELECT m.id FROM public.memberships m 
          JOIN public.mentors mt ON mt.user_id = m.user_id 
          WHERE mt.id = crm_leads.mentor_id AND m.role IN ('mentor', 'admin')
          LIMIT 1
        )
    WHERE tenant_id IS NULL;

    -- Update trails
    UPDATE public.trails 
    SET tenant_id = v_tenant_id,
        creator_membership_id = (
          SELECT m.id FROM public.memberships m 
          JOIN public.mentors mt ON mt.user_id = m.user_id 
          WHERE mt.id = trails.mentor_id AND m.role IN ('mentor', 'admin')
          LIMIT 1
        )
    WHERE tenant_id IS NULL;

    -- Update badges
    UPDATE public.badges 
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;

    -- Update calendar_events
    UPDATE public.calendar_events 
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;

    -- Update meetings
    UPDATE public.meetings 
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;

    -- Update email_templates
    UPDATE public.email_templates 
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;

    -- Update email_flows
    UPDATE public.email_flows 
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- RLS Policies for multi-tenant isolation

-- ai_tool_usage policies
DROP POLICY IF EXISTS "ai_tool_usage_mentee_own" ON public.ai_tool_usage;
DROP POLICY IF EXISTS "ai_tool_usage_staff_view" ON public.ai_tool_usage;

CREATE POLICY "ai_tool_usage_mentee_own" ON public.ai_tool_usage
FOR ALL USING (
  membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
);

CREATE POLICY "ai_tool_usage_staff_view" ON public.ai_tool_usage
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor')
  )
);

-- crm_prospections policies
DROP POLICY IF EXISTS "crm_prospections_mentee_own" ON public.crm_prospections;
DROP POLICY IF EXISTS "crm_prospections_staff_view" ON public.crm_prospections;

CREATE POLICY "crm_prospections_mentee_own" ON public.crm_prospections
FOR ALL USING (
  membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
);

CREATE POLICY "crm_prospections_staff_view" ON public.crm_prospections
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor')
  )
);

-- sos_requests policies  
DROP POLICY IF EXISTS "sos_requests_mentee_own" ON public.sos_requests;
DROP POLICY IF EXISTS "sos_requests_staff_view" ON public.sos_requests;

CREATE POLICY "sos_requests_mentee_own" ON public.sos_requests
FOR ALL USING (
  membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
);

CREATE POLICY "sos_requests_staff_view" ON public.sos_requests
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor')
  )
);

-- community_posts policies
DROP POLICY IF EXISTS "community_posts_tenant" ON public.community_posts;

CREATE POLICY "community_posts_tenant" ON public.community_posts
FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid())
);

-- mentorado_files policies
DROP POLICY IF EXISTS "mentorado_files_mentee_own" ON public.mentorado_files;
DROP POLICY IF EXISTS "mentorado_files_staff_view" ON public.mentorado_files;

CREATE POLICY "mentorado_files_mentee_own" ON public.mentorado_files
FOR ALL USING (
  owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid())
);

CREATE POLICY "mentorado_files_staff_view" ON public.mentorado_files
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor')
  )
);

-- trails policies (visible to entire tenant)
DROP POLICY IF EXISTS "trails_tenant_view" ON public.trails;
DROP POLICY IF EXISTS "trails_staff_manage" ON public.trails;

CREATE POLICY "trails_tenant_view" ON public.trails
FOR SELECT USING (
  tenant_id IN (SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid())
);

CREATE POLICY "trails_staff_manage" ON public.trails
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor')
  )
);

-- badges policies (visible to entire tenant)
DROP POLICY IF EXISTS "badges_tenant_view" ON public.badges;
DROP POLICY IF EXISTS "badges_staff_manage" ON public.badges;

CREATE POLICY "badges_tenant_view" ON public.badges
FOR SELECT USING (
  tenant_id IN (SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid())
);

CREATE POLICY "badges_staff_manage" ON public.badges
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor')
  )
);

-- crm_leads policies (staff only)
DROP POLICY IF EXISTS "crm_leads_staff" ON public.crm_leads;

CREATE POLICY "crm_leads_staff" ON public.crm_leads
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor')
  )
);

-- calendar_events policies (visible to tenant)
DROP POLICY IF EXISTS "calendar_events_tenant" ON public.calendar_events;

CREATE POLICY "calendar_events_tenant" ON public.calendar_events
FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid())
);

-- meetings policies (visible to tenant)
DROP POLICY IF EXISTS "meetings_tenant" ON public.meetings;

CREATE POLICY "meetings_tenant" ON public.meetings
FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid())
);

-- email_templates policies (staff only)
DROP POLICY IF EXISTS "email_templates_staff" ON public.email_templates;

CREATE POLICY "email_templates_staff" ON public.email_templates
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor')
  )
);

-- email_flows policies (staff only)
DROP POLICY IF EXISTS "email_flows_staff" ON public.email_flows;

CREATE POLICY "email_flows_staff" ON public.email_flows
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships 
    WHERE user_id = auth.uid() AND role IN ('admin', 'ops', 'mentor')
  )
);