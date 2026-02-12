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
  content: string;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Mentorado {
  id: string;
  user_id: string;
  mentor_id: string;
}

// Hook to get current user's mentorado record (legacy compat)
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

      return data as Mentorado;
    },
    enabled: !!user,
  });
}

export function useCommunityPosts() {
  const { user, profile } = useAuth();
  const { activeMembership } = useTenant();
  const { data: mentorado } = useMentorado();
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

      // Fetch legacy mentorado user_ids
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

      // Get user's likes (by membership_id or legacy mentorado_id)
      let likedPostIds = new Set<string>();
      if (mentorado?.id) {
        const { data: userLikes } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('mentorado_id', mentorado.id);
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

  // Create post mutation - uses tenant_id + membership_id
  const createPost = useMutation({
    mutationFn: async ({ content, tags, imageUrl }: { content: string; tags?: string[]; imageUrl?: string }) => {
      if (!tenantId || !membershipId) throw new Error('Não autenticado');

      const insertData: any = {
        content,
        tags: tags || [],
        image_url: imageUrl || null,
        tenant_id: tenantId,
        author_membership_id: membershipId,
        // Legacy fields - populate if available
        mentor_id: mentorado?.mentor_id || membershipId,
        mentorado_id: mentorado?.id || membershipId,
      };

      const { data, error } = await supabase
        .from('community_posts')
        .insert(insertData)
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

  // Toggle like mutation
  const toggleLike = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!mentorado) throw new Error('Não autenticado');

      if (isLiked) {
        const { error } = await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', postId)
          .eq('mentorado_id', mentorado.id);
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
            mentorado_id: mentorado.id,
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
    mentorado,
  };
}

export function usePostComments(postId: string) {
  const { data: mentorado } = useMentorado();
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

      const mentoradoIds = [...new Set(commentsData.map(c => c.mentorado_id))];
      
      const { data: mentoradosData } = await supabase
        .from('mentorados')
        .select('id, user_id')
        .in('id', mentoradoIds);

      const userIds = mentoradosData?.map(m => m.user_id) || [];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const mentoradoToUser = new Map(mentoradosData?.map(m => [m.id, m.user_id]));
      const userToProfile = new Map(profilesData?.map(p => [p.user_id, p]));

      return commentsData.map(comment => {
        const userId = mentoradoToUser.get(comment.mentorado_id);
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
      if (!mentorado) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          mentorado_id: mentorado.id,
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
    mentorado,
  };
}
