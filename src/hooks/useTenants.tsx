import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
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
  status?: string;
}

export function useTenants() {
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['tenants-with-counts'],
    queryFn: async () => {
      // Fetch tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Fetch membership counts per tenant
      const { data: counts, error: countsError } = await supabase
        .from('memberships')
        .select('tenant_id')
        .eq('status', 'active');

      if (countsError) throw countsError;

      // Count memberships per tenant
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
      const { data: tenant, error } = await supabase
        .from('tenants')
        .update(data)
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

  return {
    tenants: tenantsQuery.data || [],
    isLoading: tenantsQuery.isLoading,
    error: tenantsQuery.error,
    createTenant,
    updateTenant,
    toggleStatus,
  };
}
