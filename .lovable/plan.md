

# Plano: Popular tenant MAQUINA DE VENDAS com dados completos para teste

O tenant ja possui:
- **Mentor**: Viviane CS (membership `9b50abd1`)
- **1 mentorado existente**: Mathias Madruga (membership `ca7505d6`)

Vou criar uma Edge Function dedicada (ou reutilizar logica inline) para popular via SQL direto com service role. Mas como o usuario esta logado como mentor (nao master_admin), a abordagem mais segura e usar SQL direto via inserts administrativos.

---

## O que sera criado

### 1. Tres novos mentorados (via invites aceitos)
Usar service role para criar usuarios no auth, profiles, memberships, mentee_profiles e assignments:

| Nome | Email | Negocio |
|------|-------|---------|
| Lucas Ferreira | lucas.ferreira.demo@lbvpreview.com | LF Marketing Digital |
| Mariana Costa | mariana.costa.demo@lbvpreview.com | MC Consultoria de Vendas |
| Rafael Oliveira | rafael.oliveira.demo@lbvpreview.com | RO Automacao Comercial |

Cada um com:
- `profiles` (full_name, email, phone, instagram, linkedin)
- `memberships` (role=mentee, status=active)
- `mentee_profiles` (business_name, business_profile JSONB, joined_at)
- `mentor_mentee_assignments` (vinculado a Viviane)

### 2. Dados de metricas para cada mentorado (incluindo Mathias)
Para os 4 mentorados:
- **mentee_activities**: 20-30 registros por mentorado nos ultimos 30 dias (msg_enviada, ligacao, followup, reuniao, proposta)
- **mentee_deals**: 5-8 deals por mentorado em stages variados com valores
- **mentee_payments**: 3-5 pagamentos por mentorado (recebido, pendente, atrasado)
- **program_investments**: 1 por mentorado com valor do programa + custos operacionais

### 3. Arquivos no Drive (mentorado-files bucket)
Upload de arquivos de exemplo vinculados a cada mentorado via tabela de files (se existir) ou activity_logs com tipo file_uploaded.

### 4. Cinco playbooks sobre vendas
Criados pela membership da Viviane no tenant:

| Titulo | Tema |
|--------|------|
| Guia de Prospecao Ativa | Tecnicas de prospecao outbound |
| Roteiro de Ligacao de Vendas | Scripts e frameworks para calls |
| Playbook de Objecoes | Como contornar as 20 objecoes mais comuns |
| Manual de Follow-up Eficiente | Cadencia e timing de follow-up |
| Checklist de Fechamento | Processo passo-a-passo para fechar deals |

Cada um com conteudo TipTap JSON estruturado (headings, paragraphs, bullet lists).

### 5. Cinco trilhas com 2 modulos e 3 aulas cada
Com capas usando URLs de Unsplash:

| Trilha | Modulos |
|--------|---------|
| Fundamentos de Vendas | M1: Mindset de Vendedor / M2: Comunicacao Persuasiva |
| Prospecao e Qualificacao | M1: Encontrando Leads / M2: Qualificando Oportunidades |
| Reunioes que Convertem | M1: Preparacao / M2: Conducao e Fechamento |
| Follow-up e Cadencia | M1: Frequencia e Timing / M2: Templates e Automacao |
| Gestao de Pipeline | M1: Organizacao do Funil / M2: Metricas de Vendas |

Cada modulo com 3 aulas (1 video YouTube, 1 texto Markdown, 1 video).

---

## Implementacao tecnica

Criar uma nova Edge Function `seed-tenant-data` que:
1. Recebe `tenant_id` como parametro
2. Usa service role para criar usuarios via `admin.auth.admin.createUser`
3. Insere todos os dados via service role (bypassa RLS)
4. Retorna resumo do que foi criado

### Arquivos criados/editados

- `supabase/functions/seed-tenant-data/index.ts` -- Nova Edge Function com toda a logica de seed
- Nenhuma mudanca no frontend, apenas chamada via curl/deploy

### Ordem de execucao

1. Criar a Edge Function
2. Deploy automatico
3. Chamar via curl com o token da Viviane (precisa ser master ou ajustar para mentor)
4. Verificar dados no frontend

**Nota**: Como Viviane e mentor (nao master_admin), a Edge Function precisara aceitar mentor do tenant como autorizacao, ou executamos os inserts diretamente via SQL administrativo. A abordagem mais pratica e usar inserts SQL diretos com a ferramenta de dados.

