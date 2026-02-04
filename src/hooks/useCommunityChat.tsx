import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMentorado } from './useCommunityPosts';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  mentor_id: string;
  mentorado_id: string;
  content: string;
  created_at: string;
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
  const { data: mentorado } = useMentorado();
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['community-messages', mentorado?.mentor_id],
    queryFn: async () => {
      if (!mentorado) return [];

      const { data: messagesData, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('mentor_id', mentorado.mentor_id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Get mentorado IDs
      const mentoradoIds = [...new Set(messagesData.map(m => m.mentorado_id))];
      
      // Fetch mentorado user_ids
      const { data: mentoradosData } = await supabase
        .from('mentorados')
        .select('id, user_id')
        .in('id', mentoradoIds);

      const userIds = mentoradosData?.map(m => m.user_id) || [];
      
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Create lookup maps
      const mentoradoToUser = new Map(mentoradosData?.map(m => [m.id, m.user_id]));
      const userToProfile = new Map(profilesData?.map(p => [p.user_id, p]));

      return messagesData.map(message => {
        const userId = mentoradoToUser.get(message.mentorado_id);
        const msgProfile = userId ? userToProfile.get(userId) : null;
        
        return {
          ...message,
          author: msgProfile ? {
            full_name: msgProfile.full_name || 'Anônimo',
            avatar_url: msgProfile.avatar_url
          } : { full_name: 'Anônimo', avatar_url: null },
          isOwn: message.mentorado_id === mentorado.id
        };
      }) as ChatMessage[];
    },
    enabled: !!mentorado,
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!mentorado) return;

    const channelName = `community-chat-${mentorado.mentor_id}`;
    
    const newChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `mentor_id=eq.${mentorado.mentor_id}`,
        },
        async (payload) => {
          // Fetch author info for the new message
          const newMessage = payload.new as any;
          
          const { data: mentoradoData } = await supabase
            .from('mentorados')
            .select('user_id')
            .eq('id', newMessage.mentorado_id)
            .single();

          let authorInfo = { full_name: 'Anônimo', avatar_url: null };
          
          if (mentoradoData) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('user_id', mentoradoData.user_id)
              .single();
            
            if (profileData) {
              authorInfo = {
                full_name: profileData.full_name || 'Anônimo',
                avatar_url: profileData.avatar_url
              };
            }
          }

          const completeMessage: ChatMessage = {
            ...newMessage,
            author: authorInfo,
            isOwn: newMessage.mentorado_id === mentorado.id
          };

          // Update cache directly for instant updates
          queryClient.setQueryData(['community-messages', mentorado.mentor_id], (old: ChatMessage[] | undefined) => {
            if (!old) return [completeMessage];
            // Avoid duplicates
            if (old.some(m => m.id === completeMessage.id)) return old;
            return [...old, completeMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(newChannel);
    };
  }, [mentorado, queryClient]);

  // Setup presence for online users
  useEffect(() => {
    if (!mentorado || !profile) return;

    const presenceChannel = supabase
      .channel(`presence-${mentorado.mentor_id}`)
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
            mentorado_id: mentorado.id,
            full_name: profile.full_name || 'Anônimo',
            avatar_url: profile.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [mentorado, profile]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!mentorado) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('community_messages')
        .insert({
          mentor_id: mentorado.mentor_id,
          mentorado_id: mentorado.id,
          content,
        });

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
