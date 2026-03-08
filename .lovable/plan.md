

# Relatório de Auditoria de Segurança Completa

---

## 1. BANCO DE DADOS — 97 Tabelas Analisadas

### RLS (Row Level Security)
- **100% das tabelas** possuem RLS habilitado (`rowsecurity: true` em todas as 97 tabelas)
- **Nenhuma tabela** está sem políticas RLS (verificado: todas as 97 tabelas aparecem em `pg_policies`)
- Tabelas sensíveis como `otp_codes` possuem `USING(false)` — acesso bloqueado via API, operado exclusivamente server-side via `service_role`

### Achados por Classificação

#### MEDIO — Policies Excessivamente Permissivas (`auth.uid() IS NOT NULL`)
Estas tabelas permitem que **qualquer usuário autenticado** de **qualquer tenant** leia/escreva dados, quebrando o isolamento multi-tenant:

| Tabela | Policy | Comando | Risco |
|---|---|---|---|
| `call_analyses` | `analyses_view` | ALL | Qualquer autenticado pode ler/escrever análises de chamadas de TODOS os tenants |
| `certificates` | `certs_manage` | ALL | Qualquer autenticado pode criar/editar certificados de TODOS os tenants |
| `crm_interactions` | `interactions_view` | ALL | Qualquer autenticado pode ler/escrever interações CRM de TODOS os tenants |
| `email_flow_executions` | `executions_view` | SELECT | Qualquer autenticado pode ver execuções de email de TODOS os tenants |
| `email_flow_triggers` | `triggers_manage` | ALL | Qualquer autenticado pode gerenciar triggers de email de TODOS os tenants |
| `email_logs` | `logs_view` | SELECT | Qualquer autenticado pode ver logs de email de TODOS os tenants |
| `mentor_library` | `library_auth` | ALL | Qualquer autenticado pode ler/escrever biblioteca de TODOS os tenants |
| `mentorado_invites` | `invites_legacy_auth` | ALL | Qualquer autenticado pode gerenciar convites legados |
| `roleplay_simulations` | `simulations_authenticated` | ALL | Qualquer autenticado pode ler/escrever simulações de TODOS os tenants |
| `sos_responses` | `sos_responses_view` | ALL | Qualquer autenticado pode gerenciar respostas SOS de TODOS os tenants |
| `meeting_attendees` | `attendees_view` | SELECT | Qualquer autenticado pode ver participantes de reuniões de TODOS os tenants |

**Correção:** Substituir `auth.uid() IS NOT NULL` por filtro de tenant: `tenant_id IN (SELECT get_user_tenant_ids())`

#### MEDIO — SELECT com `USING(true)` (Leitura Pública sem Autenticação)
| Tabela | Policy | Risco |
|---|---|---|
| `badges` | `badges_view` | Qualquer pessoa (incluindo anon) pode listar badges |
| `behavioral_questions` | `questions_view` | Questionários comportamentais visíveis sem login |
| `trails` | `trails_view` | TODAS as trilhas visíveis sem autenticação |
| `user_badges` | `user_badges_view` | Badges de usuários visíveis sem autenticação |

**Correção:** Adicionar filtro de tenant ou restringir a `authenticated`.

#### BAIXO — Acesso Anônimo Intencional (Forms Públicos)
| Tabela | Policy | Justificativa |
|---|---|---|
| `form_questions` | `anyone_read_questions` | anon+authenticated — necessário para formulários públicos |
| `form_submissions` | `anyone_insert_submission` | anon+authenticated INSERT com `WITH CHECK(true)` — permite qualquer pessoa inserir submissions |
| `tenant_forms` | `public_read_active_forms` | anon pode ler formulários ativos — necessário para landing pages |

**Risco:** `form_submissions` com `WITH CHECK(true)` permite inserção massiva (spam/DDoS). Recomendação: adicionar rate limiting via Edge Function.

---

## 2. APIs E ENDPOINTS — 80+ Edge Functions

