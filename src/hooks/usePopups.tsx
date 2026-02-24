import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface TenantPopup {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  body_html: string;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  display_mode: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PopupDismissal {
  id: string;
  popup_id: string;
  membership_id: string;
  dismissed_at: string;
}

export function usePopups() {
  const { tenant, activeMembership } = useTenant();
  const queryClient = useQueryClient();

  // Fetch all popups for this tenant (staff view)
  const popupsQuery = useQuery({
    queryKey: ['tenant-popups', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_popups')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TenantPopup[];
    },
    enabled: !!tenant?.id,
  });

  // Fetch active popups for mentorado (filtered by display rules + dismissals)
  const activePopupsQuery = useQuery({
    queryKey: ['active-popups', tenant?.id, activeMembership?.id],
    queryFn: async () => {
      const now = new Date().toISOString();

      // Fetch active popups
      const { data: popups, error: popupsError } = await supabase
        .from('tenant_popups')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('is_active', true);
      if (popupsError) throw popupsError;

      // Fetch dismissals for this user
      const { data: dismissals, error: dismissalsError } = await supabase
        .from('popup_dismissals')
        .select('popup_id')
        .eq('membership_id', activeMembership!.id);
      if (dismissalsError) throw dismissalsError;

      const dismissedIds = new Set((dismissals || []).map(d => d.popup_id));

      // Filter popups
      return (popups as TenantPopup[]).filter(popup => {
        // Already dismissed
        if (dismissedIds.has(popup.id)) return false;

        // Check display_mode
        if (popup.display_mode === 'date_range') {
          if (popup.starts_at && now < popup.starts_at) return false;
          if (popup.ends_at && now > popup.ends_at) return false;
        }

        return true;
      });
    },
    enabled: !!tenant?.id && !!activeMembership?.id,
  });

  // Fetch dismissal counts per popup (for metrics)
  const dismissalCountsQuery = useQuery({
    queryKey: ['popup-dismissal-counts', tenant?.id],
    queryFn: async () => {
      const { data: popups } = await supabase
        .from('tenant_popups')
        .select('id')
        .eq('tenant_id', tenant!.id);
      if (!popups?.length) return {};

      const { data: dismissals } = await supabase
        .from('popup_dismissals')
        .select('popup_id')
        .in('popup_id', popups.map(p => p.id));

      const counts: Record<string, number> = {};
      (dismissals || []).forEach(d => {
        counts[d.popup_id] = (counts[d.popup_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!tenant?.id,
  });

  // Create popup
  const createPopup = useMutation({
    mutationFn: async (popup: Omit<TenantPopup, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('tenant_popups')
        .insert(popup)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-popups'] });
      toast.success('Popup criado com sucesso!');
    },
    onError: () => toast.error('Erro ao criar popup'),
  });

  // Update popup
  const updatePopup = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TenantPopup> & { id: string }) => {
      const { data, error } = await supabase
        .from('tenant_popups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-popups'] });
      toast.success('Popup atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar popup'),
  });

  // Delete popup
  const deletePopup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_popups')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-popups'] });
      toast.success('Popup removido!');
    },
    onError: () => toast.error('Erro ao remover popup'),
  });

  // Dismiss popup
  const dismissPopup = useMutation({
    mutationFn: async (popupId: string) => {
      const { error } = await supabase
        .from('popup_dismissals')
        .insert({
          popup_id: popupId,
          membership_id: activeMembership!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-popups'] });
    },
  });

  return {
    popups: popupsQuery.data || [],
    activePopups: activePopupsQuery.data || [],
    dismissalCounts: dismissalCountsQuery.data || {},
    isLoading: popupsQuery.isLoading,
    createPopup,
    updatePopup,
    deletePopup,
    dismissPopup,
  };
}
