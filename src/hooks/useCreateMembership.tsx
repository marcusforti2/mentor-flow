import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateMembershipParams {
  tenant_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'mentor' | 'mentee';
  mentor_membership_id?: string;
  joined_at?: string;
  business_name?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
  notes?: string;
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
      // Ensure we have a valid session before calling
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        // Try refreshing the session
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed.session?.access_token) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }
      }

      console.log('[useCreateMembership] Calling create-membership with:', {
        tenant_id: params.tenant_id,
        email: params.email,
        role: params.role,
        mentor_membership_id: params.mentor_membership_id,
      });

      const { data, error } = await supabase.functions.invoke('create-membership', {
        body: params,
      });
      
      if (error) {
        console.error('[useCreateMembership] Edge function error:', error);
        
        // Try to extract the actual error message from the response
        let errorMessage = 'Erro ao criar membership';
        try {
          // In supabase-js v2, FunctionsHttpError has context with the response
          if ('context' in error && error.context) {
            const responseBody = await (error.context as Response).json();
            if (responseBody?.error) {
              errorMessage = responseBody.error;
            }
          } else if (error.message && error.message !== 'Edge Function returned a non-2xx status code') {
            errorMessage = error.message;
          }
        } catch (parseErr) {
          console.error('[useCreateMembership] Error parsing response:', parseErr);
          if (error.message) {
            errorMessage = error.message;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      if (data?.error) {
        console.error('[useCreateMembership] Application error:', data.error);
        throw new Error(data.error);
      }
      
      console.log('[useCreateMembership] Success:', data);
      return data;
    },
    onSuccess: (data) => {
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
      console.error('[useCreateMembership] Mutation error:', error.message);
      toast.error(error.message || 'Erro ao criar membership');
    },
  });
};
