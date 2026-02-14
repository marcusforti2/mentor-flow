import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface CommunityPost {
  id: string;
  mentorado_id: string;
  mentor_id: string;
  content: string;
  image_url: string | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  tenant_id?: string | null;
  author_membership_id?: string | null;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
  has_liked?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  mentorado_id: string;
  membership_id?: string | null;
  content: string;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
}

// Legacy compat hook - still used by useCommunityChat for presence
export function useMentorado() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-mentorado', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('mentorados')
        .select('id, user_id, mentor_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching mentorado:', error);
        return null;
      }

      return data as { id: string; user_id: string; mentor_id: string };
    },
    enabled: !!user,
  });
}

export function useCommunityPosts() {
  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const queryClient = useQueryClient();

  const tenantId = activeMembership?.tenant_id;
  const membershipId = activeMembership?.id;

  // Fetch all posts by tenant_id
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['community-posts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Resolve author profiles via author_membership_id -> memberships -> profiles
      const authorMembershipIds = [...new Set(postsData.map(p => p.author_membership_id).filter(Boolean))];
      const legacyMentoradoIds = [...new Set(postsData.filter(p => !p.author_membership_id).map(p => p.mentorado_id).filter(Boolean))];

      // Fetch membership user_ids
      let membershipToUser = new Map<string, string>();
      if (authorMembershipIds.length > 0) {
        const { data: membershipsData } = await supabase
          .from('memberships')
          .select('id, user_id')
          .in('id', authorMembershipIds);
        membershipToUser = new Map(membershipsData?.map(m => [m.id, m.user_id]) || []);
      }

      // Fetch legacy mentorado user_ids (for old posts without author_membership_id)
      let mentoradoToUser = new Map<string, string>();
      if (legacyMentoradoIds.length > 0) {
        const { data: mentoradosData } = await supabase
          .from('mentorados')
          .select('id, user_id')
          .in('id', legacyMentoradoIds);
        mentoradoToUser = new Map(mentoradosData?.map(m => [m.id, m.user_id]) || []);
      }

      // Collect all user_ids and fetch profiles
      const allUserIds = [...new Set([...membershipToUser.values(), ...mentoradoToUser.values()])];
      let userToProfile = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', allUserIds);
        userToProfile = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      }

      // Get user's likes by membership_id
      let likedPostIds = new Set<string>();
      if (membershipId) {
        const { data: userLikes } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('membership_id', membershipId);
        likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
      }

      return postsData.map(post => {
        let userId: string | undefined;
        if (post.author_membership_id) {
          userId = membershipToUser.get(post.author_membership_id);
        } else if (post.mentorado_id) {
          userId = mentoradoToUser.get(post.mentorado_id);
        }
        const authorProfile = userId ? userToProfile.get(userId) : null;
        
        return {
          ...post,
          author: authorProfile ? {
            full_name: authorProfile.full_name || 'Anônimo',
            avatar_url: authorProfile.avatar_url
          } : { full_name: 'Anônimo', avatar_url: null },
          has_liked: likedPostIds.has(post.id)
        };
      }) as CommunityPost[];
    },
    enabled: !!tenantId,
  });

  // Create post mutation - uses tenant_id + membership_id only
  const createPost = useMutation({
    mutationFn: async ({ content, tags, imageUrl }: { content: string; tags?: string[]; imageUrl?: string }) => {
      if (!tenantId || !membershipId) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          content,
          tags: tags || [],
          image_url: imageUrl || null,
          tenant_id: tenantId,
          author_membership_id: membershipId,
          // Legacy fields - use membershipId as placeholder for NOT NULL constraints
          mentor_id: membershipId,
          mentorado_id: membershipId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Publicação criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      toast.error('Erro ao criar publicação');
    },
  });

  // Delete post mutation
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Publicação excluída');
    },
    onError: () => {
      toast.error('Erro ao excluir publicação');
    },
  });

  // Toggle like mutation - uses membership_id
  const toggleLike = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!membershipId) throw new Error('Não autenticado');

      if (isLiked) {
        const { error } = await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', postId)
          .eq('membership_id', membershipId);
        if (error) throw error;

        const { data: currentPost } = await supabase
          .from('community_posts')
          .select('likes_count')
          .eq('id', postId)
          .single();

        if (currentPost) {
          await supabase
            .from('community_posts')
            .update({ likes_count: Math.max(0, (currentPost.likes_count || 0) - 1) })
            .eq('id', postId);
        }
      } else {
        const { error } = await supabase
          .from('community_likes')
          .insert({
            post_id: postId,
            membership_id: membershipId,
            // Legacy field - NOT NULL constraint
            mentorado_id: membershipId,
          });
        if (error) throw error;

        const { data: currentPost } = await supabase
          .from('community_posts')
          .select('likes_count')
          .eq('id', postId)
          .single();

        if (currentPost) {
          await supabase
            .from('community_posts')
            .update({ likes_count: (currentPost.likes_count || 0) + 1 })
            .eq('id', postId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
    onError: (error) => {
      console.error('Error toggling like:', error);
    },
  });

  return {
    posts: posts || [],
    isLoading,
    error,
    createPost,
    deletePost,
    toggleLike,
  };
}

export function usePostComments(postId: string) {
  const { activeMembership } = useTenant();
  const membershipId = activeMembership?.id;
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data: commentsData, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Resolve authors: prefer membership_id, fallback to mentorado_id for old comments
      const commentMembershipIds = [...new Set(commentsData.map(c => (c as any).membership_id).filter(Boolean))];
      const legacyMentoradoIds = [...new Set(commentsData.filter(c => !(c as any).membership_id).map(c => c.mentorado_id).filter(Boolean))];

      let membershipToUser = new Map<string, string>();
      if (commentMembershipIds.length > 0) {
        const { data } = await supabase.from('memberships').select('id, user_id').in('id', commentMembershipIds);
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

      return commentsData.map(comment => {
        let userId: string | undefined;
        if ((comment as any).membership_id) {
          userId = membershipToUser.get((comment as any).membership_id);
        } else {
          userId = mentoradoToUser.get(comment.mentorado_id);
        }
        const commentProfile = userId ? userToProfile.get(userId) : null;
        
        return {
          ...comment,
          author: commentProfile ? {
            full_name: commentProfile.full_name || 'Anônimo',
            avatar_url: commentProfile.avatar_url
          } : { full_name: 'Anônimo', avatar_url: null }
        };
      }) as CommunityComment[];
    },
    enabled: !!postId,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!membershipId) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          membership_id: membershipId,
          // Legacy field - NOT NULL constraint
          mentorado_id: membershipId,
          content,
        });

      if (error) throw error;

      const { data: currentPost } = await supabase
        .from('community_posts')
        .select('comments_count')
        .eq('id', postId)
        .single();

      if (currentPost) {
        await supabase
          .from('community_posts')
          .update({ comments_count: (currentPost.comments_count || 0) + 1 })
          .eq('id', postId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
    onError: () => {
      toast.error('Erro ao adicionar comentário');
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      const { data: currentPost } = await supabase
        .from('community_posts')
        .select('comments_count')
        .eq('id', postId)
        .single();

      if (currentPost) {
        await supabase
          .from('community_posts')
          .update({ comments_count: Math.max(0, (currentPost.comments_count || 0) - 1) })
          .eq('id', postId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });

  return {
    comments: comments || [],
    isLoading,
    addComment,
    deleteComment,
  };
}
