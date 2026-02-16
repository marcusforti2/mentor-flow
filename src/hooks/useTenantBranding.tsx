import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';

// Strip hsl() wrapper if present: "hsl(220 15% 10%)" -> "220 15% 10%"
const stripHsl = (val: string): string => {
  if (!val || typeof val !== 'string') return val;
  const m = val.match(/^hsl\(([^)]+)\)$/i);
  return m ? m[1].trim() : val.trim();
};

export interface BrandingProposal {
  id: string;
  tenant_id: string;
  status: 'draft' | 'approved' | 'rejected';
  theme_mode: 'dark' | 'light';
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
  const { refreshTenant } = useTenant();

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

  const uploadAssets = async (files: File[], tid: string) => {
    const urls: string[] = [];
    for (const file of files) {
      const path = `${tid}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('branding-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signedData } = await supabase.storage.from('branding-assets').createSignedUrl(path, 3600);
      urls.push(signedData?.signedUrl || '');
    }
    return urls;
  };

  const analyzebranding = useMutation({
    mutationFn: async ({ tenantId, files, membershipId, textPrompt }: { tenantId: string; files: File[]; membershipId?: string; textPrompt?: string }) => {
      let assetUrls: string[] = [];
      
      if (files.length > 0) {
        toast.info('Enviando assets...');
        assetUrls = await uploadAssets(files, tenantId);
      }

      toast.info('Analisando branding com IA...');
      const { data, error } = await supabase.functions.invoke('analyze-branding', {
        body: {
          tenant_id: tenantId,
          asset_urls: assetUrls,
          membership_id: membershipId,
          text_prompt: textPrompt,
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

  const saveManualBranding = useMutation({
    mutationFn: async (proposal: any) => {
      const { data, error } = await supabase
        .from('tenant_branding' as any)
        .upsert(proposal, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;

      // Also sync key fields directly to tenants table so changes are visible immediately
      const tid = proposal.tenant_id;
      if (tid) {
        const tenantUpdate: any = {};
        if (proposal.suggested_name) tenantUpdate.name = proposal.suggested_name;
        if (proposal.color_palette?.primary) tenantUpdate.primary_color = proposal.color_palette.primary;
        if (proposal.color_palette?.secondary) tenantUpdate.secondary_color = proposal.color_palette.secondary;
        if (proposal.color_palette?.accent) tenantUpdate.accent_color = proposal.color_palette.accent;
        if (proposal.typography?.display_font) tenantUpdate.font_family = proposal.typography.display_font;
        if (proposal.suggested_logo_url) tenantUpdate.logo_url = proposal.suggested_logo_url;

        const uiTokens: Record<string, string> = {};
        if (proposal.color_palette?.background) uiTokens.background = proposal.color_palette.background;
        if (proposal.color_palette?.foreground) uiTokens.foreground = proposal.color_palette.foreground;
        if (proposal.system_colors?.card) uiTokens.card = stripHsl(proposal.system_colors.card);
        if (proposal.system_colors?.card_foreground) uiTokens.card_foreground = stripHsl(proposal.system_colors.card_foreground);
        if (proposal.system_colors?.muted_foreground) uiTokens.muted_foreground = stripHsl(proposal.system_colors.muted_foreground);
        if (proposal.system_colors?.border) uiTokens.border = stripHsl(proposal.system_colors.border);
        if (Object.keys(uiTokens).length > 0) tenantUpdate.brand_attributes = uiTokens;

        if (Object.keys(tenantUpdate).length > 0) {
          await supabase.from('tenants').update(tenantUpdate).eq('id', tid);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants-with-counts'] });
      refreshTenant();
      toast.success('Branding salvo e aplicado ao tenant!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const approveBranding = useMutation({
    mutationFn: async ({ brandingId, membershipId }: { brandingId: string; membershipId: string }) => {
      const { data: branding, error: brandingError } = await supabase
        .from('tenant_branding' as any)
        .update({ status: 'approved', approved_by: membershipId, approved_at: new Date().toISOString() } as any)
        .eq('id', brandingId)
        .select()
        .single();

      if (brandingError) throw brandingError;
      const b = branding as unknown as BrandingProposal;

      const tenantUpdate: any = {};
      if (b.suggested_name) tenantUpdate.name = b.suggested_name;
      if (b.color_palette?.primary) tenantUpdate.primary_color = b.color_palette.primary;
      if (b.color_palette?.secondary) tenantUpdate.secondary_color = b.color_palette.secondary;
      if (b.color_palette?.accent) tenantUpdate.accent_color = b.color_palette.accent;
      if (b.typography?.display_font) tenantUpdate.font_family = b.typography.display_font;
      if (b.suggested_logo_url) tenantUpdate.logo_url = b.suggested_logo_url;
      if (b.theme_mode) tenantUpdate.theme_mode = b.theme_mode;

      // Build brand_attributes with UI tokens from color_palette (NOT personality data)
      const uiTokens: Record<string, string> = {};
      if (b.color_palette?.background) uiTokens.background = b.color_palette.background;
      if (b.color_palette?.foreground) uiTokens.foreground = b.color_palette.foreground;
      if (b.color_palette?.muted) uiTokens.muted = b.color_palette.muted;
      // Map system_colors for card, muted_foreground, border if available
      if (b.system_colors?.card) uiTokens.card = stripHsl(b.system_colors.card);
      if (b.system_colors?.card_foreground) uiTokens.card_foreground = stripHsl(b.system_colors.card_foreground);
      if (b.system_colors?.muted_foreground) uiTokens.muted_foreground = stripHsl(b.system_colors.muted_foreground);
      if (b.system_colors?.border) uiTokens.border = stripHsl(b.system_colors.border);
      
      if (Object.keys(uiTokens).length > 0) {
        tenantUpdate.brand_attributes = uiTokens;
      }

      const { error: tenantError } = await supabase.from('tenants').update(tenantUpdate).eq('id', b.tenant_id);
      if (tenantError) throw tenantError;

      return branding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants-with-counts'] });
      refreshTenant();
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
      toast.success('Proposta rejeitada.');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateBranding = useMutation({
    mutationFn: async ({ brandingId, updates }: { brandingId: string; updates: Partial<BrandingProposal> }) => {
      // Update the branding record
      const { data: branding, error: brandingError } = await supabase
        .from('tenant_branding' as any)
        .update(updates as any)
        .eq('id', brandingId)
        .select()
        .single();

      if (brandingError) throw brandingError;
      const b = branding as unknown as BrandingProposal;

      // If approved, also sync changes to tenant
      if (b.status === 'approved') {
        const tenantUpdate: any = {};
        if (b.suggested_name) tenantUpdate.name = b.suggested_name;
        if (b.color_palette?.primary) tenantUpdate.primary_color = b.color_palette.primary;
        if (b.color_palette?.secondary) tenantUpdate.secondary_color = b.color_palette.secondary;
        if (b.color_palette?.accent) tenantUpdate.accent_color = b.color_palette.accent;
        if (b.typography?.display_font) tenantUpdate.font_family = b.typography.display_font;
        if (b.suggested_logo_url) tenantUpdate.logo_url = b.suggested_logo_url;
        if (b.theme_mode) tenantUpdate.theme_mode = b.theme_mode;

        const uiTokens: Record<string, string> = {};
        if (b.color_palette?.background) uiTokens.background = b.color_palette.background;
        if (b.color_palette?.foreground) uiTokens.foreground = b.color_palette.foreground;
        if (b.color_palette?.muted) uiTokens.muted = b.color_palette.muted;
        if (b.system_colors?.card) uiTokens.card = stripHsl(b.system_colors.card);
        if (b.system_colors?.card_foreground) uiTokens.card_foreground = stripHsl(b.system_colors.card_foreground);
        if (b.system_colors?.muted_foreground) uiTokens.muted_foreground = stripHsl(b.system_colors.muted_foreground);
        if (b.system_colors?.border) uiTokens.border = stripHsl(b.system_colors.border);
        if (Object.keys(uiTokens).length > 0) tenantUpdate.brand_attributes = uiTokens;

        if (Object.keys(tenantUpdate).length > 0) {
          const { error: tenantError } = await supabase.from('tenants').update(tenantUpdate).eq('id', b.tenant_id);
          if (tenantError) throw tenantError;
        }
      }

      return branding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants-with-counts'] });
      refreshTenant();
      toast.success('Branding atualizado e aplicado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  return {
    branding: brandingQuery.data,
    isLoading: brandingQuery.isLoading,
    analyzebranding,
    approveBranding,
    rejectBranding,
    saveManualBranding,
    updateBranding,
  };
}
