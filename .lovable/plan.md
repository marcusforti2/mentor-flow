

# Mobile Funcional - Otimizar UI para Telas Pequenas

Todos os componentes dentro do Sheet lateral do mentorado precisam de ajustes para funcionar bem em telas de celular (390px). Os problemas principais sao: grids de 2 colunas que espremem campos, botoes amontoados em linhas horizontais, e textos truncados.

---

## Mudancas por Componente

### 1. MeetingRegistrar.tsx - Formulario de Registrar Reuniao

**Problema**: Grid de 2 colunas (Titulo + Data) fica apertado no mobile.

- Trocar `grid grid-cols-2` por `grid grid-cols-1 sm:grid-cols-2` para empilhar titulo e data no mobile
- Botoes de acao (Cancelar/Salvar) ja estao ok com `flex gap-2`

### 2. MeetingHistoryList.tsx - Cards de Reunioes

**Problema**: Titulo truncado ("R..."), botoes (Editar, Excluir, Gerar Tarefas) amontoados na mesma linha.

- Separar o layout do card em duas linhas no mobile:
  - Linha 1: titulo completo (sem truncate no mobile) + badge de fonte
  - Linha 2: metadados (data, status, contagem de tarefas) com flex-wrap
  - Linha 3: botoes de acao empilhados horizontalmente com mais espaco
- Usar `flex-col sm:flex-row` no container principal do card
- Mover os botoes de acao para uma linha propria abaixo dos metadados

### 3. TranscriptionTaskExtractor.tsx - Extrator de Tarefas com IA

**Problema**: Botoes de upload (PDF/Word, tl;dv) e acoes (Gerar IA, Manual) ficam apertados.

- Botoes de upload: ja usam `flex-wrap`, ok
- Botoes de acao: ja usam `flex-wrap`, ok
- Arquivo selecionado: truncar nome do arquivo com `max-w-[150px]` no mobile
- Card de review de tarefas: garantir que checkboxes e campos de edicao nao quebrem

### 4. TaskListView.tsx - Lista de Tarefas

**Problema**: Select de status (90px) + botao editar + botao excluir ficam apertados ao lado do titulo.

- Reorganizar o card da tarefa para empilhar no mobile:
  - Linha 1: titulo + descricao + badges
  - Linha 2: controles (select de status, editar, excluir) em linha separada
- Usar `flex-col sm:flex-row` no container principal
- Dialog de edicao: trocar `grid grid-cols-2` por `grid grid-cols-1 sm:grid-cols-2` nos campos Prioridade/Status

---

## Detalhes Tecnicos

### Arquivos alterados:
- `src/components/campan/MeetingRegistrar.tsx` - grid responsivo
- `src/components/campan/MeetingHistoryList.tsx` - layout de card empilhado
- `src/components/campan/TranscriptionTaskExtractor.tsx` - ajustes menores
- `src/components/campan/TaskListView.tsx` - layout de card + dialog responsivos

### Padrao utilizado:
- Classes Tailwind responsivas (`sm:` breakpoint)
- `flex-col sm:flex-row` para empilhar no mobile e alinhar no desktop
- `grid-cols-1 sm:grid-cols-2` para grids adaptativos
- Remover `truncate` de titulos no mobile ou usar `line-clamp-2`

### Nenhuma migracao ou novo componente necessario
Todas as mudancas sao de CSS/classes Tailwind nos componentes existentes.

