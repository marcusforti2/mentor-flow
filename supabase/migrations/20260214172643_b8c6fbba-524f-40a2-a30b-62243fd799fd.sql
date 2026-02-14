
-- ==========================================
-- FASE 1: Drop FK columns de tabelas periféricas
-- Step 1: Drop ALL existing policies on affected tables
-- Step 2: Drop legacy columns
-- Step 3: Recreate policies using membership_id
-- ==========================================

-- === DROP ALL POLICIES FIRST ===

-- user_streaks
DROP POLICY IF EXISTS "Mentorados can manage their streak" ON public.user_streaks;
DROP POLICY IF EXISTS "Mentors can view all streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "staff_view_user_streaks" ON public.user_streaks;

-- ranking_entries
DROP POLICY IF EXISTS "Everyone can view ranking" ON public.ranking_entries;
DROP POLICY IF EXISTS "System can manage ranking" ON public.ranking_entries;

-- user_badges
DROP POLICY IF EXISTS "Everyone can view user badges" ON public.user_badges;
DROP POLICY IF EXISTS "Mentors can manage user badges" ON public.user_badges;
DROP POLICY IF EXISTS "staff_view_user_badges" ON public.user_badges;

-- reward_redemptions
DROP POLICY IF EXISTS "Mentorados can create redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Mentorados can view their redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Mentors can manage all redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "staff_view_reward_redemptions" ON public.reward_redemptions;

-- roleplay_simulations
DROP POLICY IF EXISTS "Mentorados can manage their simulations" ON public.roleplay_simulations;
DROP POLICY IF EXISTS "Mentors can view all simulations" ON public.roleplay_simulations;
DROP POLICY IF EXISTS "staff_view_roleplay_simulations" ON public.roleplay_simulations;

-- training_analyses
DROP POLICY IF EXISTS "Mentorados can delete their own analyses" ON public.training_analyses;
DROP POLICY IF EXISTS "Mentorados can insert their own analyses" ON public.training_analyses;
DROP POLICY IF EXISTS "Mentorados can view their own analyses" ON public.training_analyses;
DROP POLICY IF EXISTS "Mentors can delete mentorado analyses" ON public.training_analyses;
DROP POLICY IF EXISTS "Mentors can view mentorado analyses" ON public.training_analyses;
DROP POLICY IF EXISTS "staff_view_training_analyses" ON public.training_analyses;

-- ai_tool_usage
DROP POLICY IF EXISTS "Mentorados can manage their AI usage" ON public.ai_tool_usage;
DROP POLICY IF EXISTS "Mentors can view all AI usage" ON public.ai_tool_usage;
DROP POLICY IF EXISTS "ai_tool_usage_mentee_own" ON public.ai_tool_usage;
DROP POLICY IF EXISTS "ai_tool_usage_staff_view" ON public.ai_tool_usage;

-- mentorado_business_profiles
DROP POLICY IF EXISTS "Mentorados can manage their business profile" ON public.mentorado_business_profiles;
DROP POLICY IF EXISTS "Mentors can view all business profiles" ON public.mentorado_business_profiles;
DROP POLICY IF EXISTS "master_admin_view_business_profiles" ON public.mentorado_business_profiles;
DROP POLICY IF EXISTS "staff_view_business_profiles" ON public.mentorado_business_profiles;

-- mentorado_invites
DROP POLICY IF EXISTS "Mentors can create invites" ON public.mentorado_invites;
DROP POLICY IF EXISTS "Mentors can delete their own invites" ON public.mentorado_invites;
DROP POLICY IF EXISTS "Mentors can read their own invites" ON public.mentorado_invites;
DROP POLICY IF EXISTS "Mentors can update their own invites" ON public.mentorado_invites;
DROP POLICY IF EXISTS "Mentors can view their own invites" ON public.mentorado_invites;

