
# Otimizacao do Modulo de Email Marketing

## Diagnostico Atual

O modulo ja possui uma base solida: editor visual de fluxos com ReactFlow, gatilhos variados, gerador de campanhas com IA, envio via Resend, e preview mobile. Porem, existem lacunas importantes que limitam o acompanhamento e a eficacia do mentor.

---

## Melhorias Propostas (por prioridade)

### 1. Dashboard com Metricas Reais
**Problema:** O card "Emails Enviados" esta fixo em 0. Nenhuma metrica real e exibida.
**Solucao:** Consultar `email_flow_executions` para exibir:
- Total de emails enviados (contagem real)
- Taxa de sucesso/falha
- Ultimo envio (data)
- Emails enviados nos ultimos 7 dias

### 2. Historico de Execucoes por Fluxo
**Problema:** O mentor nao consegue ver quem recebeu emails, quando, e se deu certo.
**Solucao:** Adicionar uma aba "Historico" ou um botao nos cards de fluxo que abre um painel com:
- Lista de execucoes (mentorado, data, status)
- Filtro por periodo
- Contagem de envios por fluxo

### 3. Duplicar Fluxo
**Problema:** Para criar um fluxo parecido, o mentor precisa refazer tudo do zero.
**Solucao:** Botao "Duplicar" no card do fluxo que clona nodes, edges e configuracoes com nome "Copia de [nome]".

### 4. Renomear Fluxo
**Problema:** Apos criar, nao e possivel alterar nome/descricao do fluxo.
**Solucao:** Permitir edicao inline do nome e descricao no header do FlowEditor.

### 5. Segmentacao Dinamica de Audiencia
**Problema:** Apenas "todos" ou "especificos" (selecao manual). O mentor nao consegue segmentar por estagio da jornada, atividade recente ou conclusao de trilha.
**Solucao:** Adicionar filtros de audiencia:
- Por estagio da jornada (journey_stages)
- Mentorados ativos nos ultimos X dias
- Mentorados que completaram trilha X
- Mentorados inativos ha X dias

### 6. Mais Variaveis Dinamicas no Email
**Problema:** Apenas `{{nome}}` e `{{email}}` sao substituidas.
**Solucao:** Expandir para:
- `{{business_name}}` - nome do negocio
- `{{mentor_name}}` - nome do mentor
- `{{dias_na_jornada}}` - dias desde o inicio
- `{{trilhas_concluidas}}` - numero de trilhas concluidas
- Painel visual listando as variaveis disponiveis no editor

### 7. Stats por Card de Fluxo
**Problema:** Os cards de fluxo mostram apenas "X etapas". Nao ha visibilidade de performance.
**Solucao:** Exibir no card:
- Quantidade de envios realizados
- Ultimo envio
- Total de destinatarios atingidos

### 8. Grid de Stats Responsiva
**Problema:** O grid de stats usa `grid-cols-4` fixo, quebrando no mobile.
**Solucao:** Alterar para `grid-cols-2 md:grid-cols-4`.

---

## Detalhes Tecnicos

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/admin/EmailMarketing.tsx` | Stats reais, duplicar fluxo, renomear, historico, grid responsivo, stats por card |
| `src/components/email/FlowEditor.tsx` | Renomear fluxo inline, mais variaveis, segmentacao dinamica |
| `src/components/email/FlowSendModal.tsx` | Mais variaveis na substituicao |
| `supabase/functions/execute-email-flow/index.ts` | Substituir novas variaveis, buscar dados extras do mentorado |
| `supabase/functions/generate-email-campaign/index.ts` | Incluir novas variaveis no system prompt da IA |

### Queries Necessarias

- Stats reais: `SELECT COUNT(*) FROM email_flow_executions WHERE flow_id IN (SELECT id FROM email_flows WHERE mentor_id = ?)`
- Stats por fluxo: `SELECT flow_id, COUNT(*), MAX(started_at) FROM email_flow_executions GROUP BY flow_id`
- Segmentacao por jornada: join entre `memberships` e `journey_stages`
- Variaveis extras: join com `mentorado_business_profiles` e `trail_progress`

### Sem Migracao de Banco
Todas as tabelas necessarias ja existem (`email_flow_executions`, `email_flows`, `email_templates`, `memberships`, `profiles`, `mentorado_business_profiles`). Nenhuma alteracao de schema e necessaria.

---

## Resultado Esperado

O mentor tera visibilidade completa sobre suas campanhas (quem recebeu, quando, se funcionou), podera duplicar e reutilizar fluxos rapidamente, segmentar audiencias de forma inteligente, e usar emails mais personalizados com variaveis contextuais do negocio do mentorado.
