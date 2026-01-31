
# Plano de Implementação Completo - MentorHub Pro

## Resumo

Implementar a plataforma completa com dois portais distintos:
- **Você (Mentor)**: Dashboard Admin com todas as métricas e gestão
- **Seus 39 mentorados**: Area de Membros com trilhas, ranking, CRM pessoal e Centro SOS

---

## Fase 1: Estrutura do Banco de Dados

### 1.1 Sistema de Roles e Perfis

```text
+------------------+       +------------------+       +------------------+
|   auth.users     |       |   user_roles     |       |    profiles      |
+------------------+       +------------------+       +------------------+
| id (uuid)        |<----->| user_id (uuid)   |       | id (uuid)        |
| email            |       | role (enum)      |       | user_id (uuid)   |
| ...              |       +------------------+       | full_name        |
+------------------+              |                   | avatar_url       |
                                  |                   | phone            |
                          mentor / mentorado          | created_at       |
                                                      +------------------+
```

**Tabelas a criar:**
- `app_role` (enum): mentor, mentorado
- `user_roles`: controle de permissoes (separado do profile por seguranca)
- `profiles`: dados basicos do usuario
- `mentors`: configuracoes especificas do mentor (logo, cores, bio)
- `mentorados`: vinculo mentorado -> mentor + status onboarding

### 1.2 Modulo CRM

- `crm_leads`: pipeline de vendas do mentor
- `crm_prospections`: prospeccoes dos mentorados (alimenta ranking)
- `crm_interactions`: historico de interacoes

### 1.3 Modulo Trilhas e Conteudo

- `trails`: trilhas de aprendizado
- `trail_modules`: modulos dentro de cada trilha
- `trail_lessons`: aulas/conteudos
- `trail_progress`: progresso de cada mentorado
- `certificates`: certificados emitidos

### 1.4 Modulo Calendario

- `meetings`: encontros agendados
- `meeting_attendees`: confirmacao de presenca
- `meeting_recordings`: gravacoes salvas

### 1.5 Modulo Centro de Treinamento (IA)

- `call_transcripts`: transcricoes enviadas
- `call_analyses`: analises geradas pela IA

### 1.6 Modulo Centro SOS

- `sos_requests`: solicitacoes urgentes
- `sos_responses`: respostas/atendimentos

### 1.7 Modulo Gamificacao

- `ranking_entries`: entradas do ranking (prospeccoes)
- `badges`: conquistas disponiveis
- `user_badges`: conquistas desbloqueadas

### 1.8 Modulo Email Marketing

- `email_templates`: templates de email
- `email_automations`: gatilhos automaticos
- `email_logs`: historico de envios

### 1.9 Teste Comportamental

- `behavioral_questions`: perguntas DISC/Eneagrama
- `behavioral_responses`: respostas dos mentorados
- `behavioral_reports`: relatorios gerados pela IA

---

## Fase 2: Sistema de Autenticacao e Roteamento

### 2.1 Fluxo de Login

```text
Usuario faz login
       |
       v
Verifica role na tabela user_roles
       |
       +---> role = 'mentor' ---> /admin (Dashboard do Mentor)
       |
       +---> role = 'mentorado' ---> /app (Area de Membros)
```

### 2.2 Rotas da Aplicacao

**Portal Admin (Mentor):**
- `/admin` - Dashboard principal
- `/admin/crm` - CRM e Pipeline
- `/admin/mentorados` - Gestao de mentorados
- `/admin/trilhas` - Gestao de conteudos
- `/admin/calendario` - Agenda de encontros
- `/admin/sos` - Fila de atendimentos SOS
- `/admin/ranking` - Visualizacao do ranking
- `/admin/emails` - Campanhas de email
- `/admin/relatorios` - Analytics e relatorios

**Portal Mentorado (Area de Membros):**
- `/app` - Dashboard do mentorado
- `/app/trilhas` - Trilhas de aprendizado
- `/app/meu-crm` - CRM pessoal (prospeccoes)
- `/app/calendario` - Proximos encontros
- `/app/treinamento` - Upload de calls + analise IA
- `/app/ranking` - Leaderboard
- `/app/sos` - Solicitar ajuda urgente
- `/app/perfil` - Teste comportamental e configuracoes

---

## Fase 3: Portal do Mentor (Dashboard Admin)

### 3.1 Dashboard Principal
- Cards com metricas: mentorados ativos, engajamento, calls agendadas
- Grafico de evolucao mensal
- Alertas de mentorados em risco (IA)
- Atalhos rapidos

### 3.2 CRM Kanban
- Pipeline visual: Lead > Qualificado > Negociacao > Fechado
- Drag and drop entre colunas
- Historico de interacoes por lead
- Insights de IA sobre leads quentes

### 3.3 Gestao de Mentorados
- Lista com filtros e busca
- Status de onboarding
- Progresso nas trilhas
- Acoes: enviar email, agendar call, ver historico

