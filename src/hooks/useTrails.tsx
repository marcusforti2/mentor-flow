import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { Trail, TrailModule, TrailLesson } from '@/types/trails';

export type { Trail, TrailModule, TrailLesson };

export interface TrailInput {
  id?: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_featured: boolean;
  is_published?: boolean;
  modules: {
    id?: string;
    title: string;
    description: string;
    order_index: number;
    lessons: {
      id?: string;
      title: string;
      description: string;
      duration_minutes: number;
      content_url: string;
      content_type?: string;
      text_content?: string;
      file_url?: string;
      file_name?: string;
      order_index: number;
    }[];
  }[];
}

export function useTrails() {
  const { activeMembership } = useTenant();
  const queryClient = useQueryClient();

  const { data: trails = [], isLoading, error } = useQuery({
    queryKey: ['admin-trails', activeMembership?.tenant_id],
    queryFn: async () => {
      if (!activeMembership?.tenant_id) return [];

      const { data, error } = await supabase
        .from('trails')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          is_featured,
          is_published,
          order_index,
          trail_modules (
            id,
            title,
            description,
            order_index,
            trail_lessons (
              id,
              title,
              description,
              duration_minutes,
              content_url,
              content_type,
              text_content,
              file_url,
              file_name,
              order_index
            )
          )
        `)
        .eq('tenant_id', activeMembership.tenant_id)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return (data || []).map(trail => ({
        id: trail.id,
        title: trail.title,
        description: trail.description || '',
        thumbnail_url: trail.thumbnail_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
        is_featured: trail.is_featured || false,
        is_published: trail.is_published ?? true,
        order_index: trail.order_index || 0,
        modules: (trail.trail_modules || [])
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map(mod => ({
            id: mod.id,
            title: mod.title,
            description: mod.description || '',
            order_index: mod.order_index || 0,
            lessons: (mod.trail_lessons || [])
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .map(les => ({
                id: les.id,
                title: les.title,
                description: les.description || '',
                duration_minutes: les.duration_minutes || 0,
                content_url: les.content_url || '',
                content_type: (les.content_type || 'video') as 'video' | 'text' | 'file',
                text_content: les.text_content || '',
                file_url: les.file_url || '',
                file_name: les.file_name || '',
                order_index: les.order_index || 0,
              })),
          })),
        total_lessons: (trail.trail_modules || []).reduce(
          (acc, mod) => acc + (mod.trail_lessons?.length || 0),
          0
        ),
        total_duration: (trail.trail_modules || []).reduce(
          (acc, mod) =>
            acc + (mod.trail_lessons || []).reduce((sum, les) => sum + (les.duration_minutes || 0), 0),
          0
        ),
      })) as Trail[];
    },
    enabled: !!activeMembership?.tenant_id,
  });

  const createTrail = useMutation({
    mutationFn: async (input: TrailInput) => {
      if (!activeMembership?.tenant_id || !activeMembership?.id) {
        throw new Error('Tenant não encontrado');
      }

      // 1. Create trail
      const { data: trail, error: trailError } = await supabase
        .from('trails')
        .insert([{
          title: input.title,
          description: input.description,
          thumbnail_url: input.thumbnail_url,
          is_featured: input.is_featured,
          is_published: input.is_published ?? true,
          tenant_id: activeMembership.tenant_id,
          creator_membership_id: activeMembership.id,
        }])
        .select()
        .single();

      if (trailError) throw trailError;

      // 2. Create modules and lessons
      for (const mod of input.modules) {
        const { data: module, error: moduleError } = await supabase
          .from('trail_modules')
          .insert({
            trail_id: trail.id,
            title: mod.title,
            description: mod.description,
            order_index: mod.order_index,
          })
          .select()
          .single();

        if (moduleError) throw moduleError;

        // 3. Create lessons for this module
        if (mod.lessons.length > 0) {
          const lessonsToInsert = mod.lessons.map(les => ({
            module_id: module.id,
            title: les.title,
            description: les.description,
            duration_minutes: les.duration_minutes,
            content_url: les.content_url,
            content_type: les.content_type || 'video',
            text_content: les.text_content || null,
            file_url: les.file_url || null,
            file_name: les.file_name || null,
            order_index: les.order_index,
          }));

          const { error: lessonsError } = await supabase
            .from('trail_lessons')
            .insert(lessonsToInsert);

          if (lessonsError) throw lessonsError;
        }
      }

      return trail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trails'] });
      toast.success('Trilha criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating trail:', error);
      toast.error('Erro ao criar trilha');
    },
  });

  const updateTrail = useMutation({
    mutationFn: async (input: TrailInput) => {
      if (!input.id) throw new Error('ID da trilha não informado');

      // 1. Update trail
      const { error: trailError } = await supabase
        .from('trails')
        .update({
          title: input.title,
          description: input.description,
          thumbnail_url: input.thumbnail_url,
          is_featured: input.is_featured,
          is_published: input.is_published ?? true,
        })
        .eq('id', input.id);

      if (trailError) throw trailError;

      // 2. Delete existing modules (cascades to lessons)
      const { error: deleteError } = await supabase
        .from('trail_modules')
        .delete()
        .eq('trail_id', input.id);

      if (deleteError) throw deleteError;

      // 3. Recreate modules and lessons
      for (const mod of input.modules) {
        const { data: module, error: moduleError } = await supabase
          .from('trail_modules')
          .insert({
            trail_id: input.id,
            title: mod.title,
            description: mod.description,
            order_index: mod.order_index,
          })
          .select()
          .single();

        if (moduleError) throw moduleError;

        if (mod.lessons.length > 0) {
          const lessonsToInsert = mod.lessons.map(les => ({
            module_id: module.id,
            title: les.title,
            description: les.description,
            duration_minutes: les.duration_minutes,
            content_url: les.content_url,
            content_type: les.content_type || 'video',
            text_content: les.text_content || null,
            file_url: les.file_url || null,
            file_name: les.file_name || null,
            order_index: les.order_index,
          }));

          const { error: lessonsError } = await supabase
            .from('trail_lessons')
            .insert(lessonsToInsert);

          if (lessonsError) throw lessonsError;
        }
      }

      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trails'] });
      toast.success('Trilha atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating trail:', error);
      toast.error('Erro ao atualizar trilha');
    },
  });

  const deleteTrail = useMutation({
    mutationFn: async (trailId: string) => {
      const { error } = await supabase
        .from('trails')
        .delete()
        .eq('id', trailId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trails'] });
      toast.success('Trilha excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting trail:', error);
      toast.error('Erro ao excluir trilha');
    },
  });

  return {
    trails,
    isLoading,
    error,
    createTrail,
    updateTrail,
    deleteTrail,
  };
}
