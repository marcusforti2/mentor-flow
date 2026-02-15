import { useState, useRef } from 'react';
import { useTenantBranding, BrandingProposal } from '@/hooks/useTenantBranding';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Sparkles, Check, X, Loader2, Palette, Type, Eye, Brain, PenTool, MessageSquareText, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TenantBrandingPanelProps {
  tenantId: string;
  tenantName: string;
  membershipId?: string;
}

// Manual form state
interface ManualBranding {
  suggested_name: string;
  brand_concept: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  display_font: string;
  body_font: string;
  personality: string;
  tone_of_voice: string;
  target_audience: string;
}

const EMPTY_MANUAL: ManualBranding = {
  suggested_name: '',
  brand_concept: '',
  primary: '',
  secondary: '',
  accent: '',
  background: '',
  foreground: '',
  display_font: '',
  body_font: '',
  personality: '',
  tone_of_voice: '',
  target_audience: '',
};

export function TenantBrandingPanel({ tenantId, tenantName, membershipId }: TenantBrandingPanelProps) {
  const { branding, isLoading, analyzebranding, approveBranding, rejectBranding, saveManualBranding } = useTenantBranding(tenantId);
  
  // Shared
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Tab: IA Visual
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab: IA Texto
  const [textPrompt, setTextPrompt] = useState('');

  // Tab: Manual
  const [manual, setManual] = useState<ManualBranding>(EMPTY_MANUAL);
  const [savingManual, setSavingManual] = useState(false);

  // Logo upload handler
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;
    const path = `${tenantId}/logo-${Date.now()}.png`;
    const { error } = await supabase.storage.from('branding-assets').upload(path, logoFile, { upsert: true });
    if (error) { toast.error('Erro ao enviar logo'); return null; }
    const { data: signedData } = await supabase.storage.from('branding-assets').createSignedUrl(path, 86400);
    return signedData?.signedUrl || null;
  };

  // IA Visual handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeVisual = () => {
    analyzebranding.mutate({ tenantId, files: selectedFiles, membershipId });
  };

  const handleAnalyzeText = () => {
    if (!textPrompt.trim()) return;
    analyzebranding.mutate({ tenantId, files: [], membershipId, textPrompt: textPrompt.trim() });
  };

  // Manual save
  const handleSaveManual = async () => {
    setSavingManual(true);
    try {
      const logoUrl = await uploadLogo();
      
      const proposal = {
        tenant_id: tenantId,
        status: 'draft' as const,
        uploaded_assets: [],
        brand_concept: manual.brand_concept || null,
        brand_attributes: {
          personality: manual.personality ? manual.personality.split(',').map(s => s.trim()) : [],
          tone_of_voice: manual.tone_of_voice || '',
          target_audience: manual.target_audience || '',
          brand_maturity: 'em_crescimento',
        },
        color_palette: {
          primary: manual.primary || '',
          secondary: manual.secondary || '',
          accent: manual.accent || '',
          background: manual.background || '',
          foreground: manual.foreground || '',
        },
        system_colors: {
          primary: manual.primary || '',
          primary_foreground: manual.foreground || '',
          secondary: manual.secondary || '',
          accent: manual.accent || '',
        },
        suggested_name: manual.suggested_name || null,
        suggested_logo_url: logoUrl,
        typography: {
          display_font: manual.display_font || 'Space Grotesk',
          body_font: manual.body_font || 'Inter',
          rationale: 'Definido manualmente',
        },
        ai_analysis: 'Branding configurado manualmente pela equipe MentorFlow.',
        generated_by: membershipId || null,
      };

      saveManualBranding.mutate(proposal);
    } catch (err) {
      toast.error('Erro ao salvar branding manual');
    } finally {
      setSavingManual(false);
    }
  };

  // Approve / Reject
  const handleApprove = () => {
    if (!branding?.id || !membershipId) return;
    approveBranding.mutate({ brandingId: branding.id, membershipId });
  };

  const handleReject = () => {
    if (!branding?.id) return;
    rejectBranding.mutate(branding.id);
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload - always visible */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
            <ImagePlus className="h-4 w-4 text-emerald-400" />
            Logo do Tenant
          </CardTitle>
          <CardDescription className="text-slate-500">
            PNG com fundo transparente. Será usado em todos os modos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-colors overflow-hidden bg-slate-800/50"
            >
              {logoPreview || branding?.suggested_logo_url ? (
                <img src={logoPreview || branding?.suggested_logo_url || ''} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Upload className="h-6 w-6 text-slate-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-300">{logoFile?.name || 'Nenhum logo enviado'}</p>
              <p className="text-xs text-slate-500">Clique no quadro para enviar</p>
            </div>
            <input ref={logoInputRef} type="file" accept=".png" className="hidden" onChange={handleLogoSelect} />
          </div>
        </CardContent>
      </Card>

      {/* Three modes */}
      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="w-full bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger value="visual" className="flex-1 gap-2 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <Brain className="h-4 w-4" />
            IA Visual
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1 gap-2 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <MessageSquareText className="h-4 w-4" />
            IA por Texto
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1 gap-2 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <PenTool className="h-4 w-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        {/* IA Visual Tab */}
        <TabsContent value="visual" className="mt-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">Análise por Imagens</CardTitle>
              <CardDescription className="text-slate-500">
                Envie prints do Instagram, materiais da marca de <strong className="text-slate-300">{tenantName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
              >
                <Upload className="h-8 w-8 mx-auto text-slate-500 mb-2" />
                <p className="text-sm text-slate-400">Prints, materiais visuais, fotos de produtos</p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP — até 10 arquivos</p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {previews.map((preview, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-700">
                      <img src={preview} alt={`Asset ${i + 1}`} className="w-full h-24 object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="absolute top-1 right-1 bg-red-500/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleAnalyzeVisual}
                disabled={selectedFiles.length === 0 || analyzebranding.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {analyzebranding.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Gerar Proposta ({selectedFiles.length} arquivo{selectedFiles.length !== 1 ? 's' : ''})</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IA por Texto Tab */}
        <TabsContent value="text" className="mt-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">Análise por Descrição</CardTitle>
              <CardDescription className="text-slate-500">
                Descreva a marca, o estilo, as cores desejadas. A IA gera a proposta baseada na sua descrição.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder={`Exemplo: "A marca do ${tenantName} é focada em consultoria para empresários de alto ticket. Cores sóbrias, estilo premium, tom de autoridade mas acolhedor. Usa muito preto, dourado e tons de cinza. O público são donos de negócios que faturam acima de 100k/mês..."`}
                className="min-h-[150px] bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-600"
              />
              <Button
                onClick={handleAnalyzeText}
                disabled={!textPrompt.trim() || analyzebranding.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {analyzebranding.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando proposta...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Gerar Proposta por Texto</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Tab */}
        <TabsContent value="manual" className="mt-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">Configuração Manual</CardTitle>
              <CardDescription className="text-slate-500">
                Defina cada campo do branding manualmente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nome e Conceito */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identidade</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Nome exibido</Label>
                    <Input
                      value={manual.suggested_name}
                      onChange={(e) => setManual(p => ({ ...p, suggested_name: e.target.value }))}
                      placeholder={tenantName}
                      className="bg-slate-800 border-slate-600 text-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Tom de voz</Label>
                    <Input
                      value={manual.tone_of_voice}
                      onChange={(e) => setManual(p => ({ ...p, tone_of_voice: e.target.value }))}
                      placeholder="Profissional mas acolhedor"
                      className="bg-slate-800 border-slate-600 text-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Conceito da marca</Label>
                  <Textarea
                    value={manual.brand_concept}
                    onChange={(e) => setManual(p => ({ ...p, brand_concept: e.target.value }))}
                    placeholder="Descreva o posicionamento e conceito da marca..."
                    className="bg-slate-800 border-slate-600 text-slate-200 min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Personalidade (separar por vírgula)</Label>
                    <Input
                      value={manual.personality}
                      onChange={(e) => setManual(p => ({ ...p, personality: e.target.value }))}
                      placeholder="Sofisticado, Inovador, Confiável"
                      className="bg-slate-800 border-slate-600 text-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Público-alvo</Label>
                    <Input
                      value={manual.target_audience}
                      onChange={(e) => setManual(p => ({ ...p, target_audience: e.target.value }))}
                      placeholder="Empresários que faturam 50k+/mês"
                      className="bg-slate-800 border-slate-600 text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Cores */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paleta de Cores (HSL)</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(['primary', 'secondary', 'accent', 'background', 'foreground'] as const).map(key => (
                    <div key={key}>
                      <Label className="text-xs text-slate-400 capitalize">{key}</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          value={manual[key]}
                          onChange={(e) => setManual(p => ({ ...p, [key]: e.target.value }))}
                          placeholder="220 91% 45%"
                          className="bg-slate-800 border-slate-600 text-slate-200 text-xs font-mono"
                        />
                        {manual[key] && (
                          <div
                            className="w-8 h-8 rounded border border-slate-600 shrink-0"
                            style={{ backgroundColor: `hsl(${manual[key]})` }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Tipografia */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipografia (Google Fonts)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Títulos / Display</Label>
                    <Input
                      value={manual.display_font}
                      onChange={(e) => setManual(p => ({ ...p, display_font: e.target.value }))}
                      placeholder="Space Grotesk"
                      className="bg-slate-800 border-slate-600 text-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Corpo / Body</Label>
                    <Input
                      value={manual.body_font}
                      onChange={(e) => setManual(p => ({ ...p, body_font: e.target.value }))}
                      placeholder="Inter"
                      className="bg-slate-800 border-slate-600 text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveManual}
                disabled={savingManual || saveManualBranding.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingManual || saveManualBranding.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  <><PenTool className="h-4 w-4 mr-2" />Salvar Branding Manual</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== Resultado da Proposta ==================== */}
      <BrandingResult
        branding={branding}
        statusColors={statusColors}
        statusLabels={statusLabels}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={approveBranding.isPending}
        isRejecting={rejectBranding.isPending}
      />
    </div>
  );
}

// Extracted result display component
function BrandingResult({
  branding,
  statusColors,
  statusLabels,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  branding: BrandingProposal | null;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  if (!branding) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">Proposta de Branding</h3>
        <Badge className={cn('border', statusColors[branding.status])}>
          {statusLabels[branding.status]}
        </Badge>
      </div>

      {branding.ai_analysis && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
              <Eye className="h-4 w-4 text-emerald-400" />
              Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 whitespace-pre-wrap">{branding.ai_analysis}</p>
          </CardContent>
        </Card>
      )}

      {branding.brand_concept && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Conceito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{branding.brand_concept}</p>
            {branding.suggested_name && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 mb-1">Nome sugerido</p>
                <p className="text-lg font-bold text-emerald-300">{branding.suggested_name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {branding.brand_attributes && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300">Atributos da Marca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {branding.brand_attributes.personality?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Personalidade</p>
                <div className="flex flex-wrap gap-1">
                  {branding.brand_attributes.personality.map((p: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {branding.brand_attributes.tone_of_voice && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Tom de Voz</p>
                <p className="text-sm text-slate-300">{branding.brand_attributes.tone_of_voice}</p>
              </div>
            )}
            {branding.brand_attributes.target_audience && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Público-alvo</p>
                <p className="text-sm text-slate-300">{branding.brand_attributes.target_audience}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {branding.color_palette && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
              <Palette className="h-4 w-4 text-purple-400" />
              Paleta de Cores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {['primary', 'secondary', 'accent', 'background', 'foreground', 'muted'].map((key) => {
                const color = branding.color_palette?.[key];
                if (!color) return null;
                return (
                  <div key={key} className="text-center">
                    <div className="w-full h-12 rounded-lg border border-slate-600 mb-1" style={{ backgroundColor: `hsl(${color})` }} />
                    <p className="text-[10px] text-slate-500 capitalize">{key}</p>
                    <p className="text-[9px] text-slate-600 font-mono">{color}</p>
                  </div>
                );
              })}
            </div>
            {branding.color_palette.rationale && (
              <p className="text-xs text-slate-500 mt-2">{branding.color_palette.rationale}</p>
            )}
          </CardContent>
        </Card>
      )}

      {branding.typography && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
              <Type className="h-4 w-4 text-blue-400" />
              Tipografia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Display</p>
                <p className="text-sm font-semibold text-slate-200">{branding.typography.display_font}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Body</p>
                <p className="text-sm text-slate-200">{branding.typography.body_font}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {branding.system_colors && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300">Cores do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(branding.system_colors).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
                  <div className="w-6 h-6 rounded border border-slate-600 shrink-0" style={{ backgroundColor: `hsl(${value})` }} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 truncate">--{key.replace(/_/g, '-')}</p>
                    <p className="text-[9px] text-slate-600 font-mono truncate">{value as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="bg-slate-700/50" />

      {branding.status === 'draft' && (
        <div className="flex gap-3">
          <Button onClick={onApprove} disabled={isApproving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            {isApproving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Aprovar e Aplicar
          </Button>
          <Button onClick={onReject} disabled={isRejecting} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
            <X className="h-4 w-4 mr-2" />
            Rejeitar
          </Button>
        </div>
      )}

      {branding.status === 'approved' && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
          <Check className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-emerald-300">Branding aplicado ao tenant com sucesso</p>
        </div>
      )}
    </div>
  );
}
