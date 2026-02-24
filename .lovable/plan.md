

# Plano: Calendario de Eventos -- Cards Visuais + Novos Tipos + Seed Learning Brand

## Contexto

Atualmente o calendario tanto do mentor quanto do mentorado abre direto na visao de calendario (mes/semana). O usuario quer:
1. A aba principal ser **cards visuais** agrupados por dia da semana mostrando eventos recorrentes (treinamentos, hotseats, mentorias)
2. Calendario fica como aba secundaria
3. Mentorado ve os cards com links diretos de acesso
4. Mentor tem UI melhorada para cadastrar e gerenciar eventos com links
5. Novos tipos de evento: `treinamento`, `hotseat` (alem dos existentes)
6. Seed dos eventos fixos da Learning Brand

---

## 1. Novos tipos de evento

Adicionar ao array `eventTypes` em ambos os arquivos:

| value | label | emoji | cor |
|-------|-------|-------|-----|
| `treinamento` | Treinamento | 🏋️ | cyan-500 |
| `hotseat` | Hot Seat | 🔥 | orange-500 |

Nao precisa de migration pois `event_type` e `text` livre (sem CHECK constraint).

---

## 2. Mentorado: Redesign com aba "Programacao" como principal

### Nova estrutura de abas

```text
Tabs: [📋 Programação] [📅 Calendário] [🕐 Agendar Sessão]
```

### Aba "Programacao" (nova, default)

Mostra a **semana atual** com cards visuais agrupados por dia:

```text
+--------------------------------------------------+
| Sua semana · 24 Fev - 02 Mar 2026                |
| [< Anterior]                     [Próxima >]     |
+--------------------------------------------------+
|                                                    |
| TERÇA-FEIRA · 25 Fev                              |
| +----------------------------------------------+  |
| | 🏋️ 19:00 · Pré-vendas                       |  |
| | Jonathan Pamplona avalia suas abordagens...  |  |
| | [🔗 Entrar na reunião →]                     |  |
| +----------------------------------------------+  |
| | 🎯 20:00 · Vendas                            |  |
| | Jacob analisa calls ao vivo...               |  |
| | [🔗 Entrar na reunião →]                     |  |
| +----------------------------------------------+  |
|                                                    |
| QUARTA-FEIRA · 26 Fev                             |
| +----------------------------------------------+  |
| | 🎯 10:30 · Mentoria em Grupo                 |  |
| | Aulas estratégicas com convidados...         |  |
| | [🔗 Entrar na reunião →]                     |  |
| +----------------------------------------------+  |
|                                                    |
| QUINTA-FEIRA · 27 Fev                             |
| +----------------------------------------------+  |
| | 🔥 10:30 · Hot Seat em Grupo                 |  |
| | Traga sua dúvida para solucionarmos...       |  |
| | [🔗 Entrar na reunião →]                     |  |
| +----------------------------------------------+  |
|                                                    |
| (dias sem eventos nao aparecem)                    |
+--------------------------------------------------+
```

### Cards visuais

Cada card tera:
- Barra lateral colorida por tipo
- Gradiente de fundo sutil
- Horario em destaque
- Titulo grande
- Descricao (2-3 linhas)
- Botao "Entrar na reuniao" com icone Video + ExternalLink (se tiver `meeting_url`)
- Badge do tipo (Mentoria, Treinamento, Hot Seat)
- Se o evento e hoje: badge "HOJE" com destaque especial (borda glow)

### Logica

- Agrupa eventos da semana atual por dia da semana
- Ordena por horario dentro de cada dia
- Dias sem eventos sao omitidos
- Navegacao por semana (anterior/proxima)
- No topo: contador de "X eventos esta semana"

---

## 3. Mentor: UI melhorada para cadastro

### Mesma estrutura de abas

```text
Tabs: [📋 Programação] [📅 Calendário]
```

### Aba "Programacao" (nova, default)

Mesmos cards visuais da visao do mentorado, porem:
- Botao "Editar" aparece no hover de cada card
- Botao "+ Novo Evento" no topo
- Ao clicar em um card, abre o dialog de edicao

### Dialog de criacao melhorado

Adicionar ao formulario existente:
- Secao "Responsavel/Facilitador" (campo texto opcional) para mostrar no card quem conduz
- Nao precisa de coluna nova: vai na `description` ou podemos adicionar ao schema

### Novo campo no schema (migration)

```sql
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS facilitator_name text;
```

Isso permite mostrar "Jonathan Pamplona" ou "Jacob" nos cards sem depender da description.

---

## 4. Seed: Eventos da Learning Brand

Inserir 4 eventos recorrentes (12 semanas cada) no tenant `683e41ac-240d-47f3-9327-c07f5cfb74e7`:

| Dia | Hora | Titulo | Tipo | Facilitador | Descricao |
|-----|------|--------|------|-------------|-----------|
| Terca | 19:00 | Pre-vendas | treinamento | Jonathan Pamplona | Nosso especialista em prospeccao avalia abordagens com direcionamentos praticos de melhoria |
| Terca | 20:00 | Vendas | treinamento | Jacob | Analises ao vivo das calls de vendas com feedback estrategico para aumentar a conversao |
| Quarta | 10:30 | Mentoria em Grupo | mentoria | — | Aulas conduzidas pela equipe e convidados do ecossistema com conteudos estrategicos e aplicaveis |
| Quinta | 10:30 | Hot Seat em Grupo | hotseat | — | O momento para trazer sua duvida de qualquer tema e trabalhar junto para encontrar solucoes praticas |

Serao inseridos via Edge Function `seed-tenant-data` ou SQL direto, criando 12 ocorrencias semanais de cada a partir da proxima terca (25 Fev 2026).

---

## 5. Arquivos editados/criados

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/...` | Adicionar coluna `facilitator_name` |
| `src/pages/member/Calendario.tsx` | Redesign: aba Programacao como default com cards visuais |
| `src/pages/admin/Calendario.tsx` | Adicionar aba Programacao + novos eventTypes + facilitator |
| `supabase/functions/seed-tenant-data/index.ts` | Seed dos eventos da Learning Brand |

---

## Ordem de implementacao

1. Migration: coluna `facilitator_name`
2. Frontend mentorado: redesign com aba Programacao
3. Frontend mentor: aba Programacao + campo facilitator no dialog
4. Seed: inserir eventos da Learning Brand
5. Deploy da edge function e executar seed

