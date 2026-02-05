import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InviteWithDetails {
  id: string;
  email: string;
  role: 'master_admin' | 'admin' | 'ops' | 'mentor' | 'mentee';
  status: string;
  tenant_id: string;
  metadata: {
    full_name?: string | null;
    phone?: string | null;
  } | null;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  // Joined data
  tenant?: {
    name: string;
    slug: string;
  };
}

export function useInvites(tenantFilter?: string) {
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: ['all-invites', tenantFilter],
    queryFn: async () => {
      let query = supabase
        .from('invites')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (tenantFilter) {
        query = query.eq('tenant_id', tenantFilter);
      }

      const { data: invites, error: invitesError } = await query;
      if (invitesError) throw invitesError;

      if (!invites || invites.length === 0) {
        return [];
      }

      // Get unique tenant_ids
      const tenantIds = [...new Set(invites.map(i => i.tenant_id))];

      // Fetch tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .in('id', tenantIds);

      if (tenantsError) throw tenantsError;

      // Create lookup map
      const tenantMap = new Map(tenants?.map(t => [t.id, t]) || []);

      // Combine data
      return invites.map(i => ({
        ...i,
        tenant: tenantMap.get(i.tenant_id) || null,
      })) as InviteWithDetails[];
    },
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invites')
        .update({ 
          status: 'revoked',
          revoked_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invites'] });
      toast.success('Convite revogado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao revogar convite: ${error.message}`);
    },
  });

  const resendInvite = useMutation({
    mutationFn: async (id: string) => {
      // Extend expiration
      const { error } = await supabase
        .from('invites')
        .update({ 
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invites'] });
      toast.success('Convite renovado por mais 30 dias!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao renovar convite: ${error.message}`);
    },
  });

  return {
    invites: invitesQuery.data || [],
    isLoading: invitesQuery.isLoading,
    error: invitesQuery.error,
    revokeInvite,
    resendInvite,
  };
}
