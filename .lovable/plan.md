
## Email Marketing Funcional: Envio Real + Selecao de Audiencia

O sistema de email marketing atual permite criar fluxos visuais e testar envios, mas nao tem o mecanismo para **enviar de verdade** para os mentorados. Vamos implementar:

---

### 1. Selecao de Audiencia no Fluxo

Ao criar/editar um fluxo, o mentor podera configurar **para quem** o fluxo sera enviado. Adicionaremos um campo `audience` na tabela `email_flows` e uma UI no FlowEditor.

**Opcoes de audiencia:**
- **Todos os mentorados** do tenant (padrao)
- **Mentorados especificos** - selecionados manualmente por nome

**Alteracoes no banco:**
```text
ALTER TABLE email_flows ADD COLUMN audience_type text DEFAULT 'all';
ALTER TABLE email_flows ADD COLUMN audience_membership_ids uuid[] DEFAULT '{}';
```

**UI no FlowEditor:** Novo painel lateral ou secao no header com:
- Select "Para quem enviar?" (Todos / Especificos)
- Se "Especificos", mostra lista de mentorados do tenant com checkboxes
- Busca de mentorados por nome

---

### 2. Botao "Enviar Agora" no FlowEditor

Alem do "Testar Fluxo" (que ja existe), adicionaremos um botao **"Enviar Agora"** que dispara o fluxo para a audiencia selecionada em producao.

Fluxo:
1. Mentor clica "Enviar Agora"
2. Modal de confirmacao mostra: quantidade de destinatarios, quantos emails serao enviados
3. Mentor confirma
4. Chama a edge function `execute-email-flow`
5. Mostra progresso/resultado

---

### 3. Edge Function `execute-email-flow`

Nova edge function que:
1. Recebe `flowId` e opcionalmente `immediate: true`
2. Carrega o fluxo (nodes, edges, audience)
3. Resolve os destinatarios:
   - Se `audience_type = 'all'`: busca todos os mentees ativos do tenant via `memberships` + `profiles`
   - Se `audience_type = 'specific'`: usa os `audience_membership_ids`
4. Para cada destinatario, percorre os nodes do fluxo:
   - Nodes `email`: envia via Resend (com delay de 600ms entre envios)
   - Nodes `wait`: se `immediate = true`, pula os waits (envia tudo de uma vez)
   - Se o fluxo ficar "ativo" (rodando), registra na tabela `email_flow_executions` para processar os waits depois
5. Registra cada envio na tabela `email_flow_executions`

**Para fluxos com wait nodes (deixar rodando):**
- O fluxo e marcado como `is_active = true`
- A execucao e registrada com `status = 'waiting'` e `current_node_id`
- Uma segunda edge function (ou a mesma, chamada por cron) processa as execucoes pendentes

**Para envio imediato (sem respeitar waits):**
- Envia todos os emails do fluxo de uma vez, ignorando wait nodes
- Util para campanhas pontuais

---

### 4. Modal de Confirmacao de Envio

Novo componente `FlowSendModal.tsx`:
- Mostra resumo: "X mentorados receberao Y emails"
- Toggle: "Enviar imediatamente (ignorar esperas)" vs "Respeitar o fluxo (ativar automacao)"
- Lista dos mentorados que receberao
- Botao de confirmacao

---

### 5. Salvar audiencia junto com o fluxo

A funcao `handleSaveFlow` no `EmailMarketing.tsx` sera atualizada para salvar tambem `audience_type` e `audience_membership_ids`.

---

### Resumo de arquivos

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | `audience_type` e `audience_membership_ids` em `email_flows` |
| `src/components/email/FlowEditor.tsx` | Painel de audiencia + botao "Enviar Agora" |
| `src/components/email/FlowSendModal.tsx` | NOVO - Modal de confirmacao de envio |
| `src/pages/admin/EmailMarketing.tsx` | Atualizar save para incluir audiencia |
| `supabase/functions/execute-email-flow/index.ts` | NOVO - Edge function de envio real |
| `supabase/config.toml` | Registrar nova function |

### Detalhes tecnicos

- Destinatarios sao resolvidos via: `memberships` (role = mentee, tenant_id, status = active) + JOIN `profiles` (email, full_name)
- Resend rate limit respeitado: 600ms delay entre envios
- Variavel `{{nome}}` substituida pelo `full_name` do profile de cada mentorado
- Execucoes registradas em `email_flow_executions` para rastreamento
- A coluna `mentorado_id` existente na `email_flow_executions` sera usada para registrar por membership_id (reusar)
