

# Cadastro Completo de Mentorados + Import Inteligente de Planilha

## Resumo

Expandir o formulario de criacao manual de mentorados com campos adicionais (data de inicio, redes sociais, empresa, cargo) e tornar a importacao via planilha inteligente - a IA identifica automaticamente todas as colunas disponiveis e mapeia para os campos do sistema, incluindo `data_entrada` como `joined_at`.

---

## O que muda

### 1. Formulario Manual (CreateMenteeModal)

Campos atuais: Nome, Email, Telefone
Campos novos a adicionar:

| Campo | Tipo | Obrigatorio |
|-------|------|-------------|
| Data de Inicio | Date picker | Nao (default = hoje) |
| Empresa / Negocio | Texto | Nao |
| Instagram | Texto | Nao |
| LinkedIn | Texto | Nao |
| Site / Portfolio | Texto | Nao |
| Observacoes | Textarea | Nao |

O formulario sera organizado em secoes colapsaveis para nao ficar poluido:
- Secao principal: Nome, Email, Telefone, Mentor, Data de Inicio
- Secao "Redes Sociais" (colapsavel): Instagram, LinkedIn, Site
- Secao "Negocio" (colapsavel): Empresa, Observacoes

### 2. Importacao via Planilha (MentoradoUploadModal + Edge Function)

A Edge Function `parse-mentorado-spreadsheet` sera expandida para reconhecer colunas adicionais:

| Coluna na planilha | Mapeamento | Patterns de deteccao |
|---------------------|------------|----------------------|
| data_entrada, data inicio, joined_at, data | `joined_at` | data, entrada, inicio, joined, date |
| instagram, insta, @instagram | `instagram` | instagram, insta |
| linkedin | `linkedin` | linkedin |
| site, website, portfolio | `website` | site, website, portfolio, url |
| empresa, company, negocio | `business_name` | (ja existe) |
| observacao, notas, obs | `notes` | observacao, notas, obs, notes |

Na tela de preview, os novos campos aparecerao no card de cada mentorado.

### 3. Armazenamento dos dados extras

Os campos de redes sociais e observacoes serao salvos no `mentee_profiles.business_profile` (JSONB) que ja existe e aceita dados arbitrarios. A `data de inicio` vai como `joined_at` para a Edge Function `create-membership`.

Nao e necessario criar novas colunas no banco.

---

## Detalhes Tecnicos

### Arquivos a modificar

1. **`src/components/admin/CreateMenteeModal.tsx`**
   - Adicionar campos: `joinedAt` (date picker), `businessName`, `instagram`, `linkedin`, `website`, `notes`
   - Organizar em secoes com Collapsible
   - Enviar `joined_at` e dados extras para a Edge Function

2. **`src/hooks/useCreateMembership.tsx`**
   - Expandir `CreateMembershipParams` com campos opcionais: `business_name`, `instagram`, `linkedin`, `website`, `notes`

3. **`supabase/functions/create-membership/index.ts`**
   - Receber campos extras no body
   - Salvar `business_name`, `instagram`, `linkedin`, `website`, `notes` no `mentee_profiles.business_profile` JSONB

4. **`supabase/functions/parse-mentorado-spreadsheet/index.ts`**
   - Expandir `ParsedRow` com: `joined_at`, `instagram`, `linkedin`, `website`, `notes`
   - Adicionar patterns de deteccao para as novas colunas
   - Retornar dados extras no mapeamento

5. **`src/components/admin/MentoradoUploadModal.tsx`**
   - Expandir `ParsedRow` interface
   - Exibir campos extras no preview (data entrada, redes sociais)
   - Enviar `joined_at` e dados extras ao chamar `create-membership`
   - Mostrar badges de mapeamento para novos campos

### Fluxo da importacao inteligente

```
Planilha CSV
    |
    v
parse-mentorado-spreadsheet (Edge Function)
    |-- Detecta colunas automaticamente
    |-- Mapeia: nome, email, telefone, empresa, data_entrada, instagram, linkedin, site, obs
    |-- Retorna dados + mapping
    |
    v
MentoradoUploadModal (Preview)
    |-- Mostra badges verdes para colunas detectadas
    |-- Cards com todos os dados por mentorado
    |-- Usuario seleciona quais criar
    |
    v
create-membership (Edge Function) - chamado para cada mentorado
    |-- Cria usuario + membership + mentee_profile
    |-- Salva joined_at (data da planilha, nao data atual)
    |-- Salva redes sociais no business_profile JSONB
```

