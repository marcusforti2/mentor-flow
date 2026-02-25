import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  favicon_url: string | null;
  custom_domain: string | null;
  brand_attributes: Record<string, string> | null;
  status: string;
  created_at: string;
  memberships_count?: number;
}

export interface TenantFormData {
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  font_family?: string | null;
  favicon_url?: string | null;
  custom_domain?: string | null;
  brand_attributes?: Record<string, string>;
  status?: string;
}

export function useTenants() {
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['tenants-with-counts'],
    queryFn: async () => {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      const { data: counts, error: countsError } = await supabase
        .from('memberships')
        .select('tenant_id')
        .eq('status', 'active');

      if (countsError) throw countsError;

      const countMap = counts.reduce((acc, m) => {
        acc[m.tenant_id] = (acc[m.tenant_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return tenants.map(t => ({
        ...t,
        status: t.status || 'active',
        memberships_count: countMap[t.id] || 0,
      })) as Tenant[];
    },
  });

  const createTenant = useMutation({
    mutationFn: async (data: TenantFormData) => {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .insert({
          name: data.name,
          slug: data.slug,
          logo_url: data.logo_url || null,
          primary_color: data.primary_color || null,
          secondary_color: data.secondary_color || null,
          accent_color: data.accent_color || null,
          font_family: data.font_family || null,
          favicon_url: data.favicon_url || null,
          custom_domain: data.custom_domain || null,
          brand_attributes: (data.brand_attributes || {}) as unknown as Json,
          status: data.status || 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants-with-counts'] });
      toast.success('Tenant criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar tenant: ${error.message}`);
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TenantFormData> }) => {
      const updatePayload: Record<string, unknown> = { ...data };
      if (data.brand_attributes) {
        updatePayload.brand_attributes = data.brand_attributes as unknown as Json;
      }
      const { data: tenant, error } = await supabase
        .from('tenants')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants-with-counts'] });
      toast.success('Tenant atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar tenant: ${error.message}`);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('tenants')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants-with-counts'] });
      toast.success('Status atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const deleteTenant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants-with-counts'] });
      toast.success('Tenant excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir tenant: ${error.message}`);
    },
  });

  return {
    tenants: tenantsQuery.data || [],
    isLoading: tenantsQuery.isLoading,
    error: tenantsQuery.error,
    createTenant,
    updateTenant,
    toggleStatus,
    deleteTenant,
  };
}
