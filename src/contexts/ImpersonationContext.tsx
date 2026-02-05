import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MembershipWithDetails } from '@/hooks/useMemberships';

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedMembership: MembershipWithDetails | null;
  originalMembershipId: string | null;
  startImpersonation: (target: MembershipWithDetails, adminMembershipId: string) => Promise<void>;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedMembership, setImpersonatedMembership] = useState<MembershipWithDetails | null>(null);
  const [originalMembershipId, setOriginalMembershipId] = useState<string | null>(null);
  const [logId, setLogId] = useState<string | null>(null);

  const startImpersonation = useCallback(async (
    target: MembershipWithDetails,
    adminMembershipId: string
  ) => {
    // Validate target can be impersonated
    if (!target.can_impersonate) {
      toast.error('Este usuário não tem permissão para ser impersonado');
      return;
    }

    if (target.role === 'master_admin') {
      toast.error('Não é possível impersonar um Master Admin');
      return;
    }

    try {
      // Log impersonation start
      const { data: logData, error: logError } = await supabase
        .from('impersonation_logs')
        .insert({
          admin_membership_id: adminMembershipId,
          target_membership_id: target.id,
          ip_address: null,
        })
        .select('id')
        .single();

      if (logError) {
        console.error('Error logging impersonation:', logError);
        toast.error('Erro ao iniciar impersonation');
        return;
      }

      setLogId(logData.id);
      setOriginalMembershipId(adminMembershipId);
      setImpersonatedMembership(target);
      setIsImpersonating(true);

      toast.success(`Você está visualizando como ${target.profile?.full_name || 'usuário'}`);
    } catch (error) {
      console.error('Impersonation error:', error);
      toast.error('Erro ao iniciar impersonation');
    }
  }, []);

  const stopImpersonation = useCallback(async () => {
    if (logId) {
      // Update log with end time
      await supabase
        .from('impersonation_logs')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', logId);
    }
    
    setIsImpersonating(false);
    setImpersonatedMembership(null);
    setOriginalMembershipId(null);
    setLogId(null);

    toast.success('Você voltou ao seu contexto original');
  }, [logId]);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating,
        impersonatedMembership,
        originalMembershipId,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}