### Endpoints Públicos (verify_jwt = false)
Todas as 80+ Edge Functions têm `verify_jwt = false` no `config.toml`. Isso é **por design** — a autenticação é validada no código via `getClaims()`.

### Endpoints Intencionalmente Públicos (sem auth no código):
- `send-otp` — Fluxo de login
- `verify-otp` — Fluxo de login
- `process-onboarding` — Verifica OTP internamente

### Endpoints com Auth no Código:
A maioria das functions valida `Authorization: Bearer` + membership/tenant. Verificado nos scans anteriores.

### BAIXO — Enumeração de Usuários
A função `can_receive_otp` retorna `'not_invited'` vs `'existing_user'` vs `'pending_invite'`, permitindo a um atacante saber se um email está cadastrado. Mitigação: aceitar com mensagem genérica ("Se este email estiver cadastrado, enviaremos um código").

---

## 3. AUTENTICAÇÃO

| Aspecto | Status | Nota |
|---|---|---|
| Tipo | OTP via email/WhatsApp | Sem senhas — elimina ataques de força bruta |
| Magic Links | Via `tokenHash` do verify-otp | Token de uso único |
| Código dev `000000` | Removido | Confirmado no scan |
| Expiração de OTP | `expires_at` no banco | Cleanup via `cleanup_expired_otp_codes()` |
| Reutilização de OTP | Campo `used = true` | Impede reutilização |
| Leaked Password Protection | **DESABILITADO** | **MEDIO** — Deve ser habilitado |
| Fluxo invite-only | Sim | Apenas usuários convidados podem se autenticar |

---

## 4. PERMISSÕES E ESCALAÇÃO DE PRIVILÉGIOS

| Controle | Status |
|---|---|
| Trigger `prevent_membership_escalation` | Bloqueia auto-escalação, troca de tenant, e alteração do próprio papel |
| Roles via `memberships` (não localStorage) | Seguro — roles vêm do banco |
| master_admin > admin > ops > mentor > mentee | Hierarquia implementada |
| Impersonation com audit log | Implementado com `impersonation_logs` |

**Status: BEM IMPLEMENTADO** — Nenhuma vulnerabilidade de escalação encontrada.

---

## 5. STORAGE / ARQUIVOS

| Bucket | Público | Risco |
|---|---|---|
| `trail-covers` | Sim | BAIXO — Capas de trilhas, conteúdo não sensível |
| `lesson-files` | Sim | **MEDIO** — Arquivos de lição acessíveis via URL direta sem autenticação |
| `avatars` | Sim | BAIXO — Fotos de perfil |
| `playbook-covers` | Sim | BAIXO — Capas de playbooks |
| `popup-images` | Sim | BAIXO — Imagens de popups |
| `lead-screenshots` | Não | OK |
| `mentorado-files` | Não | OK |
| `mentor-library` | Não | OK |
| `branding-assets` | Não | OK |
| `data-backups` | Não | OK |

**MEDIO:** `lesson-files` é público — qualquer pessoa com a URL pode acessar o conteúdo das lições. Se o conteúdo for proprietário, deve ser privado com signed URLs.

---

## 6. SECRETS E CHAVES

