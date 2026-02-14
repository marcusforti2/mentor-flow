# Plano de Evolução — Fase 4: Inteligência

## Visão Geral

Quatro grandes funcionalidades priorizadas por dependência técnica e impacto de negócio.

| # | Feature | Impacto | Complexidade | Dependências |
|---|---------|---------|-------------|--------------|
| 1 | Relatórios de Performance | 🔥 Alto | Média | Dados existentes (activity_logs, CRM, trilhas) |
| 2 | Alertas Inteligentes (SOS+) | 🔥 Alto | Média | Relatórios + activity_logs |
| 3 | Arsenal IA para Mentorados | 🔥 Altíssimo | Alta | Perfil de negócio + pitch context |
| 4 | Agendamento Integrado | ⚡ Médio | Alta | Google Calendar OAuth |

---

## 1. Relatórios de Performance do Mentor

**Objetivo:** Dashboard analítico com visão consolidada da evolução de cada mentorado.

### Funcionalidades
- **Score por Mentorado**: Nota calculada com base em leads criados, tarefas concluídas, trilhas avançadas, frequência de login e streak
- **Evolução Temporal**: Gráfico de linha mostrando score semanal ao longo do tempo
- **Ranking Comparativo**: Ranking entre mentorados do mesmo mentor por score
- **KPIs Consolidados**: Total de leads, taxa de conversão, trilhas concluídas, engajamento médio
- **Filtros**: Por período, por mentor, por estágio da jornada CS
- **Exportação PDF**: Relatório individual do mentorado com gráficos e métricas

### Arquivos a Criar/Modificar
| Arquivo | Mudança |
|---------|---------|
| `src/pages/admin/Relatorios.tsx` | Refatorar para usar dados reais + gráficos |
| `src/components/admin/MenteeScoreCard.tsx` | Novo: card de score individual |
| `src/components/admin/PerformanceChart.tsx` | Novo: gráfico de evolução temporal |
| `src/components/admin/MenteeRanking.tsx` | Novo: ranking comparativo |
| `src/hooks/useMentorReports.tsx` | Refatorar com queries reais |

### Dados Disponíveis
- `activity_logs` → frequência, ações recentes
- `crm_prospections` → leads criados, status
- `trail_progress` → trilhas em andamento/concluídas
- `campan_tasks` → tarefas concluídas
- `user_streaks` → consistência
- `behavioral_reports` → perfil comportamental

### Sem Migração de Banco
Todos os dados necessários já existem nas tabelas atuais.

---

## 2. Alertas Inteligentes (SOS+)

**Objetivo:** Sistema de notificações proativas para o mentor sobre situações que exigem ação.

### Tipos de Alerta
1. **Mentorado Inativo** — Sem login há X dias (configurável, default: 3)
2. **Lead Esfriando** — Lead quente sem interação há X dias
3. **Tarefa Atrasada** — Tarefa com due_date vencido
4. **Streak Quebrado** — Mentorado perdeu streak ativo
5. **Trilha Parada** — Mentorado não avança em trilha há X dias
6. **SOS Pendente** — Chamado SOS sem resposta há X horas

### Funcionalidades
- **Painel de Alertas**: Ícone no header com badge de contagem
- **Central de Notificações**: Drawer lateral com lista filtrada
- **Ações Rápidas**: WhatsApp, e-mail, ver perfil direto do alerta
- **Configuração**: Mentor define thresholds por tipo de alerta
- **Digest por Email**: Resumo diário/semanal automático (via cron Edge Function)

### Arquivos a Criar/Modificar
| Arquivo | Mudança |
|---------|---------|
| `src/components/admin/AlertsPanel.tsx` | Novo: painel de alertas |
| `src/components/admin/AlertsBell.tsx` | Novo: ícone com badge no header |
| `src/hooks/useSmartAlerts.tsx` | Novo: hook de alertas inteligentes |
| `supabase/functions/check-alerts/index.ts` | Novo: Edge Function para verificar alertas |
| `src/components/layouts/MentorLayout.tsx` | Adicionar AlertsBell no header |

