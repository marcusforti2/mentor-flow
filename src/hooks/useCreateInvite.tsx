import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateInviteParams {
  tenant_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: 'mentor' | 'mentee';
}

interface CreateInviteResult {
  success: boolean;
  invite_id: string;
  status: 'pending';
  email_sent: boolean;
  expires_at: string;
}

export const useCreateInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateInviteParams): Promise<CreateInviteResult> => {
      const { data, error } = await supabase.functions.invoke('create-invite', {
        body: params,
      });
      
      if (error) {
        console.error('create-invite error:', error);
        throw new Error(error.message || 'Erro ao criar convite');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['all-invites'] });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      
      const emailMsg = data.email_sent 
        ? 'Email de convite enviado!' 
        : 'Convite criado (email não enviado)';
      
      toast.success(emailMsg);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar convite');
    },
  });
};
