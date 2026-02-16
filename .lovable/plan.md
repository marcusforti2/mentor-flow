# Plano de Correções — Bugs Operacionais

## Etapa 1: Perfil do negócio não salva ⬜
- **Bug**: `BusinessProfileForm.tsx` envia `mentorado_id` no payload, mas a coluna não existe na tabela
- **Fix**: Remover `mentorado_id` do payload de insert/update, usar apenas `membership_id`
- **Arquivo**: `src/components/crm/BusinessProfileForm.tsx` (linhas 286-287)

## Etapa 2: Disponibilidade da agenda não salva ⬜
- **Bug**: Investigar se delete+insert falha por RLS ou payload
- **Fix**: Testar e corrigir a mutation `saveAvailability` no `useScheduling.tsx`
- **Arquivo**: `src/hooks/useScheduling.tsx`

## Etapa 3: Mentor login com dados vazios ⬜
- **Bug**: Dashboard renderiza antes do `activeMembership` estar carregado
- **Fix**: Adicionar re-fetch automático quando `activeMembership` muda
- **Arquivo**: `src/hooks/useDashboardStats.tsx`

## Etapa 4: Trilha assistida não registra progresso ⬜
- **Bug**: Player de lição não chama `logActivity` nem atualiza `trail_progress`
- **Fix**: Adicionar `logActivity('lesson_completed')` ao marcar lição como concluída
- **Arquivos**: `src/components/trails/LessonContentModal.tsx` ou `VideoPlayerModal.tsx`

## Etapa 5: Lead manual não computa no dash ⬜
- **Bug**: Cadastro de lead não registra activity_log
- **Fix**: Adicionar `logActivity('lead_created')` ao criar lead
- **Arquivos**: `src/components/crm/ManualLeadModal.tsx`

## Etapa 6: Atividade sem nome do mentorado no dash mentor ⬜
- **Bug**: `useDashboardStats` não resolve membership_id → profile name nas atividades
- **Fix**: Fazer join com profiles para exibir `mentoradoName` em cada atividade
- **Arquivo**: `src/hooks/useDashboardStats.tsx`

## Etapa 7: Email pro mentor ao agendar sessão ⬜
- **Bug**: Funcionalidade não implementada
- **Fix**: Criar edge function `notify-mentor-booking` + chamar no `createBooking`
- **Arquivos**: Nova edge function + `src/hooks/useScheduling.tsx`

## Etapa 8: Nome do mentorado no agendamento do mentor ⬜
- **Bug**: BookingCalendar não faz join com profiles
- **Fix**: Buscar dados do mentorado (nome, foto) e exibir nos slots agendados
- **Arquivo**: `src/components/scheduling/BookingCalendar.tsx`
