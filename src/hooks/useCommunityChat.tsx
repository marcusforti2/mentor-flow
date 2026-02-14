import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { useMentorado } from './useCommunityPosts';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  mentor_id: string;
  mentorado_id: string;
  content: string;
  created_at: string;
  tenant_id?: string | null;
  author_membership_id?: string | null;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
  isOwn?: boolean;
}

export interface OnlineUser {
  mentorado_id: string;
  full_name: string;
  avatar_url: string | null;
}

export function useCommunityChat() {
  const { profile } = useAuth();
  const { activeMembership } = useTenant();
  // Legacy mentorado still needed for old message author resolution
  const { data: mentorado } = useMentorado();
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const tenantId = activeMembership?.tenant_id;
  const membershipId = activeMembership?.id;

  // Fetch messages by tenant_id
  const { data: messages, isLoading } = useQuery({
    queryKey: ['community-messages', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: messagesData, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Resolve authors via author_membership_id or legacy mentorado_id
      const authorMembershipIds = [...new Set(messagesData.map(m => m.author_membership_id).filter(Boolean))];
      const legacyMentoradoIds = [...new Set(messagesData.filter(m => !m.author_membership_id).map(m => m.mentorado_id).filter(Boolean))];

      let membershipToUser = new Map<string, string>();
      if (authorMembershipIds.length > 0) {
        const { data } = await supabase.from('memberships').select('id, user_id').in('id', authorMembershipIds);
        membershipToUser = new Map(data?.map(m => [m.id, m.user_id]) || []);
      }

      let mentoradoToUser = new Map<string, string>();
      if (legacyMentoradoIds.length > 0) {
        const { data } = await supabase.from('mentorados').select('id, user_id').in('id', legacyMentoradoIds);
        mentoradoToUser = new Map(data?.map(m => [m.id, m.user_id]) || []);
      }

      const allUserIds = [...new Set([...membershipToUser.values(), ...mentoradoToUser.values()])];
      let userToProfile = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (allUserIds.length > 0) {
        const { data } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', allUserIds);
        userToProfile = new Map(data?.map(p => [p.user_id, p]) || []);
      }

      return messagesData.map(message => {
        let userId: string | undefined;
        if (message.author_membership_id) {
          userId = membershipToUser.get(message.author_membership_id);
        } else if (message.mentorado_id) {
          userId = mentoradoToUser.get(message.mentorado_id);
        }
        const msgProfile = userId ? userToProfile.get(userId) : null;
        
        const isOwn = message.author_membership_id === membershipId || 
                      (mentorado && message.mentorado_id === mentorado.id);

        return {
          ...message,
          author: msgProfile ? {
            full_name: msgProfile.full_name || 'Anônimo',
            avatar_url: msgProfile.avatar_url
          } : { full_name: 'Anônimo', avatar_url: null },
          isOwn,
        };
      }) as ChatMessage[];
    },
    enabled: !!tenantId,
  });

  // Realtime subscription by tenant_id
  useEffect(() => {
    if (!tenantId) return;

    const channelName = `community-chat-tenant-${tenantId}`;
    
    const newChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Invalidate to refetch with author info
          queryClient.invalidateQueries({ queryKey: ['community-messages', tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(newChannel);
    };
  }, [tenantId, queryClient]);

  // Presence for online users
  useEffect(() => {
    if (!tenantId || !profile || !membershipId) return;

    const presenceChannel = supabase
      .channel(`presence-tenant-${tenantId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (!users.some(u => u.mentorado_id === presence.mentorado_id)) {
              users.push({
                mentorado_id: presence.mentorado_id,
                full_name: presence.full_name,
                avatar_url: presence.avatar_url,
              });
            }
          });
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            mentorado_id: membershipId,
            full_name: profile.full_name || 'Anônimo',
            avatar_url: profile.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [tenantId, profile, membershipId]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!tenantId || !membershipId) throw new Error('Não autenticado');

      const insertData: any = {
        content,
        tenant_id: tenantId,
        author_membership_id: membershipId,
        // Legacy fields - use membershipId as placeholder for NOT NULL constraints
        mentor_id: membershipId,
        mentorado_id: membershipId,
      };

      const { error } = await supabase
        .from('community_messages')
        .insert(insertData);

      if (error) throw error;
    },
    onError: () => {
      toast.error('Erro ao enviar mensagem');
    },
  });

  // Delete message mutation
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('community_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-messages'] });
    },
  });

  return {
    messages: messages || [],
    isLoading,
    sendMessage,
    deleteMessage,
    onlineUsers,
    mentorado,
  };
}
