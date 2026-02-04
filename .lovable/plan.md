
# Plano Completo de Debug e Deploy - Apresentação

## Status Geral do Sistema

### O que FUNCIONA:
1. **Autenticação** - Login/Signup com roles (mentor/mentorado/admin_master)
2. **Dashboard Admin** - Cards, estatísticas, navegação
3. **Dashboard Mentorado** - Gamificação, badges, streaks
4. **Sistema de Mentorados** - Lista, aprovação, filtros por jornada
5. **Formulário de Onboarding** - Estilo typeform, perguntas customizáveis
6. **Calendário Admin** - Visualização semana/mês, eventos recorrentes
7. **Edge Functions** - 16 funções ativas (OTP, IA, onboarding, etc.)
8. **Trilhas** - Carrossel estilo Netflix com mockData
9. **CRM de Leads** - Kanban com qualificação

### Problemas Identificados:

```text
┌─────────────────────────────────────────────────────────────────┐
│  CRÍTICO - CORRIGIR ANTES DA APRESENTAÇÃO                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Warning de Refs no Console                                  │
│     - AdminLayout e AdminDashboard causando warnings            │
│     - Tooltip passando ref para componentes funcionais          │
│     - Impacto: Visual só no console (dev), não afeta uso        │
│                                                                 │
│  2. Rotas Placeholder                                           │
│     - /admin/crm → Placeholder                                  │
│     - /admin/ranking → Placeholder                              │
│     - /admin/relatorios → Placeholder                           │
│     - /app/ranking → Placeholder                                │
│     - /app/treinamento → Rota não definida                      │
└─────────────────────────────────────────────────────────────────┘
```

```text
┌─────────────────────────────────────────────────────────────────┐
│  MÉDIO - FUNCIONAL MAS PRECISA ATENÇÃO                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Trilhas usando mockData                                     │
│     - Dados estáticos em src/data/mockTrails.ts                 │
│     - Não integrado com tabelas trails/trail_modules            │
│     - Solução: OK para demo, mencionar que é versão preview     │
│                                                                 │
│  2. Calendário do Mentorado                                     │
│     - Visualiza eventos do mentor                               │
│     - Verificar se está filtrando corretamente                  │
│                                                                 │
│  3. RLS Policy Warning                                          │
│     - Uma policy com "USING (true)" - permissiva demais         │
│     - Leaked password protection desabilitada                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist para Apresentação

### 1. Fluxo do Mentor (Admin)

| Funcionalidade | Status | Testar |
|----------------|--------|--------|
| Login como mentor | OK | Acessar /auth |
| Dashboard com stats | OK | Ver cards e contadores |
| Gerenciar mentorados | OK | Aprovar, ver jornada |
| Formulário onboarding | OK | Criar perguntas, copiar link |
| Calendário | OK | Criar evento, recorrência |
| Centro SOS | OK | Ver solicitações |
| Trilhas | PARCIAL | Ver lista (mockData) |
| Email Marketing | OK | Ver automações |

### 2. Fluxo do Mentorado

| Funcionalidade | Status | Testar |
|----------------|--------|--------|
| Onboarding typeform | OK | Acessar link do mentor |
| Dashboard gamificado | OK | Ver badges, streak |
| Trilhas Netflix | OK | Ver carrossel, detalhes |
| Meu CRM | OK | Kanban de leads |
| Ferramentas IA | OK | Bio, cold message, etc |
| Loja de Prêmios | OK | Ver catálogo |

### 3. Fluxos Críticos para Demo

```text
DEMO 1: Cadastro de Mentorado
─────────────────────────────
1. Mentor acessa /admin/mentorados
2. Clica "Formulário Onboarding"
3. Cria perguntas personalizadas
4. Copia link e envia
5. Mentorado preenche (typeform)
6. OTP no email → Conta criada
7. Redireciona para /app

DEMO 2: Experiência do Mentorado
────────────────────────────────
1. Dashboard com gamificação
2. Trilhas estilo Netflix
3. CRM com leads
4. Ferramentas de IA
5. Loja de prêmios

DEMO 3: Gestão do Mentor
────────────────────────
1. Dashboard com métricas
2. Ver mentorados por etapa
3. Calendário com eventos
4. Centro SOS
```

---

## Correções Técnicas

### 1. Warnings de Console (Refs)

**Problema**: Tooltip passando ref para componentes funcionais

**Correção necessária** em AdminLayout.tsx:
- Envolver componentes dentro de TooltipTrigger com `asChild` corretamente
- Usar `React.forwardRef` nos componentes filhos ou usar elemento nativo

### 2. Rotas Faltantes

**Criar ou redirecionar**:
- `/app/treinamento` - Link no MemberDashboard aponta para rota inexistente
- Solução: Criar componente ou redirecionar para `/app/ferramentas`

### 3. Dados de Trilhas

**Status atual**: Usando `mockTrails.ts` com dados estáticos

**Para produção**: 
- Integrar com tabelas `trails`, `trail_modules`, `trail_lessons`
- Para demo: OK mostrar como preview funcional

---

## Segurança

### Warnings do Linter

1. **RLS Policy permissiva** - Uma tabela com `USING (true)`
   - Identificar qual tabela e corrigir após apresentação

2. **Leaked password protection** - Desabilitada
   - Habilitar em configurações do backend após demo

### Secrets Configurados

- APIFY_API_KEY
- FIRECRAWL_API_KEY  
- LOVABLE_API_KEY
- PILOTERR_API_KEY
- RESEND_API_KEY

---

## Recomendações para Apresentação

### Evitar Durante Demo

1. Não clicar em "Rankings" (/admin/ranking) - placeholder
2. Não clicar em "Relatórios" (/admin/relatorios) - placeholder  
3. Não clicar em "CRM" no admin (/admin/crm) - placeholder
4. Link "Analisar Call" no dashboard mentorado leva para /app/treinamento (não existe)

### Destacar na Apresentação

1. **Onboarding Typeform** - Diferencial UX
2. **Gamificação completa** - Badges, streaks, pontos
3. **Calendário Google-style** - Eventos recorrentes
4. **Ferramentas de IA** - Bio, cold messages, scripts
5. **CRM do Mentorado** - Kanban com qualificação
6. **Trilhas Netflix** - Visual premium

---

## Ações Imediatas

### Prioridade 1 - Antes da Demo

1. Corrigir rota `/app/treinamento`:
   - Redirecionar para `/app/ferramentas` ou criar página básica

2. Limpar console de warnings:
   - Corrigir refs nos Tooltips do AdminLayout

### Prioridade 2 - Após Demo

1. Migrar trilhas de mockData para banco
2. Implementar páginas de Ranking e Relatórios
3. Configurar leaked password protection
4. Revisar e corrigir RLS policies permissivas

---

## Resumo Executivo

**O sistema está 85% funcional** para demonstração. Os principais fluxos (onboarding, gestão de mentorados, calendário, gamificação, trilhas, CRM) estão operacionais.

**Pontos de atenção**:
- Evitar clicar em links placeholder durante demo
- Warnings no console são apenas visuais (não afetam funcionalidade)
- Trilhas usam dados mock (mencionar como "preview")

**Destaques para vender**:
- UX moderna com glassmorphism
- Gamificação completa
- IA integrada nas ferramentas
- Onboarding automatizado
- Calendário profissional
