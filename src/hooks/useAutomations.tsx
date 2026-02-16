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

const AUTOMATION_META: Record<string, { label: string; description: string; icon: string; hasSchedule: boolean }> = {
  weekly_digest: {
    label: 'Digest Semanal',
    description: 'Envia resumo semanal por email com estatísticas e insights de IA para cada mentorado.',
    icon: 'mail',
    hasSchedule: true,
  },
  re_engage_inactive: {
    label: 'Re-engajamento Inteligente',
    description: 'Detecta mentorados inativos e envia email empático de re-engajamento.',
    icon: 'user-check',
    hasSchedule: true,
  },
  auto_qualify_lead: {
    label: 'Auto-qualificação de Leads',
    description: 'Qualifica leads automaticamente com IA ao serem criados com perfil social.',
    icon: 'target',
    hasSchedule: false,
  },
  check_badges: {
    label: 'Verificação de Badges',
    description: 'Verifica e concede medalhas automaticamente com base em pontos e atividades.',
    icon: 'award',
    hasSchedule: true,
  },
  check_alerts: {
    label: 'Alertas Inteligentes',
    description: 'Monitora métricas do tenant e gera alertas automáticos para o mentor.',
    icon: 'bell',
    hasSchedule: true,
  },
  send_prospection_tips: {
    label: 'Dicas de Prospecção',
    description: 'Envia dicas de prospecção por email para mentorados com base no perfil de negócio.',
    icon: 'lightbulb',
    hasSchedule: true,
  },
};

export function getAutomationMeta(key: string) {
  return AUTOMATION_META[key] || { label: key, description: '', icon: 'zap', hasSchedule: false };
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
