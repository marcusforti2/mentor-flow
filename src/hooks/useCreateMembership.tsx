import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateMembershipParams {
  tenant_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'mentor' | 'mentee';
  mentor_membership_id?: string; // Required for mentee when created by admin/master
}

interface CreateMembershipResult {
  success: boolean;
  membership_id: string;
  status: 'active' | 'reactivated';
  user_id: string;
  is_new_user?: boolean;
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
        throw new Error(error.message || 'Erro ao criar membership');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['all-invites'] });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      
      const statusMsg = data.status === 'reactivated' 
        ? 'Membership reativado com sucesso!' 
        : data.is_new_user 
          ? 'Usuário criado e membership ativado!' 
          : 'Membership criado com sucesso!';
      
      toast.success(statusMsg);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar membership');
    },
  });
};