-- mentorado_files
DROP POLICY IF EXISTS "Mentorados can view their files" ON public.mentorado_files;
DROP POLICY IF EXISTS "Mentors can manage files for their mentorados" ON public.mentorado_files;
DROP POLICY IF EXISTS "mentorado_files_mentee_own" ON public.mentorado_files;
DROP POLICY IF EXISTS "mentorado_files_mentee_own_membership" ON public.mentorado_files;
DROP POLICY IF EXISTS "mentorado_files_staff_manage" ON public.mentorado_files;
DROP POLICY IF EXISTS "mentorado_files_staff_view" ON public.mentorado_files;

-- mentor_library
DROP POLICY IF EXISTS "Mentorados can view mentor library" ON public.mentor_library;
DROP POLICY IF EXISTS "Mentors can manage their library" ON public.mentor_library;

-- activity_logs
DROP POLICY IF EXISTS "Mentorados can insert own activities" ON public.activity_logs;
DROP POLICY IF EXISTS "Mentorados can view own activities" ON public.activity_logs;
DROP POLICY IF EXISTS "Mentors can view tenant activities" ON public.activity_logs;

-- === DROP LEGACY COLUMNS ===

ALTER TABLE public.user_streaks DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.ranking_entries DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.user_badges DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.reward_redemptions DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.roleplay_simulations DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.training_analyses DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.ai_tool_usage DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.mentorado_business_profiles DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.mentorado_invites DROP COLUMN IF EXISTS mentor_id;
ALTER TABLE public.mentorado_invites DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.mentorado_files DROP COLUMN IF EXISTS mentor_id;
ALTER TABLE public.mentorado_files DROP COLUMN IF EXISTS mentorado_id;
ALTER TABLE public.mentor_library DROP COLUMN IF EXISTS mentor_id;
ALTER TABLE public.activity_logs DROP COLUMN IF EXISTS mentorado_id;

-- === RECREATE POLICIES ===

-- user_streaks (has membership_id)
CREATE POLICY "user_streaks_own" ON public.user_streaks FOR ALL
  USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));

-- ranking_entries (has membership_id)
CREATE POLICY "ranking_view" ON public.ranking_entries FOR SELECT USING (true);

-- user_badges (has membership_id)
CREATE POLICY "user_badges_view" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges_staff_manage" ON public.user_badges FOR ALL
  USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));

-- reward_redemptions (has membership_id)
CREATE POLICY "redemptions_own" ON public.reward_redemptions FOR ALL
  USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));

-- roleplay_simulations (NO membership_id - legacy table, keep open for now)
CREATE POLICY "simulations_authenticated" ON public.roleplay_simulations FOR ALL USING (auth.uid() IS NOT NULL);

-- training_analyses (has membership_id)
CREATE POLICY "training_own" ON public.training_analyses FOR ALL
  USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));

-- ai_tool_usage (has membership_id, tenant_id)
CREATE POLICY "ai_usage_own" ON public.ai_tool_usage FOR ALL
  USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "ai_usage_staff_view" ON public.ai_tool_usage FOR SELECT
  USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- mentorado_business_profiles (has membership_id)
CREATE POLICY "biz_profile_own" ON public.mentorado_business_profiles FOR ALL
  USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));

-- mentorado_invites (NO membership_id - legacy table, deprecated by invites table)
CREATE POLICY "invites_legacy_auth" ON public.mentorado_invites FOR ALL USING (auth.uid() IS NOT NULL);

-- mentorado_files (has owner_membership_id, tenant_id)
CREATE POLICY "files_own" ON public.mentorado_files FOR ALL
  USING (owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "files_staff_view" ON public.mentorado_files FOR SELECT
  USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- mentor_library (NO membership_id - legacy table)
CREATE POLICY "library_auth" ON public.mentor_library FOR ALL USING (auth.uid() IS NOT NULL);

-- activity_logs (has membership_id, tenant_id)
CREATE POLICY "activity_own" ON public.activity_logs FOR ALL
  USING (membership_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "activity_staff_view" ON public.activity_logs FOR SELECT
  USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