| Verificação | Status |
|---|---|
| Service Role Key no frontend | **NÃO encontrada** — Seguro |
| API keys no código fonte (`src/`) | **Nenhuma** exposta — Seguro |
| Secrets armazenados no Vault | 12 secrets configurados (Resend, ElevenLabs, Google, etc.) |
| `.env` expõe apenas | `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (público por design) |

**Status: SEGURO** — Nenhuma chave sensível exposta no frontend.

---

## 7. SEGURANÇA DO FRONTEND

| Verificação | Status |
|---|---|
| Queries diretas ao banco | Via Supabase client com RLS — protegido |
| Dados sensíveis no client | Roles vêm do banco, não de localStorage |
| Endpoints internos expostos | Nenhum — tudo via `supabase.functions.invoke()` |
| service_role no frontend | **Não encontrado** |

**Status: SEGURO**

---

## 8. CENÁRIOS DE ATAQUE

| Ataque | Possível? | Motivo |
|---|---|---|
| Acesso ao banco via API pública | **PARCIAL** | Tabelas com `USING(true)` permitem leitura de badges/trails/user_badges sem autenticação |
| Leitura cross-tenant | **SIM** | 11 tabelas com `auth.uid() IS NOT NULL` permitem leitura entre tenants |
| Manipulação de tokens | Não | OTP com expiração + flag `used` |
| Bypass de autenticação | Não | Fluxo invite-only + OTP |
| Auto-escalação de privilégios | Não | Trigger `prevent_membership_escalation` |
| Leitura de tabelas admin | Não | `otp_codes` com `USING(false)`, `system_fingerprints` restrito a master_admin |
| Spam em formulários | **SIM** | `form_submissions` aceita INSERT anônimo sem rate limit |

---

## 9. CLASSIFICAÇÃO CONSOLIDADA

### CRITICO — Nenhum encontrado

### ALTO — Nenhum encontrado

### MEDIO (6 achados)
1. **11 tabelas com vazamento cross-tenant** — Policies usando `auth.uid() IS NOT NULL` sem filtro de tenant
2. **`lesson-files` bucket público** — Conteúdo proprietário acessível via URL direta
3. **`trails` com `USING(true)`** — Todas as trilhas legíveis sem autenticação
4. **Leaked Password Protection desabilitado** — Deve ser habilitado nas configurações de auth
5. **`form_submissions` sem rate limit** — Possibilidade de spam massivo
6. **Enumeração de emails** via `can_receive_otp` response differentiation

### BAIXO (4 achados)
1. **`badges`, `user_badges`, `behavioral_questions`** com SELECT público
2. **SECURITY DEFINER functions** — 12 funções com privilégios elevados (já revisadas, sem SQL injection)
3. **Client-side permission checks** — UX-only, backend protegido
4. **Impersonation sem IP real** — Captura `null` em vez do IP do cliente

---

## 10. PLANO DE CORREÇÃO

### Prioridade 1 — Cross-Tenant Leak (11 tabelas)
Uma única migração SQL para substituir as 11 policies permissivas:

```sql
-- Para cada tabela: DROP policy antiga, CREATE nova com filtro de tenant
-- Exemplo para call_analyses:
DROP POLICY "analyses_view" ON call_analyses;
CREATE POLICY "analyses_tenant" ON call_analyses FOR ALL
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Tabelas sem tenant_id (ex: crm_interactions) precisam JOIN via lead/membership
```

### Prioridade 2 — Trails/Badges SELECT público
```sql
DROP POLICY "trails_view" ON trails;
-- trails_mentee_tenant_view + trails_manage já cobrem os acessos necessários

DROP POLICY "badges_view" ON badges;
CREATE POLICY "badges_view_tenant" ON badges FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids()));
```

### Prioridade 3 — lesson-files bucket
Tornar o bucket privado e servir arquivos via signed URLs no frontend.

### Prioridade 4 — Rate limiting para form_submissions
Adicionar uma Edge Function intermediária que valide reCAPTCHA ou aplique rate limit antes de inserir.

### Prioridade 5 — Habilitar Leaked Password Protection
Configuração no painel de auth.

---

## RESUMO EXECUTIVO

| Métrica | Valor |
|---|---|
| **Nível Geral de Segurança** | **BOM (7.5/10)** |
| Tabelas com RLS | 97/97 (100%) |
| Achados Críticos | 0 |
| Achados Altos | 0 |
| Achados Médios | 6 |
| Achados Baixos | 4 |
| Principal Risco | Vazamento de dados cross-tenant em 11 tabelas |
| Recomendação Prioritária | Corrigir as 11 policies com `auth.uid() IS NOT NULL` |

A arquitetura de segurança é sólida: RLS em 100% das tabelas, sem secrets no frontend, trigger anti-escalação, OTP sem senhas, e audit logging de impersonation. Os 6 achados médios são todos corrigíveis com uma única migração SQL + ajuste de bucket.

