import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MembershipWithDetails {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'master_admin' | 'admin' | 'ops' | 'mentor' | 'mentee';
  status: string;
  can_impersonate: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    phone: string | null;
  };
  tenant?: {
    name: string;
    slug: string;
  };
}

export function useMemberships(tenantFilter?: string) {
  const queryClient = useQueryClient();

  const membershipsQuery = useQuery({
    queryKey: ['all-memberships', tenantFilter],
    queryFn: async () => {
      // Fetch memberships
      let query = supabase
        .from('memberships')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantFilter) {
        query = query.eq('tenant_id', tenantFilter);
      }

      const { data: memberships, error: membershipsError } = await query;
      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        return [];
      }

      // Get unique user_ids and tenant_ids
      const userIds = [...new Set(memberships.map(m => m.user_id))];
      const tenantIds = [...new Set(memberships.map(m => m.tenant_id))];

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Fetch tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .in('id', tenantIds);

      if (tenantsError) throw tenantsError;

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const tenantMap = new Map(tenants?.map(t => [t.id, t]) || []);

      // Combine data
      return memberships.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
        tenant: tenantMap.get(m.tenant_id) || null,
      })) as MembershipWithDetails[];
    },
  });

  const updateMembershipRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: MembershipWithDetails['role'] }) => {
      const { error } = await supabase
        .from('memberships')
        .update({ role })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      toast.success('Papel atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar papel: ${error.message}`);
    },
  });

  const updateMembershipStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('memberships')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      toast.success('Status atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const toggleImpersonation = useMutation({
    mutationFn: async ({ id, canImpersonate }: { id: string; canImpersonate: boolean }) => {
      const { error } = await supabase
        .from('memberships')
        .update({ can_impersonate: canImpersonate })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      toast.success('Permissão de impersonation atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar permissão: ${error.message}`);
    },
  });

  const deleteMembership = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      toast.success('Membership excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir membership: ${error.message}`);
    },
  });

  return {
    memberships: membershipsQuery.data || [],
    isLoading: membershipsQuery.isLoading,
    error: membershipsQuery.error,
    updateMembershipRole,
    updateMembershipStatus,
    toggleImpersonation,
    deleteMembership,
  };
}
