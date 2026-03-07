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

  const queryKey = ['admin-trails', activeMembership?.tenant_id];

  const { data: trails = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!activeMembership?.tenant_id) return [];

      const { data, error } = await supabase
        .from('trails')
        .select(`
          id, title, description, thumbnail_url, is_featured, is_published, order_index,
          trail_modules (
            id, title, description, order_index, drive_folder_id,
            trail_lessons (
              id, title, description, duration_minutes, content_url, content_type,
              text_content, file_url, file_name, order_index, drive_folder_id
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
        total_lessons: (trail.trail_modules || []).reduce((acc, mod) => acc + (mod.trail_lessons?.length || 0), 0),
        total_duration: (trail.trail_modules || []).reduce(
          (acc, mod) => acc + (mod.trail_lessons || []).reduce((sum, les) => sum + (les.duration_minutes || 0), 0), 0
        ),
      })) as Trail[];
    },
    enabled: !!activeMembership?.tenant_id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  // ── Batch create (single insert per table) ──
  const createTrail = useMutation({
    mutationFn: async (input: TrailInput) => {
      if (!activeMembership?.tenant_id || !activeMembership?.id) throw new Error('Tenant não encontrado');

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

      // 2. Batch insert all modules at once
      if (input.modules.length > 0) {
        const modulesInsert = input.modules.map(mod => ({
          trail_id: trail.id,
          title: mod.title,
          description: mod.description,
          order_index: mod.order_index,
        }));
        const { data: modules, error: modError } = await supabase
          .from('trail_modules')
          .insert(modulesInsert)
          .select('id, order_index');
        if (modError) throw modError;

        // 3. Match modules by order_index, batch insert all lessons
        const allLessons: any[] = [];
        for (const inputMod of input.modules) {
          const dbMod = modules?.find(m => m.order_index === inputMod.order_index);
          if (!dbMod) continue;
          for (const les of inputMod.lessons) {
            allLessons.push({
              module_id: dbMod.id,
              title: les.title,
              description: les.description,
              duration_minutes: les.duration_minutes,
              content_url: les.content_url,
              content_type: les.content_type || 'video',
              text_content: les.text_content || null,
              file_url: les.file_url || null,
              file_name: les.file_name || null,
              order_index: les.order_index,
            });
          }
        }
        if (allLessons.length > 0) {
          const { error: lesError } = await supabase.from('trail_lessons').insert(allLessons);
          if (lesError) throw lesError;
        }
      }

      return trail;
    },
    onSuccess: () => { invalidate(); toast.success('Trilha criada com sucesso!'); },
    onError: (error) => { console.error('Error creating trail:', error); toast.error('Erro ao criar trilha'); },
  });

  // ── Smart update (preserves drive_folder_ids) ──
  const updateTrail = useMutation({
    mutationFn: async (input: TrailInput) => {
      if (!input.id) throw new Error('ID da trilha não informado');

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

      // Get existing to diff
      const { data: existingModules } = await supabase
        .from('trail_modules')
        .select('id, trail_lessons(id)')
        .eq('trail_id', input.id);

      const existingModuleIds = (existingModules || []).map(m => m.id);
      const inputModuleIds = input.modules.filter(m => m.id).map(m => m.id!);
      const modulesToDelete = existingModuleIds.filter(id => !inputModuleIds.includes(id));

      if (modulesToDelete.length > 0) {
        await supabase.from('trail_modules').delete().in('id', modulesToDelete);
      }

      for (const mod of input.modules) {
        let moduleId: string;
        if (mod.id && existingModuleIds.includes(mod.id)) {
          await supabase.from('trail_modules').update({
            title: mod.title, description: mod.description, order_index: mod.order_index,
          }).eq('id', mod.id);
          moduleId = mod.id;
        } else {
          const { data: newMod, error } = await supabase.from('trail_modules')
            .insert({ trail_id: input.id, title: mod.title, description: mod.description, order_index: mod.order_index })
            .select().single();
          if (error) throw error;
          moduleId = newMod.id;
        }

        const { data: existingLessons } = await supabase.from('trail_lessons').select('id').eq('module_id', moduleId);
        const existingLessonIds = (existingLessons || []).map(l => l.id);
        const inputLessonIds = mod.lessons.filter(l => l.id).map(l => l.id!);
        const lessonsToDelete = existingLessonIds.filter(id => !inputLessonIds.includes(id));

        if (lessonsToDelete.length > 0) {
          await supabase.from('trail_lessons').delete().in('id', lessonsToDelete);
        }

        // Batch new lessons
        const newLessons = mod.lessons.filter(l => !l.id || !existingLessonIds.includes(l.id));
        const existingLessonsToUpdate = mod.lessons.filter(l => l.id && existingLessonIds.includes(l.id));

        if (newLessons.length > 0) {
          await supabase.from('trail_lessons').insert(newLessons.map(les => ({
            module_id: moduleId, title: les.title, description: les.description,
            duration_minutes: les.duration_minutes, content_url: les.content_url,
            content_type: les.content_type || 'video', text_content: les.text_content || null,
            file_url: les.file_url || null, file_name: les.file_name || null, order_index: les.order_index,
          })));
        }

        // Update existing in parallel
        await Promise.all(existingLessonsToUpdate.map(les =>
          supabase.from('trail_lessons').update({
            title: les.title, description: les.description, duration_minutes: les.duration_minutes,
            content_url: les.content_url, content_type: les.content_type || 'video',
            text_content: les.text_content || null, file_url: les.file_url || null,
            file_name: les.file_name || null, order_index: les.order_index,
          }).eq('id', les.id!)
        ));
      }

      return input;
    },
    onSuccess: () => { invalidate(); toast.success('Trilha atualizada com sucesso!'); },
    onError: (error) => { console.error('Error updating trail:', error); toast.error('Erro ao atualizar trilha'); },
  });

  // ── Duplicate trail ──
  const duplicateTrail = useMutation({
    mutationFn: async (trailId: string) => {
      const trail = trails.find(t => t.id === trailId);
      if (!trail) throw new Error('Trilha não encontrada');
      if (!activeMembership?.tenant_id || !activeMembership?.id) throw new Error('Tenant não encontrado');

      // 1. Create trail copy
      const { data: newTrail, error: trailError } = await supabase
        .from('trails')
        .insert([{
          title: `${trail.title} (cópia)`,
          description: trail.description,
          thumbnail_url: trail.thumbnail_url,
          is_featured: false,
          is_published: false,
          tenant_id: activeMembership.tenant_id,
          creator_membership_id: activeMembership.id,
        }])
        .select()
        .single();
      if (trailError) throw trailError;

      // 2. Batch insert modules
      if (trail.modules.length > 0) {
        const modulesInsert = trail.modules.map(mod => ({
          trail_id: newTrail.id,
          title: mod.title,
          description: mod.description,
          order_index: mod.order_index,
        }));
        const { data: newModules, error: modError } = await supabase
          .from('trail_modules')
          .insert(modulesInsert)
          .select('id, order_index');
        if (modError) throw modError;

        // 3. Batch insert all lessons
        const allLessons: any[] = [];
        for (const origMod of trail.modules) {
          const newMod = newModules?.find(m => m.order_index === origMod.order_index);
          if (!newMod) continue;
          for (const les of origMod.lessons) {
            allLessons.push({
              module_id: newMod.id,
              title: les.title,
              description: les.description,
              duration_minutes: les.duration_minutes,
              content_url: les.content_url,
              content_type: les.content_type || 'video',
              text_content: les.text_content || null,
              file_url: les.file_url || null,
              file_name: les.file_name || null,
              order_index: les.order_index,
            });
          }
        }
        if (allLessons.length > 0) {
          const { error: lesError } = await supabase.from('trail_lessons').insert(allLessons);
          if (lesError) throw lesError;
        }
      }

      return newTrail;
    },
    onSuccess: () => { invalidate(); toast.success('Trilha duplicada com sucesso! 🎉'); },
    onError: (error) => { console.error('Error duplicating trail:', error); toast.error('Erro ao duplicar trilha'); },
  });

  const deleteTrail = useMutation({
    mutationFn: async (trailId: string) => {
      const { error } = await supabase.from('trails').delete().eq('id', trailId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Trilha excluída com sucesso!'); },
    onError: (error) => { console.error('Error deleting trail:', error); toast.error('Erro ao excluir trilha'); },
  });

  return { trails, isLoading, error, createTrail, updateTrail, deleteTrail, duplicateTrail, invalidate };
}