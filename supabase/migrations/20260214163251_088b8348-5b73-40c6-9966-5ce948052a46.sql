
-- Add membership_id to community_likes
ALTER TABLE public.community_likes
ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- Add membership_id to community_comments  
ALTER TABLE public.community_comments
ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- Backfill community_likes
UPDATE public.community_likes cl
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE cl.mentorado_id = mt.id AND cl.membership_id IS NULL;

-- Backfill community_comments
UPDATE public.community_comments cc
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE cc.mentorado_id = mt.id AND cc.membership_id IS NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_community_likes_membership_id ON public.community_likes(membership_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_membership_id ON public.community_comments(membership_id);
