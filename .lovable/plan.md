

# Correção Completa do Campan: RLS + Fallback Manual + Observabilidade

## Problema Raiz

Os logs do console mostram claramente:

```
"new row violates row-level security policy for table meeting_transcripts" (code 42501)
```

A IA funciona corretamente (a edge function `extract-tasks` esta OK), mas o fluxo falha **antes** de chamar a IA, na hora de salvar a transcricao no banco. A politica RLS exige que `mentor_membership_id` pertenca ao usuario logado, mas em cenarios de impersonation ou roles como `master_admin`/`admin`, o `activeMembership.id` pode nao coincidir com a verificacao `auth.uid()`.

O mesmo problema potencialmente afeta `extracted_task_drafts` e `campan_tasks`.

## Plano de Correcao (4 frentes)

### 1. Corrigir RLS das 3 tabelas Campan

Adicionar politicas que permitam tenant staff (admin, ops, mentor, master_admin) operar nas tabelas, usando a funcao `is_tenant_staff` que ja existe no projeto:

**meeting_transcripts**:
- DROP politica atual "Mentors can manage transcripts..."
- CREATE nova politica ALL: `is_tenant_staff(auth.uid(), tenant_id)` -- permite qualquer staff do tenant inserir/ler/atualizar

**extracted_task_drafts**:
- DROP politica atual "Mentors can manage task drafts"
- CREATE nova politica ALL: `is_tenant_staff(auth.uid(), tenant_id)`

**campan_tasks**:
- DROP politica "Mentors can manage tasks" (restritiva demais)
- CREATE nova politica ALL para staff: `is_tenant_staff(auth.uid(), tenant_id)`
- Manter as politicas de SELECT/UPDATE do mentorado (estao corretas)

### 2. Fallback Manual Obrigatorio

Adicionar botao "Adicionar tarefa manual" em dois lugares:

**A) No CampanKanban** (visivel tanto para mentor quanto mentorado):
- Botao "+" no header do kanban
- Modal simples: titulo (obrigatorio), descricao, prioridade, prazo, coluna inicial
- INSERT direto em `campan_tasks`

**B) No TranscriptionTaskExtractor** (visao do mentor):
- Botao "Adicionar tarefa manual" sempre visivel, independente do estado da IA
- Mesmo modal acima

### 3. Melhorar Tratamento de Erros na UI

No `TranscriptionTaskExtractor`:
- Exibir mensagem de erro detalhada via toast quando RLS ou IA falhar
- Mostrar botao "Tentar novamente" + "Adicionar manual" quando erro ocorrer
- Nao "engolir" excecoes silenciosamente

No `CampanKanban`:
- Toast de erro quando drag-and-drop falhar
- Feedback visual de salvamento

### 4. Robustez na Insercao de Tarefas

No `TranscriptionTaskExtractor.handleSave`:
- Se insercao em lote falhar, tentar inserir individualmente
- Reportar quantas falharam e por que
- Nao perder as tarefas que deram certo

## Arquivos Alterados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| Nova migracao SQL | Criar | Corrigir RLS das 3 tabelas |
| `src/components/campan/CampanKanban.tsx` | Editar | Adicionar botao manual + modal de criacao |
| `src/components/campan/TranscriptionTaskExtractor.tsx` | Editar | Melhorar erros + fallback manual + insercao individual |

## Detalhes Tecnicos

### Migracao SQL

```text
-- Drop politicas restritivas
DROP POLICY "Mentors can manage transcripts for their mentorados" ON meeting_transcripts;
DROP POLICY "Mentors can manage task drafts" ON extracted_task_drafts;
DROP POLICY "Mentors can manage tasks" ON campan_tasks;

-- Novas politicas usando is_tenant_staff
CREATE POLICY "Staff can manage transcripts"
  ON meeting_transcripts FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can manage task drafts"
  ON extracted_task_drafts FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff can manage tasks"
  ON campan_tasks FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));
```

### Modal de Tarefa Manual (CampanKanban)

- Dialog com campos: titulo, descricao, prioridade (select), prazo (date), coluna inicial (select)
- Props `mentorMembershipId` e `tenantId` adicionadas ao componente
- INSERT em `campan_tasks` com `created_by_membership_id = mentorMembershipId`

### Insercao Individual como Fallback

```text
// Se batch falhar, tenta um por um
for (const insert of inserts) {
  const { error } = await supabase.from('campan_tasks').insert(insert);
  if (error) failedCount++;
  else successCount++;
}
// Reporta resultado parcial
```

