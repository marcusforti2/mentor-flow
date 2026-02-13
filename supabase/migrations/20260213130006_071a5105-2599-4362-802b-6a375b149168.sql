
-- reward_catalog não tem mentor_id nem tenant_id - é catálogo global
-- Política: qualquer staff autenticado pode ver
CREATE POLICY "staff_view_reward_catalog" ON public.reward_catalog
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin','ops','mentor','master_admin')
    AND m.status = 'active'
  )
);

-- reward_redemptions tem mentorado_id
CREATE POLICY "staff_view_reward_redemptions" ON public.reward_redemptions
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM mentorados mn
    JOIN memberships mem ON mem.user_id = mn.user_id AND mem.status = 'active'
    JOIN memberships viewer ON viewer.tenant_id = mem.tenant_id
    WHERE mn.id = reward_redemptions.mentorado_id
    AND viewer.user_id = auth.uid()
    AND viewer.role IN ('admin','ops','mentor','master_admin')
    AND viewer.status = 'active'
  )
);
