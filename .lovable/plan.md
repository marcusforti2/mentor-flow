

# Tarefas manuais para o mentorado

## O que muda

Hoje o botao "Adicionar tarefa manual" so aparece para o mentor, porque o componente exige `mentorMembershipId` e `tenantId`. O mentorado ve o Kanban mas nao consegue criar tarefas proprias. Alem disso, a politica de seguranca do banco nao permite que mentorados insiram tarefas.

---

## Mudancas

### 1. Permitir mentorados inserirem tarefas no banco

Criar uma nova politica de seguranca que permite mentorados criarem tarefas para si mesmos (onde `mentorado_membership_id` e a propria membership do usuario).

### 2. Adaptar o CampanKanban para aceitar criacao pelo mentorado

- Adicionar uma prop `allowSelfCreate` (boolean) ao componente
- Quando `allowSelfCreate` e verdadeiro, exibir o botao "Adicionar tarefa" mesmo sem `mentorMembershipId`
- Na criacao, o campo `created_by_membership_id` sera o proprio `mentoradoMembershipId` e o `tenant_id` sera buscado da membership do usuario
- Tarefas criadas pelo mentorado nao terao `source_transcript_id` (nao sao de reuniao)

### 3. Atualizar a pagina MinhasTarefas

- Passar `allowSelfCreate={true}` para o `CampanKanban`
- Atualizar o texto do empty state: "Voce ainda nao tem tarefas. Crie sua primeira tarefa!"

---

## Detalhes Tecnicos

### Migracao SQL

```text
CREATE POLICY "Mentorados can insert own tasks"
  ON campan_tasks FOR INSERT
  WITH CHECK (
    mentorado_membership_id IN (
      SELECT id FROM memberships WHERE user_id = auth.uid()
    )
  );
```

### Arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| Nova migracao SQL | Politica INSERT para mentorados |
| `CampanKanban.tsx` | Nova prop `allowSelfCreate`, buscar `tenant_id` da membership quando mentor nao esta presente, exibir botao para mentorado |
| `MinhasTarefas.tsx` | Passar `allowSelfCreate={true}`, melhorar empty state |

### Logica de criacao pelo mentorado

Quando `allowSelfCreate` esta ativo e nao ha `mentorMembershipId`:
- Buscar o `tenant_id` da membership do mentorado via query simples
- Usar o proprio `mentoradoMembershipId` como `created_by_membership_id`
- O resto do formulario e identico (titulo, descricao, prioridade, prazo, coluna)

