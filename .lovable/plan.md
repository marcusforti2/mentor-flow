
# Plano: Comunidade - Bate-papo Estilo Rede Social

## Visão Geral

Criar uma área de **Comunidade** no portal do mentorado onde os mentorados do mesmo mentor possam interagir entre si, trocar experiências e criar networking - tudo dentro da plataforma.

## Funcionalidades Propostas

### 1. Feed de Publicações (Estilo LinkedIn/Instagram)
- Posts com texto + imagens opcionais
- Curtidas e comentários
- Exibição do autor com foto e nome
- Ordenação por mais recentes ou mais engajados
- Tags/categorias opcionais (ex: #vendas, #dicas, #vitoria)

### 2. Chat em Tempo Real
- Canal geral da comunidade (todos os mentorados)
- Mensagens instantâneas com atualização em tempo real
- Indicador de quem está online
- Histórico de mensagens persistente

### 3. Integração com Gamificação
- Ganhar pontos ao publicar conteúdo
- Ganhar pontos ao receber curtidas
- Badge especial para membros mais ativos

## Arquitetura de Dados

### Novas Tabelas

```text
┌─────────────────────────────────────────────────────────────────┐
│  community_posts (Feed de Publicações)                          │
├─────────────────────────────────────────────────────────────────┤
│  id              UUID PRIMARY KEY                               │
│  mentorado_id    UUID → mentorados                              │
│  mentor_id       UUID → mentors (para isolamento multi-tenant)  │
│  content         TEXT (conteúdo do post)                        │
│  image_url       TEXT (imagem opcional)                         │
│  tags            TEXT[] (array de tags)                         │
│  likes_count     INT DEFAULT 0                                  │
│  comments_count  INT DEFAULT 0                                  │
│  created_at      TIMESTAMPTZ                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  community_likes (Curtidas)                                     │
├─────────────────────────────────────────────────────────────────┤
│  id              UUID PRIMARY KEY                               │
│  post_id         UUID → community_posts                         │
│  mentorado_id    UUID → mentorados                              │
│  created_at      TIMESTAMPTZ                                    │
│  UNIQUE(post_id, mentorado_id)                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  community_comments (Comentários)                               │
├─────────────────────────────────────────────────────────────────┤
│  id              UUID PRIMARY KEY                               │
│  post_id         UUID → community_posts                         │
│  mentorado_id    UUID → mentorados                              │
│  content         TEXT                                           │
│  created_at      TIMESTAMPTZ                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  community_messages (Chat em Tempo Real)                        │
├─────────────────────────────────────────────────────────────────┤
│  id              UUID PRIMARY KEY                               │
│  mentor_id       UUID → mentors (canal do mentor)               │
│  mentorado_id    UUID → mentorados (autor)                      │
│  content         TEXT                                           │
│  created_at      TIMESTAMPTZ                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Políticas RLS (Row Level Security)

- Mentorados só veem posts/mensagens do **mesmo mentor**
- Cada mentorado pode criar/editar/deletar **seus próprios** posts
- Curtidas e comentários permitidos para qualquer post do grupo
- Mentor pode ver tudo e moderar se necessário

## Interface Visual

### Página `/app/comunidade`

```text
┌─────────────────────────────────────────────────────────────────┐
│  [← Voltar]              Comunidade                    [Avatar] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐                               │
│  │ 📰 Feed     │ │ 💬 Chat     │   (Tabs de navegação)         │
│  └─────────────┘ └─────────────┘                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ [Avatar] Criar nova publicação...              [📷] [Postar]│
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ [Avatar] João Silva                        há 2 horas       │
│  │                                                              │
│  │ Fechei minha primeira venda de R$50k hoje! 🎉               │
│  │ A técnica de ancoragem que o mentor passou funcionou        │
│  │ perfeitamente...                                            │
│  │                                                              │
│  │ ❤️ 12    💬 3                               #vitoria #venda │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ [Avatar] Maria Santos                      há 5 horas       │
│  │                                                              │
│  │ Alguém tem dicas para lidar com objeção de preço?           │
│  │ Estou travando nessa etapa...                               │
│  │                                                              │
│  │ ❤️ 5     💬 8                                    #dicas     │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Aba de Chat

```text
┌─────────────────────────────────────────────────────────────────┐
│  💬 Chat da Comunidade                    🟢 12 online         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Avatar] João: Bom dia galera!                    09:15       │
│                                                                 │
│  [Avatar] Maria: Oi João! Tudo bem?                09:16       │
│                                                                 │
│  [Avatar] Pedro: Alguém vai na call de hoje?       09:20       │
│                                                                 │
│           [Você] Vou sim! Até mais tarde           09:22       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Digite sua mensagem...]                          [Enviar →]  │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes a Criar

### Frontend (`src/`)
1. `pages/member/Comunidade.tsx` - Página principal
2. `components/community/PostCard.tsx` - Card de publicação
3. `components/community/PostComposer.tsx` - Criar novo post
4. `components/community/CommentSection.tsx` - Seção de comentários
5. `components/community/ChatPanel.tsx` - Chat em tempo real
6. `components/community/OnlineIndicator.tsx` - Quem está online

### Hooks
- `hooks/useCommunityPosts.tsx` - CRUD de posts
- `hooks/useCommunityChat.tsx` - Chat com Realtime

## Tecnologias Utilizadas

- **Supabase Realtime** - Atualizações instantâneas no chat
- **Supabase Storage** - Upload de imagens nos posts
- **Presence API** - Indicador de usuários online
- **React Query** - Cache e sincronização de dados

## Sequência de Implementação

1. **Fase 1 - Banco de Dados**
   - Criar as 4 tabelas
   - Configurar RLS policies
   - Habilitar Realtime na tabela de mensagens

2. **Fase 2 - Feed de Posts**
   - Página principal com listagem
   - Criar nova publicação
   - Sistema de curtidas
   - Comentários

3. **Fase 3 - Chat em Tempo Real**
   - Canal de mensagens
   - Conexão com Supabase Realtime
   - Indicador de online (Presence)

4. **Fase 4 - Gamificação**
   - Pontos por publicação
   - Pontos por curtidas recebidas
   - Badge de membro ativo

5. **Fase 5 - Polimento**
   - Upload de imagens
   - Notificações
   - Moderação pelo mentor

## Integração com Menu

Adicionar no `MemberLayout.tsx`:
```
{ icon: Users, label: 'Comunidade', path: '/app/comunidade' }
```

---

## Detalhes Técnicos

### Estrutura SQL Completa

```sql
-- Posts da comunidade
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Curtidas
CREATE TABLE community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, mentorado_id)
);

-- Comentários
CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mensagens de chat
CREATE TABLE community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar realtime para chat
ALTER PUBLICATION supabase_realtime ADD TABLE community_messages;

-- RLS Policies
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;
```

### Estimativa de Esforço

| Fase | Descrição | Complexidade |
|------|-----------|--------------|
| 1 | Banco de Dados | Baixa |
| 2 | Feed de Posts | Média |
| 3 | Chat Realtime | Alta |
| 4 | Gamificação | Baixa |
| 5 | Polimento | Média |

**Total estimado:** Implementação em 2-3 etapas de desenvolvimento.

