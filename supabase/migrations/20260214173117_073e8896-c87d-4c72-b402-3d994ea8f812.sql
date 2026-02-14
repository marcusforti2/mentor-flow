
-- ==========================================
-- FASE 2: Complete cleanup of ALL legacy FK columns
-- ==========================================

-- ===== DROP ALL POLICIES ON AFFECTED TABLES =====

-- badges
DROP POLICY IF EXISTS "Mentorados can view badges" ON public.badges;
DROP POLICY IF EXISTS "Mentors can manage badges" ON public.badges;
DROP POLICY IF EXISTS "badges_staff_manage" ON public.badges;
DROP POLICY IF EXISTS "badges_tenant_view" ON public.badges;
-- behavioral_questions
DROP POLICY IF EXISTS "Mentorados can view active questions" ON public.behavioral_questions;
DROP POLICY IF EXISTS "Mentors can manage questions" ON public.behavioral_questions;
-- behavioral_reports
DROP POLICY IF EXISTS "Mentorados can view their report" ON public.behavioral_reports;
DROP POLICY IF EXISTS "Mentors can view all reports" ON public.behavioral_reports;
DROP POLICY IF EXISTS "System can insert reports" ON public.behavioral_reports;
DROP POLICY IF EXISTS "System can update reports" ON public.behavioral_reports;
DROP POLICY IF EXISTS "staff_view_behavioral_reports" ON public.behavioral_reports;
-- behavioral_responses
DROP POLICY IF EXISTS "Mentorados can manage their responses" ON public.behavioral_responses;
DROP POLICY IF EXISTS "Mentors can view all responses" ON public.behavioral_responses;
DROP POLICY IF EXISTS "staff_view_behavioral_responses" ON public.behavioral_responses;
-- calendar_events
DROP POLICY IF EXISTS "Admin master can view all events" ON public.calendar_events;
DROP POLICY IF EXISTS "Mentorados can view mentor events" ON public.calendar_events;
DROP POLICY IF EXISTS "Mentors can manage their events" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_tenant" ON public.calendar_events;
-- call_analyses
DROP POLICY IF EXISTS "Mentorados can view their analyses" ON public.call_analyses;
DROP POLICY IF EXISTS "Mentors can view all analyses" ON public.call_analyses;
DROP POLICY IF EXISTS "System can insert analyses" ON public.call_analyses;
DROP POLICY IF EXISTS "staff_view_call_analyses" ON public.call_analyses;
-- call_transcripts
DROP POLICY IF EXISTS "Mentorados can manage their transcripts" ON public.call_transcripts;
DROP POLICY IF EXISTS "Mentors can view all transcripts" ON public.call_transcripts;
DROP POLICY IF EXISTS "staff_view_call_transcripts" ON public.call_transcripts;
-- certificates
DROP POLICY IF EXISTS "Mentorados can view their certificates" ON public.certificates;
DROP POLICY IF EXISTS "Mentors can manage certificates" ON public.certificates;
DROP POLICY IF EXISTS "staff_view_certificates" ON public.certificates;
-- community_comments
DROP POLICY IF EXISTS "Mentorados can create comments" ON public.community_comments;
DROP POLICY IF EXISTS "Mentorados can delete own comments" ON public.community_comments;
DROP POLICY IF EXISTS "Mentorados can view comments" ON public.community_comments;
DROP POLICY IF EXISTS "Mentors can moderate comments" ON public.community_comments;
DROP POLICY IF EXISTS "Mentors can view all comments" ON public.community_comments;
DROP POLICY IF EXISTS "staff_view_community_comments" ON public.community_comments;
-- community_likes
DROP POLICY IF EXISTS "Mentorados can like posts" ON public.community_likes;
DROP POLICY IF EXISTS "Mentorados can unlike posts" ON public.community_likes;
DROP POLICY IF EXISTS "Mentorados can view likes" ON public.community_likes;
DROP POLICY IF EXISTS "Mentors can view all likes" ON public.community_likes;
DROP POLICY IF EXISTS "staff_view_community_likes" ON public.community_likes;
-- community_messages
DROP POLICY IF EXISTS "Mentorados can delete own messages" ON public.community_messages;
DROP POLICY IF EXISTS "Mentorados can send messages" ON public.community_messages;
DROP POLICY IF EXISTS "Mentorados can view messages" ON public.community_messages;
DROP POLICY IF EXISTS "Mentors can moderate messages" ON public.community_messages;
DROP POLICY IF EXISTS "Mentors can view all messages" ON public.community_messages;
DROP POLICY IF EXISTS "community_messages_tenant_insert" ON public.community_messages;
DROP POLICY IF EXISTS "community_messages_tenant_read" ON public.community_messages;
-- community_posts
DROP POLICY IF EXISTS "Mentorados can create posts" ON public.community_posts;
DROP POLICY IF EXISTS "Mentorados can delete own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Mentorados can update own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Mentorados can view community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Mentors can moderate posts" ON public.community_posts;
DROP POLICY IF EXISTS "Mentors can view all posts" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_tenant" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_tenant_insert" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_tenant_read" ON public.community_posts;
-- crm_interactions
DROP POLICY IF EXISTS "Mentorados can manage their interactions" ON public.crm_interactions;
DROP POLICY IF EXISTS "Mentors can manage lead interactions" ON public.crm_interactions;
-- crm_leads
DROP POLICY IF EXISTS "Mentors can manage their leads" ON public.crm_leads;
DROP POLICY IF EXISTS "crm_leads_staff" ON public.crm_leads;
-- crm_prospections
DROP POLICY IF EXISTS "Mentorados can manage their prospections" ON public.crm_prospections;
DROP POLICY IF EXISTS "Mentors can view tenant prospections" ON public.crm_prospections;
DROP POLICY IF EXISTS "crm_prospections_mentee_own" ON public.crm_prospections;
DROP POLICY IF EXISTS "crm_prospections_staff_view" ON public.crm_prospections;
DROP POLICY IF EXISTS "crm_prospections_staff_write" ON public.crm_prospections;
-- email_automations
DROP POLICY IF EXISTS "Mentors can manage automations" ON public.email_automations;
-- email_flow_executions
DROP POLICY IF EXISTS "Mentors can view executions for their flows" ON public.email_flow_executions;
-- email_flow_triggers
DROP POLICY IF EXISTS "Mentors can manage triggers for their flows" ON public.email_flow_triggers;
-- email_flows
DROP POLICY IF EXISTS "Mentors can create their own flows" ON public.email_flows;
DROP POLICY IF EXISTS "Mentors can delete their own flows" ON public.email_flows;
DROP POLICY IF EXISTS "Mentors can update their own flows" ON public.email_flows;
DROP POLICY IF EXISTS "Mentors can view their own flows" ON public.email_flows;
DROP POLICY IF EXISTS "email_flows_staff" ON public.email_flows;
-- email_logs
DROP POLICY IF EXISTS "Mentors can view email logs" ON public.email_logs;
-- email_templates
DROP POLICY IF EXISTS "Mentors can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_staff" ON public.email_templates;
-- meeting_attendees
DROP POLICY IF EXISTS "Mentorados can manage their attendance" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Mentors can manage attendance" ON public.meeting_attendees;
DROP POLICY IF EXISTS "staff_view_meeting_attendees" ON public.meeting_attendees;
-- meetings
DROP POLICY IF EXISTS "Mentors can manage their meetings" ON public.meetings;
DROP POLICY IF EXISTS "Mentorados can view meetings" ON public.meetings;
DROP POLICY IF EXISTS "meetings_staff" ON public.meetings;
-- sos_requests
DROP POLICY IF EXISTS "Mentors can view SOS requests from their mentorados" ON public.sos_requests;
DROP POLICY IF EXISTS "Mentors can update SOS requests from their mentorados" ON public.sos_requests;
DROP POLICY IF EXISTS "Mentorados can update their own SOS requests" ON public.sos_requests;
DROP POLICY IF EXISTS "Mentorados can create SOS requests" ON public.sos_requests;
DROP POLICY IF EXISTS "Mentorados can view their own SOS requests" ON public.sos_requests;
DROP POLICY IF EXISTS "Mentorados can manage their SOS requests" ON public.sos_requests;
DROP POLICY IF EXISTS "sos_requests_staff" ON public.sos_requests;
DROP POLICY IF EXISTS "sos_requests_mentee_own" ON public.sos_requests;
-- sos_responses
DROP POLICY IF EXISTS "Users can view responses to their requests" ON public.sos_responses;
-- trail_progress
DROP POLICY IF EXISTS "Mentorados can manage their progress" ON public.trail_progress;
DROP POLICY IF EXISTS "Mentors can view all progress" ON public.trail_progress;
DROP POLICY IF EXISTS "staff_view_trail_progress" ON public.trail_progress;
-- trails
DROP POLICY IF EXISTS "Anyone can view published trails" ON public.trails;
DROP POLICY IF EXISTS "Mentors can manage their trails" ON public.trails;
DROP POLICY IF EXISTS "trails_staff" ON public.trails;
DROP POLICY IF EXISTS "trails_tenant_view" ON public.trails;
DROP POLICY IF EXISTS "trails_staff_manage" ON public.trails;
DROP POLICY IF EXISTS "trails_view" ON public.trails;
-- mentorados
DROP POLICY IF EXISTS "Mentorados can view own record" ON public.mentorados;
DROP POLICY IF EXISTS "Mentors can view their mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "mentorados_staff" ON public.mentorados;
DROP POLICY IF EXISTS "mentorados_own" ON public.mentorados;
DROP POLICY IF EXISTS "staff_view_mentorados" ON public.mentorados;
DROP POLICY IF EXISTS "mentorados_auth" ON public.mentorados;

