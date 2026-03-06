import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TenantDomain {
  id: string;
  tenant_id: string;
  domain: string;
  status: string;
  dns_verified: boolean;
  ssl_active: boolean;
  is_primary: boolean;
  verification_token: string;
  last_check_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenantDomains(tenantId?: string | null) {
  const queryClient = useQueryClient();
  const qk = ['tenant-domains', tenantId];

  const domainsQuery = useQuery({
    queryKey: qk,
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_domains')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TenantDomain[];
    },
  });

  const addDomain = useMutation({
    mutationFn: async ({ domain, isPrimary }: { domain: string; isPrimary?: boolean }) => {
      const clean = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
      const { data, error } = await supabase
        .from('tenant_domains')
        .insert({ tenant_id: tenantId!, domain: clean, is_primary: isPrimary || false })
        .select()
        .single();
      if (error) throw error;
      return data as TenantDomain;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Domínio adicionado!');
    },
    onError: (e: Error) => {
      if (e.message.includes('duplicate')) toast.error('Domínio já cadastrado');
      else toast.error(`Erro: ${e.message}`);
    },
  });

  const removeDomain = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tenant_domains').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Domínio removido');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPrimary = useMutation({
    mutationFn: async (id: string) => {
      // Unset all primary for this tenant, then set the selected one
      await supabase.from('tenant_domains').update({ is_primary: false }).eq('tenant_id', tenantId!);
      const { error } = await supabase.from('tenant_domains').update({ is_primary: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Domínio primário definido');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyDomain = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { domain_id: domainId, action: 'verify' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk });
      if (data?.status === 'active') toast.success('DNS verificado com sucesso! Domínio ativo.');
      else if (data?.dns_verified) toast.info('A record OK. Aguardando verificação TXT...');
      else toast.warning('DNS ainda não aponta para o IP correto.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    domains: domainsQuery.data || [],
    isLoading: domainsQuery.isLoading,
    addDomain,
    removeDomain,
    setPrimary,
    verifyDomain,
  };
}
