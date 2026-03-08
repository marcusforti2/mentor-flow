

## Mapeamento Completo: Agentes Especializados do Jarvis

Analisei todo o sistema do mentor — menu, páginas, ferramentas, tabelas e funcionalidades. Aqui está o mapeamento completo de agentes necessários, expandindo dos 4 atuais para cobrir **cada feature individual**.

---

### Agentes Atuais (4) vs. Agentes Propostos (12)

Hoje temos 4 agentes genéricos que misturam responsabilidades. A proposta é **12 agentes focados**, cada um mapeado 1:1 com uma feature do sistema:

```text
┌─────────────────────────────────────────────────┐
│                 JARVIS (Orquestrador)            │
│         Classifica a intenção → roteia           │
├─────────┬──────────┬──────────┬─────────────────┤
│         │          │          │                   │
│  ┌──────┴───┐ ┌────┴────┐ ┌──┴──────┐           │
│  │ 1. CRM   │ │ 2.Trails│ │3.Play-  │ ...       │
│  │  Agent   │ │  Agent  │ │ books   │           │
│  └──────────┘ └─────────┘ └─────────┘           │
│                                                   │
│  4. Calendar  5. Email   6. WhatsApp             │
│  7. SOS/CS    8. Forms   9. Popups               │
│ 10. Gamify   11.Analytics 12.Onboard             │
└─────────────────────────────────────────────────┘
```

---

### Os 12 Agentes

| # | Agente | Feature/Página | Responsabilidade |
|---|--------|---------------|------------------|
| 1 | **CRM Agent** 💼 | CRM Mentorados | Leads, pipeline, prospecções, qualificação, interações |
| 2 | **Trails Agent** 🎓 | Trilhas | Criar/editar trilhas, módulos, aulas, progresso |
| 3 | **Playbooks Agent** 📖 | Playbooks | Criar/editar playbooks, páginas, acesso, geração IA |
| 4 | **Calendar Agent** 📅 | Calendário | Eventos, disponibilidade, agendamentos, lembretes |
| 5 | **Email Agent** ✉️ | Email Marketing | Templates, campanhas, flows, execuções |
| 6 | **WhatsApp Agent** 📱 | WhatsApp | Mensagens, campanhas, auto-reply, flows, resumos |
| 7 | **CS Agent** 🎯 | Mentorados + Jornada CS | Gestão de mentorados, jornada, convites, atribuições, SOS |
| 8 | **Forms Agent** 📋 | Formulários | Criar forms, perguntas, onboarding, submissões |
| 9 | **Popups Agent** 🪧 | Popups | Criar/gerenciar popups de tenant |
| 10 | **Gamification Agent** 🏆 | Gamificação | Badges, recompensas, streaks, ranking, pontos |
| 11 | **Analytics Agent** 📊 | Relatórios + Dashboard | Métricas, auditoria, reports, performance, scores |
| 12 | **Automation Agent** ⚡ | Automações | Ativar/desativar automações, configurar schedules, executar |

---

### Mudanças no Código

**Arquivo único**: `supabase/functions/jarvis-chat/index.ts`

1. **Expandir o objeto `AGENTS`** de 4 para 12 entries, cada um com:
   - `tools[]` filtrado (apenas as ferramentas daquela feature)
   - `prompt` especializado com contexto do domínio
   - `tables[]` (novo campo — tabelas que o agente pode acessar, para queries mais seguras)

2. **Atualizar o prompt de roteamento** para classificar entre 12 agentes em vez de 4. O modelo `gemini-2.5-flash-lite` continua sendo suficiente — a classificação é simples, só tem mais categorias.

3. **Redistribuir as tools existentes** — nenhuma tool nova precisa ser criada, apenas reorganizar as 60+ tools nos agentes corretos.

Exemplo da redistribuição:

- **Trails Agent**: `create_trail`, `create_trail_module`, `create_lesson`, `toggle_trail_publish`, `generate_trail_ai`, `mark_lesson_complete`, `search_trail_content`
- **Playbooks Agent**: `create_playbook`, `update_playbook`, `generate_playbook_ai`, `search_playbook_content`
- **Calendar Agent**: `create_calendar_event`, `update_calendar_event`, `delete_calendar_event`, `set_availability`
- **Email Agent**: `create_email_template`, `create_email_campaign`, `bulk_send_email`, `send_individual_email`, `toggle_email_flow`
- **WhatsApp Agent**: `send_whatsapp_message`, `send_whatsapp_to_all`, `toggle_wa_flow`
- **CS Agent**: `invite_mentorado`, `update_mentorado`, `suspend_mentorado`, `assign_mentor`, `create_task`, `bulk_create_tasks`, `update_task_status`, `delete_task`, `send_sos_to_mentee`, `create_journey`, `create_journey_stage`, `list_pending_invites`, `revoke_invite`, `bulk_invite_mentorados`
- **Forms Agent**: `create_form`, `add_form_question`, `toggle_form`, `get_form_submissions`, `create_behavioral_question`
- **Popups Agent**: `create_popup`, `toggle_popup`
- **Gamification Agent**: `award_badge`, `create_badge`, `create_reward`, `log_custom_activity`
- **Automation Agent**: `toggle_automation`, `run_automation_now`, `update_tenant_settings`
- **Analytics Agent**: `get_tenant_analytics`, `full_system_audit`, `generate_mentor_report`, `get_mentee_details`, `get_mentee_journey_position`
- **CRM Agent**: mantém igual ao atual

4. **Frontend**: Nenhuma mudança — o badge do agente no `JarvisChat.tsx` já funciona, apenas mostrará nomes mais específicos (ex: "📅 Calendar Agent" em vez de "🎯 CS Agent").

---

### Impacto

- **Zero mudanças de UI** — tudo invisível pro usuário, apenas o badge muda
- **Respostas mais precisas** — cada agente tem prompt e tools focados
- **Roteamento mais granular** — evita que o agente de CRM tente criar trilhas
- **Segurança melhor** — cada agente só acessa tabelas relevantes

