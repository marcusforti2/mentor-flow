import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Notification {
  id: string;
  membership_id: string;
  tenant_id: string;
  title: string;
  body: string | null;
  type: string;
  action_url: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useNotifications() {
  const { activeMembership } = useTenant();
  const queryClient = useQueryClient();
  const membershipId = activeMembership?.id;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', membershipId],
    queryFn: async () => {
      if (!membershipId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('membership_id', membershipId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!membershipId,
    refetchInterval: 30000, // fallback polling every 30s
  });

  // Realtime subscription
  useEffect(() => {
    if (!membershipId) return;
    const channel = supabase
      .channel(`notifications-${membershipId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `membership_id=eq.${membershipId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', membershipId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [membershipId, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', membershipId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!membershipId) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('membership_id', membershipId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', membershipId] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}
