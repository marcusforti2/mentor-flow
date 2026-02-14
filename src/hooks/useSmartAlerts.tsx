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
    queryKey: ['smart-alerts', membershipId],
    queryFn: async (): Promise<SmartAlert[]> => {
      if (!membershipId) throw new Error('No membership');

      const { data, error } = await supabase
        .from('smart_alerts')
        .select('*')
        .eq('mentor_membership_id', membershipId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as SmartAlert[];
    },
    enabled: !!membershipId,
  });

  const unreadCount = alertsQuery.data?.filter(a => !a.is_read).length || 0;

  // Realtime subscription
  useEffect(() => {
    if (!membershipId) return;

    const channel = supabase
      .channel('smart-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_alerts',
          filter: `mentor_membership_id=eq.${membershipId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['smart-alerts', membershipId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [membershipId, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('smart_alerts')
        .update({ is_read: true } as Record<string, unknown>)
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smart-alerts', membershipId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!membershipId) return;
      const { error } = await supabase
        .from('smart_alerts')
        .update({ is_read: true } as Record<string, unknown>)
        .eq('mentor_membership_id', membershipId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smart-alerts', membershipId] }),
  });

  const dismissAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('smart_alerts')
        .update({ is_dismissed: true } as Record<string, unknown>)
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smart-alerts', membershipId] }),
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
