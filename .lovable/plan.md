
# Integracoes Google Meet/Drive e tl;dv + Historico de Reunioes

## Contexto

Os mentores usam Google Meet (gravacoes vao pro Drive) e tl;dv para gravar e transcrever reunioes. O objetivo e integrar esses servicos para que:

1. A IA busque automaticamente a transcricao e gere tarefas
2. O video replay fique disponivel no perfil do mentorado
3. O mentorado tenha um historico de reunioes realizadas

## Limitacoes Importantes

- **Google Drive**: Nao ha conector disponivel no workspace. Seria necessario OAuth completo (Google Cloud project, credenciais, etc). Complexidade alta.
- **tl;dv**: Tem API publica (REST com API Key). Permite buscar reunioes, transcricoes e links de gravacao. Viavel com uma API key do usuario.

## Estrategia Proposta (Pragmatica)

Implementar em 2 camadas:

### Camada 1 - Funcional Agora (sem dependencia de OAuth)

Criar um sistema de **registro de reunioes** no perfil do mentorado onde o mentor pode:

- Colar o link do video (Google Drive, tl;dv, YouTube, etc)
- Colar a transcricao ou subir PDF (ja existe)
- A IA extrai tarefas (ja funciona)
- O video fica registrado e acessivel pelo mentorado

Isso adiciona:
- Secao "Reunioes" no perfil do mentorado (visao mentor e mentorado)
- Player de video embutido (Google Drive embed, tl;dv embed, YouTube)
- Historico de todas as reunioes com data, titulo, video e tarefas geradas

### Camada 2 - Integracao tl;dv (com API Key)

Criar uma edge function que conecta na API do tl;dv para:
- Buscar reunioes recentes do mentor
- Puxar transcricao automaticamente
- Puxar link da gravacao
- Permitir "importar" direto para o perfil do mentorado com 1 clique

O mentor precisara fornecer sua API Key do tl;dv (obtida em tldv.io > Settings > API).

## Plano de Implementacao

### 1. Migracoes de Banco

Adicionar colunas a `meeting_transcripts` para suportar video:

- `video_url` (TEXT) - link do video/gravacao
- `video_source` (TEXT) - "google_drive" | "tldv" | "youtube" | "other"
- `meeting_title` (TEXT) - titulo da reuniao
- `meeting_date` (TIMESTAMPTZ) - data/hora da reuniao
- `tldv_meeting_id` (TEXT) - ID da reuniao no tl;dv (para deduplicacao)

### 2. Edge Function: fetch-tldv-meetings

Nova edge function que:
- Recebe a API Key do tl;dv (passada pelo frontend, sem salvar no banco)
- Chama `GET https://api.tldv.io/v1alpha1/meetings` para listar reunioes recentes
- Para cada reuniao selecionada, chama `GET /meetings/{id}` e `GET /meetings/{id}/transcript`
- Retorna lista de reunioes com transcricao e link de gravacao

### 3. Atualizar TranscriptionTaskExtractor

Adicionar uma terceira opcao de input alem de texto e PDF:

- Botao "Importar do tl;dv"
- Abre modal pedindo API Key do tl;dv (com link para onde obter)
- Lista reunioes recentes do tl;dv
- Mentor seleciona a reuniao
- Sistema importa transcricao + link do video automaticamente
- IA extrai tarefas normalmente

Tambem adicionar campo para "Link do video da reuniao" (manual) para quem usa Google Drive direto.

### 4. Secao "Reunioes" no Perfil do Mentorado (Visao Mentor)

No sheet de detalhe do mentorado (`Mentorados.tsx`), adicionar uma aba/secao "Reunioes" que mostra:

- Lista cronologica de reunioes (baseada em `meeting_transcripts`)
- Cada item mostra: data, titulo, badge da fonte (tl;dv / Drive / Manual), numero de tarefas geradas
- Botao para assistir o video (abre player embutido)
- Botao para ver transcricao completa

### 5. Aba "Reunioes" no Dock do Mentorado

No layout do mentorado, adicionar nova aba "Reunioes" (ao lado de "Minhas Tarefas") que mostra:

- Historico de reunioes com o mentor
- Player de video para cada reuniao
- Link para ver tarefas geradas a partir de cada reuniao

### 6. Player de Video Universal

Componente que detecta a fonte do video e renderiza o embed correto:

- Google Drive: `https://drive.google.com/file/d/{ID}/preview`
- tl;dv: link direto do tl;dv (abre em nova aba ou embed)
- YouTube: embed padrao

## Detalhes Tecnicos

### Edge Function fetch-tldv-meetings

```text
POST /fetch-tldv-meetings
Body: { tldv_api_key: string, limit?: number }

Chama: GET https://api.tldv.io/v1alpha1/meetings
Headers: x-api-key: {tldv_api_key}

Retorna: {
  meetings: [{
    id: string,
    title: string,
    date: string,
    duration: number,
    video_url: string,
    transcript: string,
    participants: string[]
  }]
}
```

### Alteracao em meeting_transcripts

```text
ALTER TABLE meeting_transcripts
  ADD COLUMN video_url TEXT,
  ADD COLUMN video_source TEXT DEFAULT 'manual',
  ADD COLUMN meeting_title TEXT,
  ADD COLUMN meeting_date TIMESTAMPTZ,
  ADD COLUMN tldv_meeting_id TEXT;
```

### Novos Componentes

| Componente | Descricao |
|------------|-----------|
| `MeetingHistoryList` | Lista de reunioes com filtros e acoes |
| `MeetingVideoPlayer` | Player universal (Drive/YouTube/tl;dv) |
| `TldvImportModal` | Modal para importar reunioes do tl;dv |
| `MinhasReunioes.tsx` | Pagina do mentorado para ver historico |

### Arquivos Alterados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| Nova migracao SQL | Criar | Adicionar colunas de video/reuniao |
| `supabase/functions/fetch-tldv-meetings/index.ts` | Criar | Edge function para API tl;dv |
| `src/components/campan/MeetingHistoryList.tsx` | Criar | Lista de reunioes |
| `src/components/campan/MeetingVideoPlayer.tsx` | Criar | Player de video universal |
| `src/components/campan/TldvImportModal.tsx` | Criar | Modal importacao tl;dv |
| `src/pages/member/MinhasReunioes.tsx` | Criar | Pagina de reunioes do mentorado |
| `src/components/campan/TranscriptionTaskExtractor.tsx` | Editar | Adicionar importacao tl;dv + campo video URL |
| `src/pages/admin/Mentorados.tsx` | Editar | Adicionar secao reunioes no perfil |
| `src/components/layouts/MentoradoLayout.tsx` | Editar | Adicionar aba Reunioes no dock |
| `src/App.tsx` | Editar | Rota para MinhasReunioes |
| `supabase/config.toml` | Editar | Registrar nova edge function |