### 3.4 Gestao de Trilhas
- CRUD de trilhas, modulos e licoes
- Upload de videos e PDFs
- Ordenacao drag and drop
- Preview do conteudo

### 3.5 Calendario
- Criar/editar encontros
- Integracao Zoom/Meet (link externo inicialmente)
- Lista de presenca
- Salvar gravacoes nas trilhas

### 3.6 Centro SOS
- Fila de solicitacoes pendentes
- Prioridade (alta/media/baixa)
- Historico de atendimentos
- Marcar como resolvido

### 3.7 Rankings
- Visualizar ranking geral
- Filtros: semanal/mensal/all-time
- Distribuir badges manualmente

### 3.8 Email Marketing
- Criar templates com merge tags
- Configurar automacoes
- Ver logs de envios
- Metricas de abertura

---

## Fase 4: Portal do Mentorado (Area de Membros)

### 4.1 Dashboard
- Boas-vindas personalizada
- Progresso geral nas trilhas
- Proximos encontros
- Posicao no ranking
- Badges conquistados

### 4.2 Trilhas de Aprendizado
- Lista de trilhas disponiveis
- Progresso visual (barra)
- Player de video
- Marcar como concluido
- Certificados

### 4.3 Meu CRM (Prospeccoes)
- Registrar novas prospeccoes
- Ver historico
- Pontos acumulados no ranking

### 4.4 Calendario
- Visualizar encontros agendados
- Confirmar presenca
- Link para Zoom/Meet
- Gravacoes anteriores

### 4.5 Centro de Treinamento
- Upload de transcricao de call
- Aguardar analise da IA
- Ver relatorio: pontos fortes, objecoes, score
- Historico de evolucao com grafico

### 4.6 Ranking
- Leaderboard em tempo real
- Sua posicao destacada
- Top 10 do mes
- Historico de colocacoes

### 4.7 Centro SOS
- Solicitar call urgente
- Descrever problema
- Definir prioridade
- Acompanhar status

### 4.8 Perfil e Teste Comportamental
- Editar dados pessoais
- Fazer teste DISC/Eneagrama
- Ver relatorio personalizado gerado por IA
- Recomendacoes de melhoria

---

## Fase 5: Integracao com IA

### 5.1 Analise de Calls
- Edge function que recebe transcricao
- Usa Lovable AI (Gemini) para analisar
- Retorna: pontos fortes, objecoes, sugestoes, score 0-100

### 5.2 Teste Comportamental
- Edge function que processa respostas
- Calcula perfil DISC + Eneagrama
- Gera relatorio focado em vendas

### 5.3 Insights do Dashboard (Mentor)
- Edge function que analisa dados agregados
- Identifica mentorados em risco
- Sugere acoes

### 5.4 Email Marketing Inteligente
- Edge function que monitora comportamento
- Dispara emails automaticos via Resend

---

## Fase 6: Design Premium

### 6.1 Portal do Mentor
- Dark mode elegante
- Sidebar com navegacao
- Cards com glassmorphism
- Gradientes gold/blue nos CTAs
- Graficos com recharts

### 6.2 Portal do Mentorado
- Dark mode consistente
- Navegacao simplificada
- Foco em progresso e conquistas
- Animacoes de celebracao
- Mobile-first

---

## Ordem de Implementacao

1. **Banco de dados**: criar todas as tabelas com RLS
2. **Autenticacao**: sistema de roles e redirecionamento
3. **Portal Mentor - Estrutura**: sidebar, layout, navegacao
4. **Portal Mentor - CRM**: pipeline Kanban funcional
5. **Portal Mentor - Mentorados**: CRUD e listagem
6. **Portal Mentor - Trilhas**: CRUD de conteudos
7. **Portal Mentorado - Estrutura**: sidebar, layout, navegacao
8. **Portal Mentorado - Trilhas**: visualizacao e progresso
9. **Portal Mentorado - CRM**: registro de prospeccoes
10. **Gamificacao**: ranking em tempo real
11. **Calendario**: agendamento e confirmacao
12. **Centro SOS**: solicitacoes e fila
13. **Centro Treinamento**: upload e analise IA
14. **Teste Comportamental**: questionario e relatorio IA
15. **Email Marketing**: templates e automacoes
16. **Dashboard Analytics**: metricas e insights IA

---

## Detalhes Tecnicos

**Frontend:**
- React + TypeScript + Tailwind CSS
- React Router para rotas protegidas
- TanStack Query para cache e sincronizacao
- Recharts para graficos
- Lucide React para icones

**Backend:**
- Lovable Cloud (Supabase)
- RLS policies para seguranca
- Edge functions para IA
- Realtime para ranking

**IA:**
- Lovable AI (Gemini 2.5 Flash) para analises rapidas
- Gemini 2.5 Pro para relatorios complexos

**Integrações:**
- Zoom/Meet: links externos (v1)
- Resend: envio de emails

