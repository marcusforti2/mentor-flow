import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandingProposal {
  id: string;
  tenant_id: string;
  status: 'draft' | 'approved' | 'rejected';
  uploaded_assets: string[];
  brand_concept: string | null;
  brand_attributes: any;
  color_palette: any;
  system_colors: any;
  suggested_name: string | null;
  suggested_logo_url: string | null;
  typography: any;
  ai_analysis: string | null;
  generated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenantBranding(tenantId: string | null) {
  const queryClient = useQueryClient();

  const brandingQuery = useQuery({
    queryKey: ['tenant-branding', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('tenant_branding' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as BrandingProposal | null;
    },
    enabled: !!tenantId,
  });

  const uploadAssets = async (files: File[], tenantId: string) => {
    const urls: string[] = [];
    for (const file of files) {
      const path = `${tenantId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('branding-assets')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('branding-assets')
        .getPublicUrl(path);
      
      // Since bucket is private, we need signed URLs
      const { data: signedData } = await supabase.storage
        .from('branding-assets')
        .createSignedUrl(path, 3600); // 1h

      urls.push(signedData?.signedUrl || urlData.publicUrl);
    }
    return urls;
  };

  const analyzebranding = useMutation({
    mutationFn: async ({ tenantId, files, membershipId }: { tenantId: string; files: File[]; membershipId?: string }) => {
      toast.info('Enviando assets...');
      const assetUrls = await uploadAssets(files, tenantId);

      toast.info('Analisando branding com IA...');
      const { data, error } = await supabase.functions.invoke('analyze-branding', {
        body: {
          tenant_id: tenantId,
          asset_urls: assetUrls,
          membership_id: membershipId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.branding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding', tenantId] });
      toast.success('Proposta de branding gerada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro na análise: ${error.message}`);
    },
  });

  const approveBranding = useMutation({
    mutationFn: async ({ brandingId, membershipId }: { brandingId: string; membershipId: string }) => {
      // Update branding status
      const { data: branding, error: brandingError } = await supabase
        .from('tenant_branding' as any)
        .update({
          status: 'approved',
          approved_by: membershipId,
          approved_at: new Date().toISOString(),
        } as any)
        .eq('id', brandingId)
        .select()
        .single();

      if (brandingError) throw brandingError;

      const b = branding as unknown as BrandingProposal;

      // Apply to tenant
      const tenantUpdate: any = {};
      if (b.suggested_name) tenantUpdate.name = b.suggested_name;
      if (b.color_palette?.primary) tenantUpdate.primary_color = b.color_palette.primary;
      if (b.color_palette?.secondary) tenantUpdate.secondary_color = b.color_palette.secondary;
      if (b.color_palette?.accent) tenantUpdate.accent_color = b.color_palette.accent;
      if (b.typography?.display_font) tenantUpdate.font_family = b.typography.display_font;
      if (b.brand_attributes) tenantUpdate.brand_attributes = b.brand_attributes;

      const { error: tenantError } = await supabase
        .from('tenants')
        .update(tenantUpdate)
        .eq('id', b.tenant_id);

      if (tenantError) throw tenantError;

      return branding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants-with-counts'] });
      toast.success('Branding aprovado e aplicado ao tenant!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });

  const rejectBranding = useMutation({
    mutationFn: async (brandingId: string) => {
      const { error } = await supabase
        .from('tenant_branding' as any)
        .update({ status: 'rejected' } as any)
        .eq('id', brandingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding', tenantId] });
      toast.success('Proposta rejeitada. Envie novos assets para gerar outra.');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    branding: brandingQuery.data,
    isLoading: brandingQuery.isLoading,
    analyzebranding,
    approveBranding,
    rejectBranding,
  };
}
