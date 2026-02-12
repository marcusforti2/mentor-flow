
# Melhorar UX: Separar Reunioes e Tarefas + Link Publico tl;dv

## Problema Atual

Hoje tudo esta amontoado em um unico componente (`TranscriptionTaskExtractor`): metadados da reuniao, link do video, transcricao, importacao tl;dv e extracao de tarefas. Isso confunde o mentor e mistura dois fluxos distintos:

1. **Registrar uma reuniao** (video + transcricao)
2. **Gerar tarefas** a partir de uma reuniao registrada

Alem disso, o fluxo tl;dv exige API Key (plano pago). O mentor pode simplesmente colar o link publico da reuniao no tl;dv.

---

## Solucao: Dois Componentes Separados

### Componente 1: Registrar Reuniao (`MeetingRegistrar`)

Card dedicado para adicionar uma reuniao ao historico do mentorado:

- Titulo da reuniao
- Data/hora
- Link do video (YouTube, Google Drive, **link publico do tl;dv**, qualquer URL)
- Transcricao (texto livre, PDF/Word upload, ou importar do tl;dv via API)
- Botao "Salvar Reuniao"

Ao salvar, a reuniao aparece imediatamente no `MeetingHistoryList`.

### Componente 2: Processar Reuniao (dentro do `MeetingHistoryList`)

Cada reuniao no historico ganha um botao "Gerar Tarefas com IA" que:

- Pega a transcricao ja salva
- Envia para a edge function `extract-tasks`
- Mostra o modal de revisao de tarefas (o mesmo fluxo de curadoria que ja existe)
- O mentor revisa, edita, e salva as tarefas no Kanban

### Link Publico do tl;dv (sem API)

- O mentor cola o link publico (ex: `https://tldv.io/app/meetings/abc123`)
- O sistema detecta automaticamente que e um link tl;dv e armazena como `video_source: 'tldv'`
- O player exibe um botao "Assistir gravacao" que abre no tl;dv
- Sem necessidade de API Key para simplesmente registrar a reuniao
- A opcao de importar via API continua disponivel como recurso extra

---

## Fluxo Visual do Mentor

```text
Perfil do Mentorado
  |
  +-- [Registrar Reuniao]  <-- Card simples e limpo
  |     - Titulo, data, link video, transcricao
  |     - Botao "Salvar Reuniao"
  |
  +-- [Historico de Reunioes]  <-- Lista existente melhorada
  |     - Cada card mostra: titulo, data, fonte, status, badge tarefas
  |     - Botao "Gerar Tarefas" em reunioes com transcricao pendente
  |     - Botao "Ver transcricao"
  |     - Player de video inline
  |
  +-- [Tarefas (Campan)]  <-- Kanban separado, sem misturar com reunioes
        - Apenas o Kanban de tarefas
        - Botao "Adicionar tarefa manual"
```

---

## Detalhes Tecnicos

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/campan/MeetingRegistrar.tsx` | Novo componente para registrar reunioes (formulario limpo) |
| `src/components/campan/TaskExtractionModal.tsx` | Modal reutilizavel para revisar/salvar tarefas extraidas da IA |

### Arquivos Alterados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/campan/MeetingHistoryList.tsx` | Adicionar botao "Gerar Tarefas" em cada reuniao pendente, integrar com `TaskExtractionModal` |
| `src/pages/admin/Mentorados.tsx` | Substituir `TranscriptionTaskExtractor` pelo novo `MeetingRegistrar` + reorganizar layout |
| `src/components/campan/MeetingVideoPlayer.tsx` | Ja suporta links tl;dv (abre em nova aba), nenhuma mudanca necessaria |

### Logica do `MeetingRegistrar`

- Formulario simples: titulo, data, video URL, transcricao (texto ou upload)
- Ao salvar: insere em `meeting_transcripts` e chama callback `onMeetingSaved` para atualizar a lista
- Detecta automaticamente `video_source` pelo URL (tldv, youtube, drive, etc)
- Opcao "Importar do tl;dv" continua disponivel como botao secundario

### Logica do botao "Gerar Tarefas" no `MeetingHistoryList`

- Aparece apenas em reunioes com transcricao (`raw_text` preenchido) e sem tarefas geradas
- Ao clicar: abre `TaskExtractionModal` que chama `extract-tasks` com o `raw_text` da reuniao
- Mentor revisa, edita e salva (mesma UX de curadoria atual)
- Badge atualiza para "Processada" apos salvar

### O que acontece com o `TranscriptionTaskExtractor`

- Sera substituido pelo `MeetingRegistrar` na pagina do mentor
- A logica de extracao de tarefas migra para o `TaskExtractionModal`
- A logica de criacao manual de tarefa ja existe no `CampanKanban`
- O arquivo antigo pode ser removido apos a migracao
