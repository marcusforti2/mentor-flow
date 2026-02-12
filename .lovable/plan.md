
# Plano: Exclusao de Mentorados + Verificacao de Emails + Email Marketing

## 1. Permitir que o Mentor Exclua Mentorados

**Problema**: A pagina de Mentorados (`src/pages/admin/Mentorados.tsx`) nao tem botao de excluir. O mentor nao consegue remover mentorados da sua base.

**Solucao**: Adicionar botao de excluir no painel de detalhes (Sheet) do mentorado, com confirmacao via dialog.

### Alteracoes:
- **`src/pages/admin/Mentorados.tsx`**: Adicionar botao "Excluir Mentorado" no Sheet de detalhes com AlertDialog de confirmacao
- A exclusao vai:
  1. Desativar o membership (status = 'suspended') em vez de deletar permanentemente
  2. Desativar o assignment mentor-mentee
  3. Atualizar a lista local apos exclusao
  4. Mostrar toast de sucesso/erro

---

## 2. Verificacao de Emails de Boas-Vindas

**Status**: FUNCIONANDO

Os logs confirmam que os emails estao sendo enviados com sucesso via Resend:
- `Welcome email sent successfully to: teste@gmail.com`
- `Welcome email sent successfully to: mariana@teste.com`
- `Welcome email sent successfully to: marcus.forti@live.com`

A chave `RESEND_API_KEY` esta configurada e o template usa o branding "Learning Brand" corretamente.

**Nenhuma alteracao necessaria.**

---

## 3. Email Marketing - Verificacao de Conexao com Fluxos

**Status**: CONECTADO E FUNCIONAL

A analise mostra que o sistema de Email Marketing esta completo:

| Componente | Status |
|---|---|
| Editor de Fluxos (drag-and-drop) | OK - ReactFlow com nos de Email, Wait, Condition, Trigger |
| Gatilhos disponiveis | OK - Onboarding, Jornada CS, Inatividade, Conclusao de Trilha, Data, Manual |
| Audiencia (todos ou especificos) | OK - Seletor de mentorados no FlowEditor |
| Envio via Resend | OK - `execute-email-flow` com rate limit de 600ms |
| Templates personalizaveis | OK - Editor de templates com variaveis |
| Teste de fluxos | OK - FlowTestModal com preview mobile |
| Envio real | OK - FlowSendModal |
| Branding Learning Brand | OK - Template HTML com marca correta |

**Nenhuma alteracao necessaria no Email Marketing.**

---

## Resumo Tecnico

### Arquivo a modificar:
- `src/pages/admin/Mentorados.tsx`

### Logica de exclusao:
```text
1. Mentor clica "Excluir" no Sheet de detalhes
2. AlertDialog pede confirmacao
3. Ao confirmar:
   - UPDATE memberships SET status = 'suspended' WHERE id = mentorado.membership_id
   - UPDATE mentor_mentee_assignments SET status = 'inactive' WHERE mentee_membership_id = mentorado.membership_id
4. Refresh da lista
5. Toast de sucesso
```

### Imports adicionais necessarios:
- `AlertDialog` components do Radix UI (ja instalado)
- Icone `Trash2` do Lucide (ja importado na pagina de Email Marketing)
