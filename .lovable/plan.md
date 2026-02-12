

# Melhorias no Sistema de Reunioes e Campan

Apos revisar todo o codigo implementado, identifiquei melhorias praticas que agregam valor real ao fluxo de mentores e mentorados.

---

## 1. Salvar API Key do tl;dv no perfil do mentor

**Problema atual**: O mentor precisa colar a API Key toda vez que abre o modal de importacao do tl;dv. Isso e repetitivo e frustrante.

**Solucao**: Salvar a API Key (criptografada) na tabela `mentee_profiles` ou em uma nova coluna em `memberships`/`profiles`, para que o modal ja venha preenchido. O mentor ainda pode alterar se quiser.

- Adicionar coluna `tldv_api_key` (TEXT, criptografada no frontend com base64 simples ou armazenada como secret no backend)
- No `TldvImportModal`, buscar a key salva ao abrir e pre-preencher
- Botao "Lembrar esta chave" para salvar

---

## 2. Vincular tarefas geradas a reuniao de origem

**Problema atual**: Na lista de reunioes (`MeetingHistoryList`), nao ha indicacao de quantas tarefas foram geradas a partir de cada reuniao. O mentor nao sabe se ja processou aquela reuniao.

**Solucao**: Exibir um badge com o numero de tarefas criadas por reuniao e um link para filtra-las no Kanban.

- Query de contagem de `campan_tasks` por `source_transcript_id`
- Badge "3 tarefas" ao lado de cada reuniao
- Badge "Nao processada" para reunioes sem tarefas

---

## 3. Filtros e busca no historico de reunioes

**Problema atual**: `MeetingHistoryList` lista todas as reunioes sem nenhum filtro. Com o tempo, a lista fica longa.

**Solucao**: Adicionar filtro por fonte (tl;dv / Drive / Manual) e busca por titulo.

- Barra de busca simples no topo
- Chips de filtro por `video_source`

---

## 4. Indicador de status de processamento na reuniao

**Problema atual**: Nao ha feedback visual se uma reuniao ja teve tarefas extraidas ou nao.

**Solucao**: Badge de status visual (Processada / Pendente / Sem transcricao) em cada card de reuniao.

---

## 5. Paginacao no historico de reunioes

**Problema atual**: O componente carrega todas as reunioes de uma vez. Com volume alto, pode ficar lento.

**Solucao**: Implementar paginacao simples (carregar mais / infinite scroll) com limite de 10 por vez.

---

## Detalhes Tecnicos

### Migracao de banco

```text
ALTER TABLE profiles ADD COLUMN tldv_api_key TEXT;
```

### Arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| Nova migracao SQL | Coluna `tldv_api_key` em `profiles` |
| `MeetingHistoryList.tsx` | Filtros, busca, badge de tarefas, paginacao, status |
| `TldvImportModal.tsx` | Pre-carregar e salvar API Key do perfil |
| `TranscriptionTaskExtractor.tsx` | Passar callback para atualizar lista de reunioes apos extracao |

### Prioridade sugerida

1. Badge de tarefas por reuniao (mais valor imediato)
2. Salvar API Key do tl;dv
3. Filtros e busca
4. Status de processamento
5. Paginacao

