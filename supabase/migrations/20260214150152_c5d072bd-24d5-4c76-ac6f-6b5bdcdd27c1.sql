
-- Add membership_id to remaining critical tables used by frontend

-- 1. mentorado_business_profiles
ALTER TABLE public.mentorado_business_profiles
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- Create unique index so we can upsert by membership_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_mbp_membership_id 
  ON public.mentorado_business_profiles(membership_id) WHERE membership_id IS NOT NULL;

-- 2. user_badges
ALTER TABLE public.user_badges
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 3. user_streaks  
ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_streaks_membership_id
  ON public.user_streaks(membership_id) WHERE membership_id IS NOT NULL;

-- 4. reward_redemptions
ALTER TABLE public.reward_redemptions
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- 5. training_analyses (used by TrainingAnalyzer)
ALTER TABLE public.training_analyses
  ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);

-- Backfill all from mentorados.user_id → memberships
UPDATE public.mentorado_business_profiles bp
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE bp.mentorado_id = mt.id AND bp.membership_id IS NULL;

UPDATE public.user_badges ub
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE ub.mentorado_id = mt.id AND ub.membership_id IS NULL;

UPDATE public.user_streaks us
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE us.mentorado_id = mt.id AND us.membership_id IS NULL;

UPDATE public.reward_redemptions rr
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE rr.mentorado_id = mt.id AND rr.membership_id IS NULL;

UPDATE public.training_analyses ta
SET membership_id = m.id
FROM public.mentorados mt
JOIN public.memberships m ON m.user_id = mt.user_id AND m.role = 'mentee' AND m.status = 'active'
WHERE ta.mentorado_id = mt.id AND ta.membership_id IS NULL;
