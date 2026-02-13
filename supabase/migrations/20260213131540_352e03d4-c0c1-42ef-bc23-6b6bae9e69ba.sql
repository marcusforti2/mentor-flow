
-- =============================================
-- FASE: Políticas tenant-cêntricas via JOIN mentorado -> memberships
-- Abordagem aditiva: mantém políticas legadas
-- =============================================

-- 1. community_comments (via post_id -> community_posts.tenant_id)
CREATE POLICY "staff_view_community_comments" ON public.community_comments
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM community_posts cp
    JOIN memberships viewer ON viewer.tenant_id = cp.tenant_id
    WHERE cp.id = community_comments.post_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 2. community_likes (via post_id -> community_posts.tenant_id)
CREATE POLICY "staff_view_community_likes" ON public.community_likes
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM community_posts cp
    JOIN memberships viewer ON viewer.tenant_id = cp.tenant_id
    WHERE cp.id = community_likes.post_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 3. training_analyses (via mentorado_id -> mentorados -> memberships)
CREATE POLICY "staff_view_training_analyses" ON public.training_analyses
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = training_analyses.mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 4. mentorado_business_profiles (via mentorado_id)
CREATE POLICY "staff_view_business_profiles" ON public.mentorado_business_profiles
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = mentorado_business_profiles.mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 5. call_transcripts (via mentorado_id)
CREATE POLICY "staff_view_call_transcripts" ON public.call_transcripts
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = call_transcripts.mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 6. call_analyses (via transcript_id -> call_transcripts.mentorado_id)
CREATE POLICY "staff_view_call_analyses" ON public.call_analyses
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM call_transcripts ct
    JOIN mentorados mn ON mn.id = ct.mentorado_id
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE ct.id = call_analyses.transcript_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 7. behavioral_reports (via mentorado_id)
CREATE POLICY "staff_view_behavioral_reports" ON public.behavioral_reports
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = behavioral_reports.mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 8. behavioral_responses (já tem tenant_id na tabela)
CREATE POLICY "staff_view_behavioral_responses" ON public.behavioral_responses
FOR SELECT TO public
USING (
  tenant_id IN (
    SELECT m.tenant_id FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin','ops','mentor','master_admin')
    AND m.status = 'active'
  )
);

-- 9. certificates (via mentorado_id)
CREATE POLICY "staff_view_certificates" ON public.certificates
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = certificates.mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 10. roleplay_simulations (via mentorado_id)
CREATE POLICY "staff_view_roleplay_simulations" ON public.roleplay_simulations
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = roleplay_simulations.mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 11. user_badges (via mentorado_id)
CREATE POLICY "staff_view_user_badges" ON public.user_badges
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = user_badges.mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);

-- 12. user_streaks (via mentorado_id)
CREATE POLICY "staff_view_user_streaks" ON public.user_streaks
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = user_streaks.mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);
