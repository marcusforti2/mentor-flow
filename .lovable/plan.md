
# Aba Tarefas: Trocar Kanban por Lista + Adicionar IA e Edicao

O Kanban atual dentro do Sheet lateral nao funciona bem - as colunas ficam apertadas e nao da pra ver os detalhes das tarefas. A proposta e substituir por uma lista agrupada por status, com acoes de editar/excluir, geracao de tarefas via IA (PDF/transcricao), e criacao manual.

---

## O que muda

### 1. Substituir Kanban por Lista agrupada

Trocar o `CampanKanban` na aba Tarefas por um novo componente `TaskListView` que exibe:

- Tarefas em formato de lista, agrupadas por status (A Fazer, Fazendo, Feito) com headers coloridos e contagem
- Cada tarefa mostra: titulo, prioridade (badge colorido), prazo, tags, descricao truncada
- Indicador visual de reuniao associada (se `source_transcript_id` existir)
- Clicar na tarefa abre modal de edicao
- Botao de excluir com confirmacao
- Alterar status via Select inline (sem precisar de drag-and-drop)

### 2. Geracao de tarefas com IA na aba Tarefas

Adicionar o `TranscriptionTaskExtractor` (que ja existe e funciona) diretamente na aba Tarefas, acima da lista. O mentor pode:

- Colar texto de transcricao ou subir PDF/Word
- A IA extrai tarefas automaticamente para aprovacao
- Mentor revisa, edita e salva as tarefas aprovadas
- Tarefas manual tambem disponiveis

### 3. Associar reuniao a tarefa

Na edicao de uma tarefa, adicionar um Select opcional que lista as reunioes do mentorado (`meeting_transcripts`), permitindo "taguear" a tarefa com uma reuniao existente.

---

## Detalhes Tecnicos

### Novo componente: `src/components/campan/TaskListView.tsx`

Substitui o `CampanKanban` na aba Tarefas. Responsabilidades:

- Fetch de `campan_tasks` filtrado por `mentorado_membership_id`
- Fetch de `meeting_transcripts` para popular o select de reuniao associada
- Agrupamento por `status_column` (a_fazer, fazendo, feito)
- Modal de edicao: titulo, descricao, prioridade, prazo, status, reuniao associada
- Dialog de exclusao com confirmacao
- Alterar status via dropdown inline

### Arquivo modificado: `src/pages/admin/Mentorados.tsx`

Na `TabsContent value="tasks"` (linhas 988-998):

- Adicionar o `TranscriptionTaskExtractor` acima do `TaskListView`
- Remover a referencia ao `CampanKanban`
- Conectar o `onTasksSaved` do extractor ao refresh da lista

### Nenhuma migracao necessaria

O campo `source_transcript_id` ja existe na tabela `campan_tasks` e referencia `meeting_transcripts.id`. Toda a mudanca e de frontend.
