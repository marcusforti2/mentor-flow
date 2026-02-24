

# Plano: Central de Popups por Tenant + IA Geradora

## Problema atual
O `WhatsAppGroupModal` esta hardcoded e aparece para **todos os tenants** -- e conteudo especifico do Learning Brand. Precisa ser removido e substituido por um sistema generico onde cada mentor cria seus proprios popups.

---

## O que sera criado

### 1. Nova tabela `tenant_popups`

```sql
CREATE TABLE public.tenant_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES memberships(id),
  title text NOT NULL,
  body_html text NOT NULL,           -- conteudo rico do popup
  image_url text,                     -- imagem horizontal (banner)
  cta_label text,                     -- texto do botao (ex: "Entrar no Grupo")
  cta_url text,                      -- link do botao
  display_mode text NOT NULL DEFAULT 'first_access',  -- first_access | date_range | always
  starts_at timestamptz,             -- inicio da exibicao (se date_range)
  ends_at timestamptz,               -- fim da exibicao (se date_range)
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

RLS: mentores do tenant podem CRUD; mentorados podem SELECT popups ativos do seu tenant.

### 2. Nova tabela `popup_dismissals`

```sql
CREATE TABLE public.popup_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id uuid NOT NULL REFERENCES tenant_popups(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id),
  dismissed_at timestamptz DEFAULT now(),
  UNIQUE(popup_id, membership_id)
);
```

Controla quais popups cada mentorado ja viu/fechou. Para `first_access` mode, uma vez dismissed nunca mais aparece.

### 3. Componente `TenantPopupRenderer` (substitui WhatsAppGroupModal)

- Colocado nos layouts `MentoradoLayout` e `MemberLayout` no lugar do `WhatsAppGroupModal`
- Ao montar, busca popups ativos do tenant do usuario (filtra por `is_active`, `display_mode`, datas)
- Cruza com `popup_dismissals` para nao mostrar os ja vistos
- Exibe o primeiro popup pendente como Dialog bonito:
  - Imagem banner no topo (se houver)
  - Titulo + corpo HTML renderizado
  - Botao CTA colorido (se houver link)
  - Botao "Entendi" / fechar que cria o dismissal
- Visual similar ao WhatsApp modal atual mas generico e com suporte a imagem

### 4. Pagina de gestao de Popups (mentor)

Nova rota `/mentor/popups` dentro do menu **Comunicacao**:

```text
Comunicação
  ├── Emails
  ├── Popups        ← NOVO
  ├── Centro SOS
  └── Automações
```

#### Listagem
- Cards dos popups existentes com status (ativo/inativo/expirado)
- Preview miniatura do popup
- Metricas: quantos viram, quantos fecharam
- Toggle ativo/inativo
- Botao deletar

#### Dialog de criacao/edicao
- **Titulo** (texto)
- **Corpo** (textarea rico ou markdown com preview)
- **Imagem** (upload ou gerar com IA):
  - Tamanho recomendado: 800x400px (2:1 horizontal)
  - Upload via storage bucket `popup-images`
  - Ou botao "Gerar com IA" que chama Lovable AI para criar imagem
- **CTA**: label + URL (opcional)
- **Modo de exibicao**:
  - `first_access` -- mostra 1x por mentorado
  - `date_range` -- mostra entre data inicio e fim
  - `always` -- mostra toda vez ate fechar (mas nao repete se ja dismissed)
- **Datas** (se date_range): seletor de periodo

#### Gerador com IA
Botao "Criar com IA" no topo do dialog:
- Mentor digita a ideia em texto livre (ex: "quero um popup convidando pro grupo do WhatsApp com link tal")
- Edge function chama Lovable AI (gemini-3-flash-preview) com prompt que retorna JSON estruturado:
  - `title`, `body_html`, `cta_label`, `cta_url`
- Preenche o formulario automaticamente para o mentor revisar/editar
- Botao separado "Gerar Imagem" que usa gemini-2.5-flash-image para criar banner horizontal baseado no titulo/tema

### 5. Edge Function `generate-popup`

Nova edge function que:
1. Recebe `{ prompt: string, generate_image?: boolean }`
2. Chama Lovable AI para gerar conteudo estruturado do popup (tool calling)
3. Se `generate_image`, chama modelo de imagem e faz upload ao bucket
4. Retorna JSON com campos preenchidos

### 6. Remocoes

- Remover `WhatsAppGroupModal` de `MentoradoLayout` e `MemberLayout`
- Remover arquivo `src/components/WhatsAppGroupModal.tsx`

---

## Arquivos criados/editados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar `tenant_popups` + `popup_dismissals` + RLS + bucket |
| `src/components/popups/TenantPopupRenderer.tsx` | Novo -- renderiza popups ativos para mentorados |
| `src/components/popups/PopupManager.tsx` | Novo -- pagina de gestao para mentor |
| `src/components/popups/PopupFormDialog.tsx` | Novo -- dialog de criacao/edicao com IA |
| `src/components/popups/PopupPreviewCard.tsx` | Novo -- card de preview na listagem |
| `src/hooks/usePopups.tsx` | Novo -- queries e mutations para popups |
| `supabase/functions/generate-popup/index.ts` | Novo -- IA gera conteudo + imagem |
| `src/pages/admin/Popups.tsx` | Nova pagina do mentor |
| `src/App.tsx` | Adicionar rota `/mentor/popups` |
| `src/components/layouts/MentorLayout.tsx` | Adicionar "Popups" no menu Comunicacao |
| `src/components/layouts/MentoradoLayout.tsx` | Trocar WhatsAppGroupModal por TenantPopupRenderer |
| `src/components/layouts/MemberLayout.tsx` | Trocar WhatsAppGroupModal por TenantPopupRenderer |
| `src/components/WhatsAppGroupModal.tsx` | Deletar |

---

## Ordem de implementacao

1. Migration: tabelas + RLS + bucket
2. Hook `usePopups`
3. `TenantPopupRenderer` + substituir nos layouts
4. Edge function `generate-popup`
5. Pagina de gestao + formulario com IA
6. Adicionar rota e menu
7. Remover WhatsAppGroupModal

