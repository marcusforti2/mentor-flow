

## CRM: Cadastro Manual + Visibilidade para Mentor + Pipeline Customizavel

### 1. Cadastro Manual de Leads (Mentorado)

Atualmente o mentorado so pode criar leads via upload de screenshots com IA. Vamos adicionar um botao "Cadastro Manual" ao lado do botao "Novo Lead com IA" na pagina `MeuCRM.tsx`.

Sera criado um novo componente `ManualLeadModal.tsx` com formulario simples:
- Nome do contato (obrigatorio)
- Telefone
- Email
- Empresa
- Temperatura (frio/morno/quente)
- Notas

O lead sera inserido direto na tabela `crm_prospections` com o `membership_id` e `tenant_id` do mentorado, sem passar por analise de IA.

**Arquivos:**
- Criar `src/components/crm/ManualLeadModal.tsx`
- Editar `src/pages/member/MeuCRM.tsx` (adicionar botao + modal)

---

### 2. Visibilidade Total para o Mentor

A pagina `/mentor/crm-mentorados` (`CRMMentorados.tsx`) ja existe e mostra todos os leads de todos os mentorados do tenant. Porem, os status do pipeline estao inconsistentes entre a visao do mentorado e a do mentor.

**Correcao de status inconsistentes:**
- O mentorado usa: `new`, `contacted`, `meeting_scheduled`, `proposal_sent`, `closed_won`, `closed_lost`
- O detalhe do lead usa: `new`, `contacted`, `proposal`, `closed`, `lost`
- O CRM do mentor usa: `new`, `contacted`, `proposal`, `closed`, `lost`

Vamos padronizar TODOS para os 6 status do Kanban do mentorado, que sao mais completos e descritivos:
- `new`, `contacted`, `meeting_scheduled`, `proposal_sent`, `closed_won`, `closed_lost`

**Arquivos:**
- Editar `src/components/crm/LeadDetailSheet.tsx` (atualizar `statusOptions`)
- Editar `src/pages/admin/CRMMentorados.tsx` (atualizar `statusConfig`)

---

### 3. Pipeline Customizavel pelo Mentor

O mentor podera configurar as colunas do pipeline que os mentorados verao. Isso sera feito por tenant.

**Banco de dados - nova tabela `crm_pipeline_stages`:**
```
id (uuid, PK)
tenant_id (uuid, FK -> tenants)
name (text) - ex: "Abordagem Inicial"
status_key (text) - ex: "contacted"
color (text) - ex: "bg-blue-500"
position (integer) - ordem de exibicao
created_at (timestamptz)
```

Com RLS: mentores/admins do tenant podem CRUD, mentorados do tenant podem SELECT.

**Logica de fallback:** Se o tenant nao tiver stages customizados, o sistema usa os 6 stages padrao (hardcoded). Assim nenhuma funcionalidade quebra para tenants existentes.

**Configuracao pelo mentor:**
- Nova aba "Pipeline" dentro da pagina de CRM do mentor (`CRMMentorados.tsx`)
- Interface drag-and-drop simples para reordenar colunas
- Adicionar/remover/renomear colunas
- Cada coluna tem: nome, cor (seletor de cores predefinidas), e posicao

**Mentorado usa os stages dinamicos:**
- `MeuCRM.tsx` carrega os stages do tenant (ou usa fallback)
- O Kanban renderiza as colunas dinamicamente

**Arquivos:**
- Migracao SQL: criar tabela `crm_pipeline_stages` com RLS
- Criar `src/components/crm/PipelineStageEditor.tsx` (editor para mentor)
- Editar `src/pages/admin/CRMMentorados.tsx` (nova aba "Pipeline")
- Editar `src/pages/member/MeuCRM.tsx` (carregar stages dinamicos)
- Editar `src/components/crm/LeadDetailSheet.tsx` (usar stages dinamicos)

---

### Resumo das alteracoes

| Arquivo | Alteracao |
|---|---|
| `src/components/crm/ManualLeadModal.tsx` | NOVO - Formulario manual de lead |
| `src/components/crm/PipelineStageEditor.tsx` | NOVO - Editor de colunas do pipeline |
| `src/pages/member/MeuCRM.tsx` | Botao manual + stages dinamicos |
| `src/pages/admin/CRMMentorados.tsx` | Aba Pipeline + status corrigidos |
| `src/components/crm/LeadDetailSheet.tsx` | Status padronizados + dinamicos |
| Migracao SQL | Tabela `crm_pipeline_stages` + RLS |

