import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface SmartAlert {
  id: string;
  tenant_id: string;
  mentor_membership_id: string;
  mentee_membership_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  expires_at: string | null;
}

export function useSmartAlerts() {
  const { activeMembership } = useTenant();
  const membershipId = activeMembership?.id;
  const tenantId = activeMembership?.tenant_id;
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['smart-alerts', tenantId],
    queryFn: async (): Promise<SmartAlert[]> => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('smart_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as SmartAlert[];
    },
    enabled: !!tenantId,
  });

  const unreadCount = alertsQuery.data?.filter(a => !a.is_read).length || 0;

  // Realtime subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`smart-alerts-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_alerts',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['smart-alerts', tenantId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('smart_alerts')
        .update({ is_read: true } as Record<string, unknown>)
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smart-alerts', tenantId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      const { error } = await supabase
        .from('smart_alerts')
        .update({ is_read: true } as Record<string, unknown>)
        .eq('tenant_id', tenantId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smart-alerts', tenantId] }),
  });

  const dismissAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('smart_alerts')
        .update({ is_dismissed: true } as Record<string, unknown>)
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smart-alerts', tenantId] }),
  });

  return {
    alerts: alertsQuery.data || [],
    isLoading: alertsQuery.isLoading,
    unreadCount,
    markAsRead: markAsRead.mutate,
    markAllRead: markAllRead.mutate,
    dismissAlert: dismissAlert.mutate,
  };
}
