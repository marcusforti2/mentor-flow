import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Automation {
  id: string;
  tenant_id: string;
  automation_key: string;
  is_enabled: boolean;
  schedule: string | null;
  config: Record<string, any>;
  last_run_at: string | null;
  last_run_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationMeta {
  label: string;
  description: string;
  howItWorks: string;
  icon: string;
  hasSchedule: boolean;
  category: 'engagement' | 'intelligence' | 'communication' | 'growth';
  frequencyLabel: string;
  audience: 'mentor' | 'mentorado' | 'ambos';
  audienceLabel: string;
}

export const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  engagement: { label: '🔄 Engajamento', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  intelligence: { label: '🧠 Inteligência', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  communication: { label: '📬 Comunicação', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  growth: { label: '🚀 Crescimento', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

const AUTOMATION_META: Record<string, AutomationMeta> = {
  weekly_digest: {
    label: 'Digest Semanal',
    description: 'Resumo semanal personalizado para cada mentorado com suas métricas, progresso e insights gerados por IA.',
    howItWorks: 'Todo início de semana, o sistema coleta dados de atividade, leads, tarefas e trilhas de cada mentorado e gera um email personalizado com insights de IA, destacando conquistas e áreas de melhoria.',
    icon: 'mail',
    hasSchedule: true,
    category: 'communication',
    frequencyLabel: 'Semanal',
    audience: 'mentorado',
    audienceLabel: '📩 Enviado ao mentorado',
  },
  re_engage_inactive: {
    label: 'Re-engajamento Inteligente',
    description: 'Detecta mentorados inativos e envia email empático incentivando o retorno à plataforma.',
    howItWorks: 'A cada 12 horas, o sistema verifica quais mentorados não realizaram nenhuma atividade nos últimos X dias (configurável). Para cada inativo, gera um email motivacional com IA, destacando o que está perdendo e próximos passos.',
    icon: 'user-check',
    hasSchedule: true,
    category: 'engagement',
    frequencyLabel: 'A cada 12h',
    audience: 'mentorado',
    audienceLabel: '📩 Enviado ao mentorado',
  },
  auto_qualify_lead: {
    label: 'Auto-qualificação de Leads',
    description: 'Analisa o perfil social de novos leads com IA e atribui uma pontuação de qualificação automaticamente.',
    howItWorks: 'Quando um lead é criado com URL de perfil social, a IA analisa informações públicas (LinkedIn, Instagram) e gera insights sobre potencial de conversão, objeções prováveis e abordagem recomendada.',
    icon: 'target',
    hasSchedule: false,
    category: 'intelligence',
    frequencyLabel: 'Sob demanda',
    audience: 'mentor',
    audienceLabel: '🧑‍💼 Visível para o mentor',
  },
  check_badges: {
    label: 'Verificação de Badges',
    description: 'Concede medalhas e conquistas automaticamente com base nos pontos e atividades realizadas.',
    howItWorks: 'Periodicamente verifica os pontos acumulados de cada mentorado e compara com os requisitos de cada badge. Badges elegíveis são concedidas automaticamente e o mentorado é notificado.',
    icon: 'award',
    hasSchedule: true,
    category: 'growth',
    frequencyLabel: 'Diário',
    audience: 'mentorado',
    audienceLabel: '🏆 Notifica o mentorado',
  },
  check_alerts: {
    label: 'Alertas Inteligentes',
    description: 'Monitora a saúde da mentoria e gera alertas proativos sobre inatividade, atrasos e riscos.',
    howItWorks: 'Analisa métricas de cada mentorado (último acesso, tarefas atrasadas, SOS pendentes) e gera alertas priorizados no sino de notificações do mentor, com deduplicação automática para evitar spam.',
    icon: 'bell',
    hasSchedule: true,
    category: 'intelligence',
    frequencyLabel: 'A cada 6h',
    audience: 'mentor',
    audienceLabel: '🔔 Alerta para o mentor',
  },
  send_prospection_tips: {
    label: 'Dicas de Prospecção',
    description: 'Envia dicas personalizadas de prospecção por email com base no perfil de negócio do mentorado.',
    howItWorks: 'A IA analisa o perfil de negócio, nicho e momento do mentorado para gerar dicas práticas e acionáveis de prospecção, enviadas por email com frequência configurável.',
    icon: 'lightbulb',
    hasSchedule: true,
    category: 'growth',
    frequencyLabel: 'Configurável',
    audience: 'mentorado',
    audienceLabel: '📩 Enviado ao mentorado',
  },
  welcome_onboarding: {
    label: 'Boas-vindas Automático',
    description: 'Email de boas-vindas personalizado com IA quando um novo mentorado entra na plataforma.',
    howItWorks: 'Ao detectar novos membros sem email de boas-vindas, gera uma mensagem personalizada com o nome do mentor, identidade do programa e primeiros passos recomendados.',
    icon: 'hand-heart',
    hasSchedule: true,
    category: 'communication',
    frequencyLabel: 'A cada 2h',
    audience: 'mentorado',
    audienceLabel: '📩 Enviado ao mentorado',
  },
  meeting_reminder: {
    label: 'Lembrete de Reunião',
    description: 'Envia lembretes automáticos por email antes das reuniões agendadas no calendário.',
    howItWorks: 'Verifica a cada 2 horas se há reuniões próximas dentro da janela configurada (padrão: 24h). Envia email com título, horário e link da reunião para todos os participantes.',
    icon: 'calendar-clock',
    hasSchedule: true,
    category: 'communication',
    frequencyLabel: 'A cada 2h',
    audience: 'ambos',
    audienceLabel: '👥 Enviado a todos os participantes',
  },
  monthly_mentor_report: {
    label: 'Relatório Mensal',
    description: 'Relatório consolidado mensal com métricas, tendências e insights de IA sobre todos os mentorados.',
    howItWorks: 'No dia 1° de cada mês, coleta todas as métricas do período anterior (leads, tarefas, trilhas, badges, atividade) e gera um relatório detalhado com análise de IA, enviado ao email do mentor.',
    icon: 'bar-chart-3',
    hasSchedule: true,
    category: 'intelligence',
    frequencyLabel: 'Mensal',
    audience: 'mentor',
    audienceLabel: '📊 Enviado ao mentor',
  },
  celebrate_achievements: {
    label: 'Celebração de Conquistas',
    description: 'Parabeniza mentorados automaticamente quando completam trilhas ou conquistam novas badges.',
    howItWorks: 'Monitora novos badges e certificados de trilhas. Para cada conquista detectada, envia um email de celebração com mensagem motivacional gerada por IA e incentivo para os próximos desafios.',
    icon: 'party-popper',
    hasSchedule: true,
    category: 'growth',
    frequencyLabel: 'Diário',
    audience: 'mentorado',
    audienceLabel: '🎉 Notifica o mentorado',
  },
  metrics_reminder: {
    label: 'Lembrete de Métricas',
    description: 'Envia email toda segunda cobrando o preenchimento das métricas semanais do mentorado.',
    howItWorks: 'Toda segunda-feira às 8h, verifica se cada mentorado preencheu atividades nos últimos 7 dias. Se não preencheu, envia email motivacional cobrando. Se preencheu, envia parabéns com resumo.',
    icon: 'bar-chart-3',
    hasSchedule: true,
    category: 'engagement',
    frequencyLabel: 'Semanal (seg)',
    audience: 'mentorado',
    audienceLabel: '📩 Enviado ao mentorado',
  },
  engagement_score: {
    label: 'Score de Engajamento',
    description: 'Calcula score 0-100 de cada mentorado baseado em atividade (CRM, tarefas, trilhas, comunidade) e alerta o mentor.',
    howItWorks: 'Semanalmente, coleta dados de atividade, tarefas concluídas, progresso em trilhas e CRM de cada mentorado. Gera um score de 0-100 e ranking. Mentorados com score <30 recebem nudge por WhatsApp. Mentores recebem ranking por email e alerta WhatsApp sobre casos críticos.',
    icon: 'gauge',
    hasSchedule: true,
    category: 'intelligence',
    frequencyLabel: 'Semanal (seg)',
    audience: 'ambos',
    audienceLabel: '📊 Ranking para mentor + nudge para mentorado',
  },
  cold_lead_followup: {
    label: 'Follow-up de Lead Frio',
    description: 'Detecta leads parados há X dias no pipeline e envia sugestão de abordagem ao mentorado.',
    howItWorks: 'Diariamente, verifica leads (prospecções) sem movimentação nos últimos X dias (configurável). Gera sugestões de abordagem com IA e envia por email e WhatsApp ao mentorado responsável.',
    icon: 'thermometer-snowflake',
    hasSchedule: true,
    category: 'intelligence',
    frequencyLabel: 'Diário',
    audience: 'mentorado',
    audienceLabel: '📩 Enviado ao mentorado',
  },
  overdue_task_reminder: {
    label: 'Cobrança de Tarefas Atrasadas',
    description: 'Envia lembrete automático ao mentorado sobre tarefas do Kanban com prazo vencido.',
    howItWorks: 'Diariamente, verifica tarefas com due_date vencida que não estão como "done". Envia email e WhatsApp ao mentorado listando tarefas atrasadas. Se houver 3+ tarefas atrasadas, alerta o mentor por WhatsApp.',
    icon: 'clock-alert',
    hasSchedule: true,
    category: 'engagement',
    frequencyLabel: 'Diário',
    audience: 'ambos',
    audienceLabel: '⏰ Cobrado do mentorado + alerta para mentor',
  },
  content_rotation: {
    label: 'Rotação de Conteúdo',
    description: 'Envia dicas/conteúdo semanal rotativo de playbooks e trilhas relevantes para cada mentorado.',
    howItWorks: 'Semanalmente, seleciona um conteúdo publicado (playbook ou trilha) e envia por email e WhatsApp com dica motivacional gerada por IA. O conteúdo rotaciona automaticamente a cada semana.',
    icon: 'rotate-cw',
    hasSchedule: true,
    category: 'communication',
    frequencyLabel: 'Semanal (ter)',
    audience: 'mentorado',
    audienceLabel: '📩 Enviado ao mentorado',
  },
  stale_deal_alert: {
    label: 'Alerta de Deal Parado',
    description: 'Notifica o mentor quando deals dos mentorados estão sem movimentação há X dias.',
    howItWorks: 'Diariamente, verifica prospecções com pontuação > 0 que não foram atualizadas nos últimos X dias (configurável). Envia relatório por email e alerta WhatsApp ao mentor.',
    icon: 'alert-triangle',
    hasSchedule: true,
    category: 'intelligence',
    frequencyLabel: 'Diário',
    audience: 'mentor',
    audienceLabel: '💰 Alerta para o mentor',
  },
  weekly_whatsapp_summary: {
    label: 'Resumo WhatsApp Semanal',
    description: 'Consolida todas as interações de WhatsApp da semana e gera relatório com insights de IA.',
    howItWorks: 'Toda sexta-feira, consolida métricas de mensagens enviadas/recebidas/entregues e cruza com dados de CRM. A IA analisa as métricas e gera insights práticos. Envia por email e WhatsApp ao mentor.',
    icon: 'message-square-text',
    hasSchedule: true,
    category: 'intelligence',
    frequencyLabel: 'Semanal (sex)',
    audience: 'mentor',
    audienceLabel: '📱 Enviado ao mentor',
  },
  incomplete_trail_nudge: {
    label: 'Nudge de Trilha Incompleta',
    description: 'Detecta mentorados que pararam uma trilha no meio e envia incentivo para continuar.',
    howItWorks: 'Semanalmente, verifica quais mentorados têm trilhas com progresso parcial (começaram mas não terminaram). Envia email e WhatsApp mostrando o % de progresso e incentivando a conclusão.',
    icon: 'graduation-cap',
    hasSchedule: true,
    category: 'engagement',
    frequencyLabel: 'Semanal (qua)',
    audience: 'mentorado',
    audienceLabel: '🎓 Nudge para o mentorado',
  },
  mentor_mentee_match: {
    label: 'Match Mentor-Mentorado',
    description: 'Sugere reatribuições de mentor baseado em carga e distribuição de mentorados.',
    howItWorks: 'Mensalmente, analisa a distribuição de mentorados entre mentores. Identifica mentorados sem mentor e mentores sobrecarregados. Gera sugestões de redistribuição com IA e envia ao admin.',
    icon: 'handshake',
    hasSchedule: true,
    category: 'intelligence',
    frequencyLabel: 'Mensal',
    audience: 'mentor',
    audienceLabel: '🤝 Sugestão para admin',
  },
  meeting_prep_briefing: {
    label: 'Prep de Reunião',
    description: '24h antes de cada sessão, gera briefing com dados do mentorado e envia ao mentor.',
    howItWorks: 'A cada 4 horas, verifica reuniões próximas (dentro de 24h). Para cada uma, coleta métricas dos participantes (tarefas, leads, progresso) e gera sugestões de pauta com IA. Envia briefing completo por email e resumo por WhatsApp ao mentor.',
    icon: 'file-text',
    hasSchedule: true,
    category: 'communication',
    frequencyLabel: 'A cada 4h',
    audience: 'mentor',
    audienceLabel: '📅 Briefing para o mentor',
  },
};
export function getAutomationMeta(key: string): AutomationMeta {
  return AUTOMATION_META[key] || { label: key, description: '', howItWorks: '', icon: 'zap', hasSchedule: false, category: 'engagement' as const, frequencyLabel: 'Sob demanda', audience: 'ambos' as const, audienceLabel: '👥 Para todos' };
}

function automationsQueryKey(tenantId: string | undefined) {
  return ['automations', tenantId] as const;
}

export function useAutomations() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const { data: automations = [], isLoading: loading } = useQuery({
    queryKey: automationsQueryKey(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_automations')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('automation_key');

      if (error) {
        toast.error('Erro ao carregar automações');
        throw error;
      }
      return (data || []) as unknown as Automation[];
    },
    enabled: !!tenantId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('tenant_automations')
        .update({ is_enabled: enabled })
        .eq('id', id);
      if (error) throw error;
      return enabled;
    },
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: automationsQueryKey(tenantId) });
      const prev = queryClient.getQueryData<Automation[]>(automationsQueryKey(tenantId));
      queryClient.setQueryData<Automation[]>(automationsQueryKey(tenantId), old =>
        (old || []).map(a => a.id === id ? { ...a, is_enabled: enabled } : a)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(automationsQueryKey(tenantId), context.prev);
      toast.error('Erro ao atualizar automação');
    },
    onSuccess: (_data, { enabled }) => {
      toast.success(enabled ? 'Automação ativada' : 'Automação desativada');
    },
  });

  const configMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Record<string, any> }) => {
      const { error } = await supabase
        .from('tenant_automations')
        .update({ config })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, config }) => {
      await queryClient.cancelQueries({ queryKey: automationsQueryKey(tenantId) });
      const prev = queryClient.getQueryData<Automation[]>(automationsQueryKey(tenantId));
      queryClient.setQueryData<Automation[]>(automationsQueryKey(tenantId), old =>
        (old || []).map(a => a.id === id ? { ...a, config } : a)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(automationsQueryKey(tenantId), context.prev);
      toast.error('Erro ao salvar configuração');
    },
    onSuccess: () => {
      toast.success('Configuração salva');
    },
  });

  const toggleAutomation = useCallback((id: string, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled });
  }, [toggleMutation]);

  const updateConfig = useCallback((id: string, config: Record<string, any>) => {
    configMutation.mutate({ id, config });
  }, [configMutation]);

  const runNow = useCallback(async (automationKey: string) => {
    if (!tenantId) return;

    const fnMap: Record<string, string> = {
      weekly_digest: 'weekly-digest',
      re_engage_inactive: 're-engage-inactive',
      auto_qualify_lead: 'auto-qualify-lead',
      check_badges: 'check-badges',
      check_alerts: 'check-alerts',
      send_prospection_tips: 'send-prospection-tips',
      welcome_onboarding: 'welcome-onboarding',
      meeting_reminder: 'meeting-reminder',
      monthly_mentor_report: 'monthly-mentor-report',
      celebrate_achievements: 'celebrate-achievements',
    };

    const fnName = fnMap[automationKey];
    if (!fnName) {
      toast.error('Automação desconhecida');
      return;
    }

    toast.info('Executando automação...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ tenant_id: tenantId }),
        }
      );

      if (res.ok) {
        toast.success('Automação executada com sucesso!');
        queryClient.invalidateQueries({ queryKey: automationsQueryKey(tenantId) });
      } else {
        const body = await res.text();
        toast.error(`Erro: ${body.slice(0, 100)}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao executar: ${err.message}`);
    }
  }, [tenantId, queryClient]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: automationsQueryKey(tenantId) });
  }, [queryClient, tenantId]);

  return { automations, loading, toggleAutomation, updateConfig, runNow, refetch };
}