-- ===== DROP ALL LEGACY COLUMNS WITH CASCADE =====

ALTER TABLE public.trails DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.meetings DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.crm_leads DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.badges DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.email_templates DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.email_automations DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.email_flows DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.behavioral_questions DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.calendar_events DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.community_posts DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.community_messages DROP COLUMN IF EXISTS mentor_id CASCADE;
ALTER TABLE public.mentorados DROP COLUMN IF EXISTS mentor_id CASCADE;

ALTER TABLE public.trail_progress DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.certificates DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.meeting_attendees DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.call_transcripts DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.crm_prospections DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.sos_requests DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.email_flow_executions DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.behavioral_responses DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.behavioral_reports DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.community_posts DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.community_likes DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.community_comments DROP COLUMN IF EXISTS mentorado_id CASCADE;
ALTER TABLE public.community_messages DROP COLUMN IF EXISTS mentorado_id CASCADE;

ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_recipient_id_fkey;
ALTER TABLE public.email_logs DROP COLUMN IF EXISTS recipient_id CASCADE;

-- ===== RECREATE POLICIES =====

CREATE POLICY "trails_view" ON public.trails FOR SELECT USING (true);
CREATE POLICY "trails_manage" ON public.trails FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "progress_own" ON public.trail_progress FOR ALL USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "progress_staff" ON public.trail_progress FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "certs_own" ON public.certificates FOR SELECT USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "certs_manage" ON public.certificates FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "meetings_own" ON public.meetings FOR ALL USING (owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "meetings_view" ON public.meetings FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "attendees_own" ON public.meeting_attendees FOR ALL USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "attendees_view" ON public.meeting_attendees FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "transcripts_own" ON public.call_transcripts FOR ALL USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "leads_own" ON public.crm_leads FOR ALL USING (owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "leads_staff" ON public.crm_leads FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "prospections_own" ON public.crm_prospections FOR ALL USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "prospections_staff" ON public.crm_prospections FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "sos_own" ON public.sos_requests FOR ALL USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "sos_staff" ON public.sos_requests FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "badges_view" ON public.badges FOR SELECT USING (true);
CREATE POLICY "badges_manage" ON public.badges FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "templates_own" ON public.email_templates FOR ALL USING (owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "templates_staff" ON public.email_templates FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "automations_own" ON public.email_automations FOR ALL USING (owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "flows_own" ON public.email_flows FOR ALL USING (owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "flows_staff" ON public.email_flows FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "logs_view" ON public.email_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "executions_view" ON public.email_flow_executions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "triggers_manage" ON public.email_flow_triggers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "questions_view" ON public.behavioral_questions FOR SELECT USING (true);
CREATE POLICY "questions_manage" ON public.behavioral_questions FOR ALL USING (owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "responses_own" ON public.behavioral_responses FOR ALL USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "responses_staff" ON public.behavioral_responses FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "reports_own" ON public.behavioral_reports FOR ALL USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "events_own" ON public.calendar_events FOR ALL USING (owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "events_view" ON public.calendar_events FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "posts_own" ON public.community_posts FOR ALL USING (author_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "posts_view" ON public.community_posts FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "likes_own" ON public.community_likes FOR ALL USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "likes_view" ON public.community_likes FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "comments_own" ON public.community_comments FOR ALL USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "comments_view" ON public.community_comments FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "messages_own" ON public.community_messages FOR ALL USING (author_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "messages_view" ON public.community_messages FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "analyses_view" ON public.call_analyses FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "interactions_view" ON public.crm_interactions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "sos_responses_view" ON public.sos_responses FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "mentorados_legacy" ON public.mentorados FOR ALL USING (auth.uid() IS NOT NULL);
