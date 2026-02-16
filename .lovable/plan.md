# Plano de Correções — Bugs Operacionais

## Etapa 1: Perfil do negócio não salva ✅
- **Fix**: Removido `mentorado_id` do payload, usando apenas `membership_id`

## Etapa 2: Disponibilidade da agenda não salva ✅
- **Fix**: Corrigido error handling no delete + adicionado WITH CHECK na policy RLS

## Etapa 3: Mentor login com dados vazios ✅
- **Fix**: Loading state mantido até `activeMembership` estar disponível

## Etapa 4: Trilha assistida não registra progresso ✅
- **Fix**: Adicionado upsert em `trail_progress` + `logActivity('lesson_completed')` ao marcar lição concluída

## Etapa 5: Lead manual não computa no dash ✅
- **Fix**: Adicionado `logActivity('lead_created')` ao criar lead manual

## Etapa 6: Atividade sem nome do mentorado no dash mentor ✅
- **Fix**: Resolvido join com profiles no `useDashboardStats` + exibição no AdminDashboard

## Etapa 7: Email pro mentor ao agendar sessão ✅
- **Fix**: Criada edge function `notify-mentor-booking` + chamada no `createBooking`

## Etapa 8: Nome do mentorado no agendamento do mentor ✅
- **Fix**: Resolução de nomes via memberships→profiles e exibição nos slots e próximas sessões
