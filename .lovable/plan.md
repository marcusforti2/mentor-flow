
# Sistema de Formulário de Onboarding Personalizado

## Visão Geral
Criar um sistema onde o mentor pode configurar perguntas personalizadas de onboarding e gerar um link único. Quando o mentorado acessa o link, ele cria sua conta e responde o formulário automaticamente, já vinculado ao mentor.

## Fluxo do Sistema

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ÁREA DO MENTOR (Admin)                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Nova página: /admin/formularios                             │
│     - Criar/editar perguntas do formulário                      │
│     - Tipos: texto, múltipla escolha, escala, sim/não           │
│     - Reordenar perguntas (drag & drop)                         │
│     - Preview do formulário                                     │
│     - Gerar link único com mentor_id                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LINK PARA MENTORADO                          │
├─────────────────────────────────────────────────────────────────┤
│  /onboarding?mentor=UUID                                        │
│  - Página pública estilo typeform                               │
│  - Pergunta por pergunta (full-screen)                          │
│  - Animações suaves de transição                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DO MENTORADO                           │
├─────────────────────────────────────────────────────────────────┤
│  Etapa 1: Dados básicos (nome, email, WhatsApp)                 │
│  Etapa 2: Dados do negócio (nome, tipo, etc.)                   │
│  Etapa 3: Perguntas personalizadas do mentor                    │
│  Etapa 4: Confirmação e criação da conta                        │
│  → Redireciona para /app (área do mentorado)                    │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura Técnica

### 1. Nova Página: Editor de Formulários (`/admin/formularios`)
**Arquivo:** `src/pages/admin/Formularios.tsx`

- Interface para gerenciar perguntas usando a tabela `behavioral_questions` existente
- Funcionalidades:
  - Adicionar nova pergunta (texto, múltipla escolha, escala 1-10, sim/não)
  - Editar pergunta existente
  - Excluir pergunta
  - Reordenar perguntas
  - Ativar/desativar perguntas
  - Preview do formulário completo
- Gerar link personalizado: `{domain}/onboarding?mentor={mentor_id}`

### 2. Nova Página: Formulário de Onboarding (`/onboarding`)
**Arquivo:** `src/pages/Onboarding.tsx`

- Página pública (sem autenticação)
- Estilo typeform:
  - Uma pergunta por tela (full-screen)
  - Navegação com Enter ou botão
  - Barra de progresso
  - Animações de transição
- Fluxo:
  1. Validar mentor_id da URL
  2. Coletar dados básicos (nome, email, WhatsApp)
  3. Coletar dados do negócio
  4. Mostrar perguntas personalizadas do mentor
  5. Enviar OTP e criar conta
  6. Salvar respostas em `behavioral_responses`
  7. Criar registro em `mentorados` vinculado ao mentor
  8. Redirecionar para `/app`

### 3. Edge Function: Processar Onboarding
**Arquivo:** `supabase/functions/process-onboarding/index.ts`

- Recebe todos os dados do formulário
- Cria usuário via `auth.admin.createUser`
- Cria profile e business_profile
- Vincula ao mentor (tabela `mentorados`)
- Salva respostas das perguntas (tabela `behavioral_responses`)
- Retorna magic link para auto-login

### 4. Atualização do Modal "Adicionar Mentorado"
**Arquivo:** `src/pages/admin/Mentorados.tsx`

- Ao clicar em "Enviar Formulário de Onboarding"
- Mostrar link dinâmico com mentor_id real
- Opção de copiar ou enviar via WhatsApp

### 5. Navegação
**Arquivo:** `src/components/layouts/AdminLayout.tsx`

- Adicionar item no menu: "Formulários" com ícone ClipboardList

## Componentes UI do Typeform

### QuestionCard
- Pergunta em destaque (grande)
- Input/opções adaptados ao tipo
- Animação fade-in
- Tecla Enter para avançar

### ProgressBar
- Barra fina no topo
- Mostra progresso das perguntas

### StepIndicator
- Indicador visual de etapas (dados → negócio → perguntas → finalizar)

## Banco de Dados
A estrutura já existe e será reutilizada:

- `behavioral_questions`: perguntas por mentor (question_text, question_type, options, order_index, is_active)
- `behavioral_responses`: respostas dos mentorados
- `mentorados`: vínculo com mentor via mentor_id
- `mentorado_business_profiles`: dados do negócio

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/admin/Formularios.tsx` | Criar - Editor de perguntas |
| `src/pages/Onboarding.tsx` | Criar - Formulário typeform |
| `src/components/onboarding/QuestionCard.tsx` | Criar - Card de pergunta |
| `src/components/onboarding/ProgressBar.tsx` | Criar - Barra de progresso |
| `supabase/functions/process-onboarding/index.ts` | Criar - Processamento |
| `src/pages/admin/Mentorados.tsx` | Modificar - Link dinâmico |
| `src/components/layouts/AdminLayout.tsx` | Modificar - Menu |
| `src/App.tsx` | Modificar - Rotas |

## Design Visual

- Fundo escuro com gradiente sutil
- Perguntas centralizadas na tela
- Fontes grandes e legíveis
- Transições suaves (300ms)
- Cores do mentor (se configuradas)
- Mobile-first
