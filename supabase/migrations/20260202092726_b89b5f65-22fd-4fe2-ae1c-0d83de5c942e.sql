-- Adicionar campo de meta diária de prospecções no perfil de negócio
ALTER TABLE mentorado_business_profiles 
ADD COLUMN IF NOT EXISTS daily_prospection_goal INTEGER DEFAULT 10;