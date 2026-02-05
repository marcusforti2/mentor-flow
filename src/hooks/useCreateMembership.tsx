import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateMembershipParams {
  tenant_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'mentor' | 'mentee' | 'admin' | 'ops';
}

interface CreateMembershipResult {
  success: boolean;
  invite: {
    id: string;
    email: string;
    role: string;
    full_name: string | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  login_url: string;
}

export const useCreateMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateMembershipParams): Promise<CreateMembershipResult> => {
      const { data, error } = await supabase.functions.invoke('create-membership', {
        body: params,
      });
      
      if (error) {
        console.error('create-membership error:', error);
        throw new Error(error.message || 'Erro ao criar convite');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['all-invites'] });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success(`Convite criado para ${data.invite.email}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar convite');
    },
  });
};
