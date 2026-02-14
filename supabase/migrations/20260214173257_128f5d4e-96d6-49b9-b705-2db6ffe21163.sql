
-- FASE 3: Drop legacy tables mentors and mentorados
-- Also drop the orphan function is_mentorado_owner

DROP FUNCTION IF EXISTS public.is_mentorado_owner(uuid, uuid);

DROP TABLE IF EXISTS public.mentorados CASCADE;
DROP TABLE IF EXISTS public.mentors CASCADE;
