import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
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

// Hook to get current user's mentorado record
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
  const { user } = useAuth();
  const { data: mentorado } = useMentorado();
  const queryClient = useQueryClient();

  // Fetch all posts
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['community-posts', mentorado?.id],
    queryFn: async () => {
      if (!mentorado) return [];

      // Get posts
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get mentorado IDs to fetch profiles
      const mentoradoIds = [...new Set(postsData.map(p => p.mentorado_id))];
      
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

      // Get user's likes
      const { data: userLikes } = await supabase
        .from('community_likes')
        .select('post_id')
        .eq('mentorado_id', mentorado.id);

      const likedPostIds = new Set(userLikes?.map(l => l.post_id));

      // Combine data
      return postsData.map(post => {
        const userId = mentoradoToUser.get(post.mentorado_id);
        const profile = userId ? userToProfile.get(userId) : null;
        
        return {
          ...post,
          author: profile ? {
            full_name: profile.full_name || 'Anônimo',
            avatar_url: profile.avatar_url
          } : { full_name: 'Anônimo', avatar_url: null },
          has_liked: likedPostIds.has(post.id)
        };
      }) as CommunityPost[];
    },
    enabled: !!mentorado,
  });

  // Create post mutation
  const createPost = useMutation({
    mutationFn: async ({ content, tags, imageUrl }: { content: string; tags?: string[]; imageUrl?: string }) => {
      if (!mentorado) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          mentorado_id: mentorado.id,
          mentor_id: mentorado.mentor_id,
          content,
          tags: tags || [],
          image_url: imageUrl || null,
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

  // Toggle like mutation
  const toggleLike = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!mentorado) throw new Error('Não autenticado');

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', postId)
          .eq('mentorado_id', mentorado.id);
        if (error) throw error;

        // Update likes_count manually
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
        // Like
        const { error } = await supabase
          .from('community_likes')
          .insert({
            post_id: postId,
            mentorado_id: mentorado.id,
          });
        if (error) throw error;

        // Update likes_count manually
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

      // Get mentorado IDs
      const mentoradoIds = [...new Set(commentsData.map(c => c.mentorado_id))];
      
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

      return commentsData.map(comment => {
        const userId = mentoradoToUser.get(comment.mentorado_id);
        const profile = userId ? userToProfile.get(userId) : null;
        
        return {
          ...comment,
          author: profile ? {
            full_name: profile.full_name || 'Anônimo',
            avatar_url: profile.avatar_url
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

      // Update comments_count
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

      // Update comments_count
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
