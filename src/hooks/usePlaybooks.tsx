import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface PlaybookFolder {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  cover_position: string;
  icon: string;
  is_pinned: boolean;
  position: number;
  created_by_membership_id: string;
  created_at: string;
  updated_at: string;
}

export interface Playbook {
  id: string;
  tenant_id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  cover_position: string;
  is_pinned: boolean;
  content: any;
  visibility: 'mentor_only' | 'all_mentees' | 'specific_mentees' | 'public';
  public_slug: string | null;
  position: number;
  tags: string[];
  created_by_membership_id: string;
  created_at: string;
  updated_at: string;
  // joined
  pages_count?: number;
  folder_name?: string;
}

export interface PlaybookPage {
  id: string;
  playbook_id: string;
  tenant_id: string;
  title: string;
  content: any;
  position: number;
  created_at: string;
  updated_at: string;
}

export function usePlaybookFolders() {
  const { activeMembership } = useTenant();
  const tenantId = activeMembership?.tenant_id;

  return useQuery({
    queryKey: ['playbook-folders', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('playbook_folders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as PlaybookFolder[];
    },
    enabled: !!tenantId,
  });
}

export function usePlaybooks(folderId?: string | null) {
  const { activeMembership } = useTenant();
  const tenantId = activeMembership?.tenant_id;

  return useQuery({
    queryKey: ['playbooks', tenantId, folderId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('playbooks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('position', { ascending: true });

      if (folderId === 'none') {
        query = query.is('folder_id', null);
      } else if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get folder names map
      const { data: foldersData } = await supabase
        .from('playbook_folders')
        .select('id, name')
        .eq('tenant_id', tenantId);
      const folderMap: Record<string, string> = {};
      (foldersData || []).forEach(f => { folderMap[f.id] = f.name; });

      // Get page counts
      const playbookIds = (data || []).map(p => p.id);
      let pageCounts: Record<string, number> = {};
      
      if (playbookIds.length > 0) {
        const { data: pages } = await supabase
          .from('playbook_pages')
          .select('playbook_id')
          .in('playbook_id', playbookIds);
        
        if (pages) {
          pages.forEach(p => {
            pageCounts[p.playbook_id] = (pageCounts[p.playbook_id] || 0) + 1;
          });
        }
      }

      return (data || []).map(p => ({
        ...p,
        tags: p.tags || [],
        pages_count: pageCounts[p.id] || 0,
        folder_name: p.folder_id ? folderMap[p.folder_id] || null : null,
      })) as Playbook[];
    },
    enabled: !!tenantId,
  });
}

export function usePlaybookPages(playbookId: string | null) {
  return useQuery({
    queryKey: ['playbook-pages', playbookId],
    queryFn: async () => {
      if (!playbookId) return [];
      const { data, error } = await supabase
        .from('playbook_pages')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as PlaybookPage[];
    },
    enabled: !!playbookId,
  });
}

export function usePlaybookMutations() {
  const { activeMembership } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeMembership?.tenant_id;
  const membershipId = activeMembership?.id;

  const createFolder = useMutation({
    mutationFn: async (data: { name: string; description?: string; cover_image_url?: string | null; cover_position?: string; icon?: string }) => {
      if (!tenantId || !membershipId) throw new Error('Sem tenant/membership');
      const { data: result, error } = await supabase
        .from('playbook_folders')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description || null,
          cover_image_url: data.cover_image_url || null,
          cover_position: data.cover_position || 'center',
          icon: data.icon || '📁',
          created_by_membership_id: membershipId,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-folders'] });
      toast.success('Pasta criada!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar pasta'),
  });

  const updateFolder = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; cover_image_url?: string | null; cover_position?: string; icon?: string }) => {
      const { error } = await supabase
        .from('playbook_folders')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-folders'] });
      toast.success('Pasta atualizada!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar pasta'),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('playbook_folders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-folders'] });
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success('Pasta excluída!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao excluir pasta'),
  });

  const createPlaybook = useMutation({
    mutationFn: async (data: { title: string; description?: string; folder_id?: string | null; visibility?: string }) => {
      if (!tenantId || !membershipId) throw new Error('Sem tenant/membership');
      const { data: result, error } = await supabase
        .from('playbooks')
        .insert({
          tenant_id: tenantId,
          title: data.title,
          description: data.description || null,
          folder_id: data.folder_id || null,
          visibility: data.visibility || 'mentor_only',
          created_by_membership_id: membershipId,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success('Playbook criado!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar playbook'),
  });

  const updatePlaybook = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; folder_id?: string | null; visibility?: string; content?: any; cover_image_url?: string | null; cover_position?: string; tags?: string[] }) => {
      const { error } = await supabase
        .from('playbooks')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar playbook'),
  });

  const deletePlaybook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('playbooks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success('Playbook excluído!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao excluir playbook'),
  });
  const togglePinFolder = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from('playbook_folders')
        .update({ is_pinned })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-folders'] });
      toast.success('Atualizado!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao fixar'),
  });

  const togglePinPlaybook = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from('playbooks')
        .update({ is_pinned })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success('Atualizado!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao fixar'),
  });

  const duplicatePlaybook = useMutation({
    mutationFn: async (playbookId: string) => {
      if (!tenantId || !membershipId) throw new Error('Sem tenant/membership');
      // 1. Fetch original playbook
      const { data: original, error: fetchErr } = await supabase
        .from('playbooks')
        .select('*')
        .eq('id', playbookId)
        .single();
      if (fetchErr || !original) throw fetchErr || new Error('Playbook não encontrado');

      // 2. Create copy
      const { data: copy, error: copyErr } = await supabase
        .from('playbooks')
        .insert({
          tenant_id: tenantId,
          folder_id: original.folder_id,
          title: `${original.title} (cópia)`,
          description: original.description,
          content: original.content,
          cover_image_url: original.cover_image_url,
          cover_position: original.cover_position,
          visibility: original.visibility,
          tags: original.tags || [],
          created_by_membership_id: membershipId,
        })
        .select()
        .single();
      if (copyErr || !copy) throw copyErr || new Error('Erro ao duplicar');

      // 3. Copy pages
      const { data: pages } = await supabase
        .from('playbook_pages')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('position');
      if (pages && pages.length > 0) {
        const newPages = pages.map(p => ({
          playbook_id: copy.id,
          tenant_id: tenantId,
          title: p.title,
          content: p.content,
          position: p.position,
        }));
        await supabase.from('playbook_pages').insert(newPages);
      }
      return copy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success('Playbook duplicado!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao duplicar'),
  });

  const trackPlaybookView = useMutation({
    mutationFn: async (playbookId: string) => {

      if (!membershipId || !tenantId) return;
      const { error } = await supabase
        .from('playbook_views')
        .upsert(
          { membership_id: membershipId, playbook_id: playbookId, tenant_id: tenantId, viewed_at: new Date().toISOString() },
          { onConflict: 'membership_id,playbook_id' }
        );
      if (error) console.error('Track view error:', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-recent-views'] });
    },
  });

  const reorderFolders = useMutation({
    mutationFn: async (items: { id: string; position: number }[]) => {
      for (const item of items) {
        await supabase.from('playbook_folders').update({ position: item.position }).eq('id', item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-folders'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao reordenar'),
  });

  const reorderPlaybooks = useMutation({
    mutationFn: async (items: { id: string; position: number }[]) => {
      for (const item of items) {
        await supabase.from('playbooks').update({ position: item.position }).eq('id', item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao reordenar'),
  });

  return { createFolder, updateFolder, deleteFolder, createPlaybook, updatePlaybook, deletePlaybook, togglePinFolder, togglePinPlaybook, duplicatePlaybook, trackPlaybookView, reorderFolders, reorderPlaybooks };
}

export function useRecentPlaybooks(limit = 5) {
  const { activeMembership } = useTenant();
  const tenantId = activeMembership?.tenant_id;
  const membershipId = activeMembership?.id;

  return useQuery({
    queryKey: ['playbook-recent-views', tenantId, membershipId],
    queryFn: async () => {
      if (!tenantId || !membershipId) return [];
      const { data, error } = await supabase
        .from('playbook_views')
        .select('playbook_id, viewed_at')
        .eq('membership_id', membershipId)
        .eq('tenant_id', tenantId)
        .order('viewed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const ids = data.map(d => d.playbook_id);
      const { data: pbs, error: pbErr } = await supabase
        .from('playbooks')
        .select('*')
        .in('id', ids);
      if (pbErr) throw pbErr;

      // Sort by view order
      const orderMap = new Map(data.map((d, i) => [d.playbook_id, i]));
      return (pbs || []).sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99)) as Playbook[];
    },
    enabled: !!tenantId && !!membershipId,
  });
}
