
# Plano: Upload de Planilha + Sistema de Convites

## Problema Identificado
Atualmente, quando um mentor cadastra um mentorado manualmente ou via planilha, não há garantia de que o email usado no cadastro será o mesmo usado pelo mentorado ao acessar a plataforma.

## Solução Proposta
Criar um sistema de "pré-cadastro" onde o mentor importa os dados e gera automaticamente uma mensagem de convite personalizada para cada mentorado.

---

## Funcionalidades

### 1. Upload de Planilha com IA
- Modal para upload de arquivos CSV/Excel
- IA analisa e mapeia automaticamente as colunas (nome, email, telefone, empresa, etc.)
- Preview dos dados antes de confirmar importação
- Validação de emails duplicados

### 2. Sistema de Pré-Cadastro
- Criar tabela `mentorado_invites` para armazenar convites pendentes
- Cada convite tem um `token` único (código de 8 caracteres)
- Status: `pending`, `accepted`, `expired`

### 3. Mensagem de Boas-Vindas Automática
Quando o mentor cadastra um mentorado (manual ou planilha), o sistema gera automaticamente:

```
Olá [NOME]! 👋

Você foi convidado(a) para a mentoria [NOME_MENTORIA].

Clique no link abaixo para criar sua conta e começar sua jornada:
[LINK_COM_TOKEN]

Esse link é exclusivo para você.
```

### 4. Fluxo de Vinculação Garantida
1. Mentor importa planilha ou cadastra manualmente
2. Sistema cria registro em `mentorado_invites` com token único
3. Mensagem de boas-vindas fica disponível no perfil para copiar
4. Mentorado acessa o link com token
5. Sistema valida token e vincula automaticamente ao mentor correto
6. Não importa qual email o mentorado use - a vinculação é pelo token

---

## Arquitetura Técnica

### Nova Tabela: `mentorado_invites`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| mentor_id | uuid | FK para mentors |
| invite_token | text | Token único (8 chars) |
| email | text | Email informado pelo mentor |
| full_name | text | Nome do mentorado |
| phone | text | Telefone (opcional) |
| business_name | text | Empresa (opcional) |
| status | text | pending/accepted/expired |
| welcome_message | text | Mensagem gerada |
| mentorado_id | uuid | FK preenchido após aceite |
| created_at | timestamp | Data de criação |
| expires_at | timestamp | Validade do convite (30 dias) |

### Novos Componentes
1. `MentoradoUploadModal.tsx` - Modal de upload de planilha
2. `WelcomeMessageCard.tsx` - Card com mensagem para copiar
3. Atualização do `Mentorados.tsx` - Integrar upload e exibir convites pendentes

### Edge Function: `parse-mentorado-spreadsheet`
- Recebe arquivo base64
- Usa IA para identificar colunas
- Retorna dados estruturados

### Modificação no Onboarding
- Aceitar parâmetro `?token=XXXXXXXX` além de `?mentor=ID`
- Validar token e vincular automaticamente

---

## Interface do Usuário

### Botão "Importar Planilha"
Ao lado do botão "Adicionar Mentorado" existente

### Modal de Upload
1. **Passo 1**: Upload do arquivo (CSV, Excel)
2. **Passo 2**: IA mostra preview com mapeamento de colunas
3. **Passo 3**: Confirmação e criação dos convites

### Lista de Mentorados
- Nova aba "Convites Pendentes" mostrando quem ainda não aceitou
- Cada card mostra: Nome, Email, Data do convite, Botão "Copiar Mensagem"

### Perfil do Mentorado (pré-cadastro)
- Card destacado com a mensagem de boas-vindas
- Botão "Copiar para WhatsApp" / "Copiar para Email"
- Indicador se o convite foi visualizado/aceito

---

## Benefícios

1. **Controle Total**: O mentor sabe exatamente quem está vinculado a ele
2. **Facilidade**: Mensagem pronta para enviar via WhatsApp/Email
3. **Segurança**: Token único garante que só quem recebeu o convite pode acessar
4. **Escalabilidade**: Upload em massa via planilha
5. **Rastreabilidade**: Histórico de quem aceitou, quem está pendente
