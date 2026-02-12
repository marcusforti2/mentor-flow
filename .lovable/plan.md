

# Melhorias no perfil do mentorado (visao do mentor)

Hoje a aba "Perfil" do mentorado no painel do mentor mostra apenas: dia na jornada, etapa, contato (telefone/email/data de entrada), nome do negocio e arquivos. Existe muito mais dado disponivel no banco que pode ser consolidado para dar ao mentor uma visao completa sem precisar navegar para outras telas.

---

## 1. Resumo de KPIs do mentorado (cards visuais)

Adicionar uma faixa de mini-cards logo abaixo dos cards de "Dia na Jornada" e "Etapa" com metricas reais do banco:

- **Leads no CRM**: contagem de `crm_leads` do mentorado
- **Tarefas concluidas**: contagem de `campan_tasks` com status "done"
- **Trilhas concluidas**: contagem de `trail_progress` com `completed = true`
- **Ultima atividade**: data mais recente em `activity_logs`

Esses dados ja existem no banco e so precisam de queries simples.

---

## 2. Nota IA e ultimo diagnostico

Exibir o card da ultima `training_analyses` do mentorado:

- Nota geral (com cor: verde >= 7, amarelo >= 4, vermelho < 4)
- Resumo do diagnostico
- Pontos fortes e melhorias urgentes como badges/tags
- Data da analise

Se nao houver analise, exibir um estado vazio com sugestao: "Nenhuma analise de performance ainda."

---

## 3. Governo do Negocio - visao somente leitura para o mentor

Hoje o `BusinessProfileForm` so funciona para o proprio mentorado (usa `auth.uid()` para resolver o `mentorado_id`). Para o mentor, criar uma visao resumida read-only com os dados do `mentorado_business_profiles`:

- Faturamento, ticket medio, taxa de conversao, volume de leads
- Nivel de maturidade e dependencia do dono (com indicadores visuais)
- Pontos de caos selecionados
- Porcentagem de preenchimento do perfil de negocio

Isso evita que o mentor precise "impersonar" o aluno so para ver o diagnostico.

---

## 4. Timeline de atividade recente

Exibir as ultimas 5-10 acoes do `activity_logs` do mentorado em formato de timeline compacta:

- Icone por tipo de acao (lead criado, login, tarefa concluida)
- Descricao e data relativa ("ha 2 horas", "ontem")
- Pontos ganhos por acao (se houver)

---

## 5. Acoes rapidas do mentor

Adicionar botoes de acao rapida no topo do perfil:

- **WhatsApp**: abrir conversa no WhatsApp com o telefone do mentorado (link direto `wa.me`)
- **Enviar mensagem**: link para o WhatsApp ou email
- **Ver CRM completo**: navegar para o CRM filtrado por este mentorado

---

## Detalhes Tecnicos

### Arquivos a criar/modificar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/admin/MentoradoProfileStats.tsx` | Novo componente com os KPIs (leads, tarefas, trilhas, ultima atividade) |
| `src/components/admin/MentoradoAIScore.tsx` | Novo componente com a nota IA e ultimo diagnostico |
| `src/components/admin/MentoradoBusinessSummary.tsx` | Novo componente read-only com resumo do Governo do Negocio |
| `src/components/admin/MentoradoActivityTimeline.tsx` | Novo componente com timeline de atividade recente |
| `src/pages/admin/Mentorados.tsx` | Integrar os novos componentes na aba "Perfil" do Sheet |

### Dados consumidos (todos ja existentes)

- `crm_leads` (owner_membership_id) - contagem de leads
- `campan_tasks` (mentorado_membership_id) - contagem e status
- `trail_progress` (membership_id) - progresso em trilhas
- `activity_logs` (membership_id) - timeline de atividade
- `training_analyses` (mentorado_id) - nota IA e diagnostico
- `mentorado_business_profiles` (mentorado_id) - dados do negocio

### Nenhuma migracao necessaria

Todos os dados ja estao no banco. As melhorias sao puramente de frontend, consumindo tabelas existentes com queries Supabase filtradas pelo `membership_id` ou `mentorado_id` (legacy) do mentorado selecionado.

