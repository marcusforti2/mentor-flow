

## Governança de Agentes por Role

### Problema
Hoje todos os 18 agentes estão disponíveis para qualquer staff (admin, ops, mentor, master_admin). O Branding Agent permite que um mentor altere cores, logo e domínios — algo restrito ao Master Admin por política de negócio.

### Solução
Adicionar um campo `allowedRoles` a cada agente e filtrar no roteamento.

### Mudança

**Arquivo**: `supabase/functions/jarvis-chat/index.ts`

1. **Adicionar `allowedRoles` ao tipo de cada agente**:

```text
branding:   allowedRoles: ["master_admin"]
automation: allowedRoles: ["admin", "master_admin"]
analytics:  allowedRoles: ["admin", "ops", "master_admin"]
(demais):   allowedRoles: ["admin", "ops", "mentor", "master_admin"]
```

2. **Filtrar agentes antes do roteamento** — construir o enum de agentes e as descrições apenas com os que o role do caller permite. Se um mentor perguntar sobre branding, o agente simplesmente não existe no menu do roteador → cai no fallback `jarvis` que responde "essa função é restrita ao administrador".

3. **Bloquear execução de tools restritas** — mesmo que alguém force o agent name via API, validar o role antes de executar tools de branding/domínios.

### Mapa de Restrições

| Agente | master_admin | admin | ops | mentor |
|--------|:---:|:---:|:---:|:---:|
| CRM | ✅ | ✅ | ✅ | ✅ |
| Trails | ✅ | ✅ | ✅ | ✅ |
| Playbooks | ✅ | ✅ | ✅ | ✅ |
| Calendar | ✅ | ✅ | ✅ | ✅ |
| Email | ✅ | ✅ | ✅ | ✅ |
| WhatsApp | ✅ | ✅ | ✅ | ✅ |
| CS | ✅ | ✅ | ✅ | ✅ |
| Forms | ✅ | ✅ | ✅ | ✅ |
| Popups | ✅ | ✅ | ✅ | ✅ |
| Gamification | ✅ | ✅ | ✅ | ✅ |
| Meetings | ✅ | ✅ | ✅ | ✅ |
| Files | ✅ | ✅ | ✅ | ✅ |
| Community | ✅ | ✅ | ✅ | ✅ |
| Onboarding | ✅ | ✅ | ✅ | ✅ |
| AI Tools | ✅ | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ | ❌ |
| Automation | ✅ | ✅ | ❌ | ❌ |
| **Branding** | ✅ | ❌ | ❌ | ❌ |

### Impacto
- Zero mudanças de UI
- Segurança reforçada: tools de branding/domínio bloqueadas server-side
- Roteamento dinâmico: o enum do roteador é construído por role