### Migração Necessária
```sql
CREATE TABLE public.smart_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  mentor_membership_id UUID NOT NULL REFERENCES memberships(id),
  mentee_membership_id UUID REFERENCES memberships(id),
  alert_type TEXT NOT NULL, -- 'inactive', 'lead_cooling', 'task_overdue', 'streak_broken', 'trail_stalled', 'sos_pending'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
-- Policies: staff can view/manage tenant alerts
```

---

## 3. Arsenal IA para Mentorados (Ativação)

**Objetivo:** Desbloquear as 8 ferramentas de IA que hoje mostram "Em Breve".

### Ferramentas (ordem de ativação)
1. **Mentor Virtual 24/7** — Chatbot com contexto do negócio (streaming)
2. **Qualificador de Leads** — Já existe no mentor, adaptar para mentorado
3. **Gerador de Bio** — LinkedIn/Instagram/WhatsApp
4. **Gerador de Conteúdo** — Posts, carrosséis, stories
5. **Hub de Comunicação** — Scripts, follow-up, cold messages
6. **Simulador de Objeções** — Role-play interativo
7. **Criador de Propostas** — Proposta comercial em PDF
8. **Análise de Conversão** — Análise de calls/conversas

### Estratégia de Ativação
- Cada ferramenta é uma tab/rota dentro de `/member/ferramentas-ia`
- Todas utilizam o mesmo gateway Lovable AI (Gemini)
- Contexto do negócio (`mentorado_business_profiles.pitch_context`) injetado automaticamente no system prompt
- Tracking de uso via `ai_tool_usage`
- Ativação gradual: Mentor Virtual primeiro (mais impactante), depois as demais

### Arquivos a Modificar
| Arquivo | Mudança |
|---------|---------|
| `src/pages/member/FerramentasIA.tsx` | Transformar de landing "Em Breve" para hub funcional |
| `src/components/ai-tools/*.tsx` | Ativar componentes existentes para contexto do mentorado |
| `supabase/functions/ai-tools/index.ts` | Já existe, verificar se suporta contexto do mentorado |

### Sem Migração de Banco
Edge functions e tabelas de tracking já existem.

---

## 4. Agendamento Integrado

**Objetivo:** Sistema de booking de sessões com integração Google Calendar.

### Funcionalidades
- **Disponibilidade do Mentor**: Configurar horários disponíveis por dia da semana
- **Booking pelo Mentorado**: Visualizar slots e agendar sessão
- **Confirmação Automática**: Email + notificação in-app
- **Integração Google Calendar**: Sync bidirecional via OAuth
- **Link de Reunião**: Geração automática de link Zoom/Meet
- **Cancelamento/Reagendamento**: Com política de antecedência

### Migração Necessária
```sql
CREATE TABLE public.mentor_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_membership_id UUID NOT NULL REFERENCES memberships(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  day_of_week INTEGER NOT NULL, -- 0=domingo, 6=sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.session_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_membership_id UUID NOT NULL REFERENCES memberships(id),
  mentee_membership_id UUID NOT NULL REFERENCES memberships(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed', 'no_show'
  meeting_url TEXT,
  notes TEXT,
  google_event_id TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Arquivos a Criar
| Arquivo | Mudança |
|---------|---------|
| `src/components/scheduling/AvailabilityEditor.tsx` | Novo: config de horários |
| `src/components/scheduling/BookingCalendar.tsx` | Novo: calendário de slots |
| `src/components/scheduling/BookingConfirmation.tsx` | Novo: confirmação |
| `src/hooks/useScheduling.tsx` | Novo: hook de agendamento |
| `supabase/functions/sync-google-calendar/index.ts` | Novo: sync OAuth |

---

## Ordem de Execução Recomendada

```
Bloco A (Fundação de Dados) ──→ Relatórios de Performance
Bloco B (Ação Proativa)     ──→ Alertas Inteligentes
Bloco C (Valor p/ Mentorado) ──→ Arsenal IA (Mentor Virtual primeiro)
Bloco D (Operacional)       ──→ Agendamento Integrado
```

Blocos A e B são interdependentes (alertas usam dados de performance).
Bloco C é independente e pode ser paralelo.
Bloco D é independente mas requer OAuth (mais complexo).
