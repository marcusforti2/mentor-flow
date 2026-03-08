
-- =====================================================
-- SECURITY AUDIT FIX: Cross-tenant RLS policies
-- =====================================================

-- 1. mentor_library: add tenant_id + membership_id for scoping
ALTER TABLE public.mentor_library ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.mentor_library ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

DROP POLICY IF EXISTS "library_auth" ON public.mentor_library;
CREATE POLICY "library_tenant_scope" ON public.mentor_library FOR ALL
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR (tenant_id IS NULL AND auth.uid() IS NOT NULL)
  );

-- 2. mentorado_invites: legacy table — lock down completely
DROP POLICY IF EXISTS "invites_legacy_auth" ON public.mentorado_invites;
CREATE POLICY "invites_legacy_locked" ON public.mentorado_invites FOR ALL
  USING (false);

-- 3. call_analyses: scope via transcript → call_transcripts.membership_id
DROP POLICY IF EXISTS "analyses_view" ON public.call_analyses;
CREATE POLICY "analyses_tenant_scope" ON public.call_analyses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM call_transcripts ct
      JOIN memberships m ON m.id = ct.membership_id
      WHERE ct.id = call_analyses.transcript_id
        AND m.tenant_id IN (SELECT get_user_tenant_ids())
    )
  );

-- 4. certificates: scope via membership_id
DROP POLICY IF EXISTS "certs_manage" ON public.certificates;
CREATE POLICY "certs_tenant_scope" ON public.certificates FOR ALL
  USING (
    membership_id IN (
      SELECT id FROM memberships WHERE tenant_id IN (SELECT get_user_tenant_ids())
    )
  );

-- 5. crm_interactions: scope via prospection or lead
DROP POLICY IF EXISTS "interactions_view" ON public.crm_interactions;
CREATE POLICY "interactions_tenant_scope" ON public.crm_interactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM crm_prospections p
      WHERE p.id = crm_interactions.prospection_id
        AND p.tenant_id IN (SELECT get_user_tenant_ids())
    )
    OR EXISTS (
      SELECT 1 FROM crm_leads l
      WHERE l.id = crm_interactions.lead_id
        AND l.tenant_id IN (SELECT get_user_tenant_ids())
    )
  );

-- 6. email_flow_executions: scope via flow
DROP POLICY IF EXISTS "executions_view" ON public.email_flow_executions;
CREATE POLICY "executions_tenant_scope" ON public.email_flow_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_flows ef
      WHERE ef.id = email_flow_executions.flow_id
        AND ef.tenant_id IN (SELECT get_user_tenant_ids())
    )
  );

-- 7. email_flow_triggers: scope via flow
DROP POLICY IF EXISTS "triggers_manage" ON public.email_flow_triggers;
CREATE POLICY "triggers_tenant_scope" ON public.email_flow_triggers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM email_flows ef
      WHERE ef.id = email_flow_triggers.flow_id
        AND ef.tenant_id IN (SELECT get_user_tenant_ids())
    )
  );

-- 8. email_logs: scope via template
DROP POLICY IF EXISTS "logs_view" ON public.email_logs;
CREATE POLICY "logs_tenant_scope" ON public.email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_templates et
      WHERE et.id = email_logs.template_id
        AND et.tenant_id IN (SELECT get_user_tenant_ids())
    )
  );

-- 9. roleplay_simulations: scope via lead
DROP POLICY IF EXISTS "simulations_authenticated" ON public.roleplay_simulations;
CREATE POLICY "simulations_tenant_scope" ON public.roleplay_simulations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads l
      WHERE l.id = roleplay_simulations.lead_id
        AND l.tenant_id IN (SELECT get_user_tenant_ids())
    )
  );

-- 10. sos_responses: scope via request
DROP POLICY IF EXISTS "sos_responses_view" ON public.sos_responses;
CREATE POLICY "sos_responses_tenant_scope" ON public.sos_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sos_requests sr
      WHERE sr.id = sos_responses.request_id
        AND sr.tenant_id IN (SELECT get_user_tenant_ids())
    )
  );

-- 11. meeting_attendees: scope via membership
DROP POLICY IF EXISTS "attendees_view" ON public.meeting_attendees;
CREATE POLICY "attendees_tenant_scope" ON public.meeting_attendees FOR SELECT
  USING (
    membership_id IN (
      SELECT id FROM memberships WHERE tenant_id IN (SELECT get_user_tenant_ids())
    )
  );

-- =====================================================
-- FIX: Remove public USING(true) SELECT policies
-- =====================================================

-- trails: already has trails_manage + trails_mentee_tenant_view
DROP POLICY IF EXISTS "trails_view" ON public.trails;

-- badges: replace with tenant-scoped
DROP POLICY IF EXISTS "badges_view" ON public.badges;
CREATE POLICY "badges_view_tenant" ON public.badges FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- behavioral_questions: replace with tenant-scoped
DROP POLICY IF EXISTS "questions_view" ON public.behavioral_questions;
CREATE POLICY "questions_view_tenant" ON public.behavioral_questions FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- user_badges: replace with tenant-scoped via membership
DROP POLICY IF EXISTS "user_badges_view" ON public.user_badges;
CREATE POLICY "user_badges_view_tenant" ON public.user_badges FOR SELECT TO authenticated
  USING (
    membership_id IN (
      SELECT id FROM memberships WHERE tenant_id IN (SELECT get_user_tenant_ids())
    )
  );
