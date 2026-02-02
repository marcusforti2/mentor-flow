-- Limpar badges existentes (se houver) e popular com os novos
DELETE FROM badges;

-- Inserir badges de Prospecção
INSERT INTO badges (name, description, icon_url, criteria, points_required, mentor_id) VALUES
('Primeiro Contato', 'Cadastrou sua primeira prospecção no CRM', 'prospect_first', 'prospection_count >= 1', 50, (SELECT id FROM mentors LIMIT 1)),
('Caçador Ativo', 'Alcançou 10 prospecções cadastradas', 'prospect_10', 'prospection_count >= 10', 150, (SELECT id FROM mentors LIMIT 1)),
('Mestre da Prospecção', 'Alcançou 50 prospecções - você é uma máquina!', 'prospect_50', 'prospection_count >= 50', 500, (SELECT id FROM mentors LIMIT 1)),
('Lenda das Vendas', 'Alcançou 100 prospecções cadastradas', 'prospect_100', 'prospection_count >= 100', 1000, (SELECT id FROM mentors LIMIT 1));

-- Inserir badges de Trilhas
INSERT INTO badges (name, description, icon_url, criteria, points_required, mentor_id) VALUES
('Primeiro Passo', 'Completou sua primeira aula', 'trail_first', 'lessons_completed >= 1', 30, (SELECT id FROM mentors LIMIT 1)),
('Estudante Dedicado', 'Completou um módulo inteiro', 'trail_module', 'modules_completed >= 1', 100, (SELECT id FROM mentors LIMIT 1)),
('Graduado', 'Completou uma trilha completa', 'trail_complete', 'trails_completed >= 1', 300, (SELECT id FROM mentors LIMIT 1));

-- Inserir badges de Ranking
INSERT INTO badges (name, description, icon_url, criteria, points_required, mentor_id) VALUES
('Top 10', 'Entrou no Top 10 do ranking semanal', 'rank_top10', 'weekly_rank <= 10', 200, (SELECT id FROM mentors LIMIT 1)),
('Pódio', 'Alcançou o Top 3 do ranking semanal', 'rank_top3', 'weekly_rank <= 3', 400, (SELECT id FROM mentors LIMIT 1)),
('Campeão', 'Conquistou o 1º lugar do ranking semanal', 'rank_first', 'weekly_rank = 1', 750, (SELECT id FROM mentors LIMIT 1));

-- Inserir badges de Streak/Consistência
INSERT INTO badges (name, description, icon_url, criteria, points_required, mentor_id) VALUES
('Semana Forte', '7 dias consecutivos de acesso', 'streak_7', 'streak_days >= 7', 100, (SELECT id FROM mentors LIMIT 1)),
('Mês Inabalável', '30 dias consecutivos de acesso', 'streak_30', 'streak_days >= 30', 500, (SELECT id FROM mentors LIMIT 1)),
('Centurião', '100 dias consecutivos - disciplina de elite!', 'streak_100', 'streak_days >= 100', 1500, (SELECT id FROM mentors LIMIT 1));

-- Inserir badges de Ferramentas IA
INSERT INTO badges (name, description, icon_url, criteria, points_required, mentor_id) VALUES
('Curioso', 'Usou uma ferramenta de IA pela primeira vez', 'ai_first', 'ai_tools_used >= 1', 25, (SELECT id FROM mentors LIMIT 1)),
('Explorador IA', 'Utilizou 5 ferramentas de IA diferentes', 'ai_explorer', 'ai_tools_used >= 5', 100, (SELECT id FROM mentors LIMIT 1)),
('Mestre da IA', 'Utilizou todas as 7 ferramentas de IA', 'ai_master', 'ai_tools_used >= 7', 250, (SELECT id FROM mentors LIMIT 1));

-- Criar tabela de prêmios disponíveis na loja
CREATE TABLE IF NOT EXISTS reward_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  points_cost INTEGER NOT NULL,
  category TEXT DEFAULT 'physical',
  stock INTEGER DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de resgates de prêmios
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES reward_catalog(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_address TEXT,
  notes TEXT,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

-- Criar tabela para tracking de uso de ferramentas IA
CREATE TABLE IF NOT EXISTS ai_tool_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela para streaks de acesso
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_access_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE reward_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para reward_catalog
CREATE POLICY "Everyone can view active rewards" ON reward_catalog
  FOR SELECT USING (is_active = true);

CREATE POLICY "Mentors can manage rewards" ON reward_catalog
  FOR ALL USING (has_role(auth.uid(), 'mentor'::app_role));

-- Políticas RLS para reward_redemptions
CREATE POLICY "Mentorados can view their redemptions" ON reward_redemptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM mentorados m WHERE m.id = reward_redemptions.mentorado_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Mentorados can create redemptions" ON reward_redemptions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM mentorados m WHERE m.id = reward_redemptions.mentorado_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Mentors can manage all redemptions" ON reward_redemptions
  FOR ALL USING (has_role(auth.uid(), 'mentor'::app_role));

-- Políticas RLS para ai_tool_usage
CREATE POLICY "Mentorados can manage their AI usage" ON ai_tool_usage
  FOR ALL USING (EXISTS (
    SELECT 1 FROM mentorados m WHERE m.id = ai_tool_usage.mentorado_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Mentors can view all AI usage" ON ai_tool_usage
  FOR SELECT USING (has_role(auth.uid(), 'mentor'::app_role));

-- Políticas RLS para user_streaks
CREATE POLICY "Mentorados can manage their streak" ON user_streaks
  FOR ALL USING (EXISTS (
    SELECT 1 FROM mentorados m WHERE m.id = user_streaks.mentorado_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Mentors can view all streaks" ON user_streaks
  FOR SELECT USING (has_role(auth.uid(), 'mentor'::app_role));

-- Inserir prêmios de exemplo no catálogo
INSERT INTO reward_catalog (name, description, points_cost, category, stock) VALUES
('Livro de Vendas', 'Best-seller sobre técnicas de vendas high ticket', 500, 'physical', 10),
('Caneca Premium', 'Caneca exclusiva da mentoria', 300, 'physical', 20),
('Sessão Individual 30min', 'Sessão particular com o mentor', 2000, 'session', NULL),
('Ingresso Evento VIP', 'Acesso ao próximo evento presencial', 3000, 'event', 5),
('Kit de Brindes', 'Camiseta + Caneca + Caderno exclusivos', 1500, 'physical', 15);