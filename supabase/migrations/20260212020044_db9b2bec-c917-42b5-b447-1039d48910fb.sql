
-- 1. calendar_events: mentor_id already made nullable by previous failed migration partial apply - check
-- If not, do it now
ALTER TABLE public.calendar_events ALTER COLUMN mentor_id DROP NOT NULL;

-- 2. Preencher tenant_id dos posts existentes via mentors -> memberships
UPDATE public.community_posts cp
SET tenant_id = mb.tenant_id
FROM public.mentors m
JOIN public.memberships mb ON mb.user_id = m.user_id AND mb.status = 'active'
WHERE cp.mentor_id = m.id AND cp.tenant_id IS NULL;

-- 3. Preencher tenant_id das mensagens existentes
UPDATE public.community_messages cm
SET tenant_id = mb.tenant_id
FROM public.mentors m
JOIN public.memberships mb ON mb.user_id = m.user_id AND mb.status = 'active'
WHERE cm.mentor_id = m.id AND cm.tenant_id IS NULL;

-- 4. sos_requests: tornar mentorado_id nullable
ALTER TABLE public.sos_requests ALTER COLUMN mentorado_id DROP NOT NULL;

-- 5. RLS para community_posts por tenant
CREATE POLICY "community_posts_tenant_read"
ON public.community_posts FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- 6. RLS para community_messages por tenant
CREATE POLICY "community_messages_tenant_read"
ON public.community_messages FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- INSERT policies
CREATE POLICY "community_posts_tenant_insert"
ON public.community_posts FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "community_messages_tenant_insert"
ON public.community_messages FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
