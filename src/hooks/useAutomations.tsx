import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

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
};

export function getAutomationMeta(key: string): AutomationMeta {
  return AUTOMATION_META[key] || { label: key, description: '', howItWorks: '', icon: 'zap', hasSchedule: false, category: 'engagement' as const, frequencyLabel: 'Sob demanda', audience: 'ambos' as const, audienceLabel: '👥 Para todos' };
}

export function useAutomations() {
  const { tenant } = useTenant();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAutomations = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tenant_automations')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('automation_key');

    if (error) {
      console.error('Error fetching automations:', error);
      toast.error('Erro ao carregar automações');
    } else {
      setAutomations((data || []) as unknown as Automation[]);
    }
    setLoading(false);
  }, [tenant?.id]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const toggleAutomation = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from('tenant_automations')
      .update({ is_enabled: enabled })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar automação');
      return;
    }
    toast.success(enabled ? 'Automação ativada' : 'Automação desativada');
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_enabled: enabled } : a));
  };

  const updateConfig = async (id: string, config: Record<string, any>) => {
    const { error } = await supabase
      .from('tenant_automations')
      .update({ config })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao salvar configuração');
      return;
    }
    toast.success('Configuração salva');
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, config } : a));
  };

  const runNow = async (automationKey: string) => {
    if (!tenant?.id) return;

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
          body: JSON.stringify({ tenant_id: tenant.id }),
        }
      );

      if (res.ok) {
        toast.success('Automação executada com sucesso!');
        // Refresh to get updated last_run
        await fetchAutomations();
      } else {
        const body = await res.text();
        toast.error(`Erro: ${body.slice(0, 100)}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao executar: ${err.message}`);
    }
  };

  return { automations, loading, toggleAutomation, updateConfig, runNow, refetch: fetchAutomations };
}
