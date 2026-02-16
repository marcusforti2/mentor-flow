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
import { Upload, Sparkles, Check, X, Loader2, Palette, Type, Eye, Brain, PenTool, MessageSquareText, ImagePlus, RefreshCw, Pencil, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TenantBrandingPanelProps {
  tenantId: string;
  tenantName: string;
  membershipId?: string;
}

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
  const { branding, isLoading, analyzebranding, approveBranding, rejectBranding, saveManualBranding, updateBranding } = useTenantBranding(tenantId);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [textPrompt, setTextPrompt] = useState('');
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

  const handleApprove = () => {
    if (!branding?.id || !membershipId) return;
    approveBranding.mutate({ brandingId: branding.id, membershipId });
  };

  const handleReject = () => {
    if (!branding?.id) return;
    rejectBranding.mutate(branding.id);
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
    approved: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-primary" />
            Logo do Tenant
          </CardTitle>
          <CardDescription>
            PNG com fundo transparente. Será usado em todos os modos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden bg-muted/50"
            >
              {logoPreview || branding?.suggested_logo_url ? (
                <img src={logoPreview || branding?.suggested_logo_url || ''} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{logoFile?.name || 'Nenhum logo enviado'}</p>
              <p className="text-xs text-muted-foreground">Clique no quadro para enviar</p>
            </div>
            <input ref={logoInputRef} type="file" accept=".png" className="hidden" onChange={handleLogoSelect} />
          </div>
        </CardContent>
      </Card>

      {/* Three modes */}
      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="visual" className="flex-1 gap-2">
            <Brain className="h-4 w-4" />
            IA Visual
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1 gap-2">
            <MessageSquareText className="h-4 w-4" />
            IA por Texto
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1 gap-2">
            <PenTool className="h-4 w-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        {/* IA Visual Tab */}
        <TabsContent value="visual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Análise por Imagens</CardTitle>
              <CardDescription>
                Envie prints do Instagram, materiais da marca de <strong className="text-foreground">{tenantName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Prints, materiais visuais, fotos de produtos</p>
                <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG, WEBP — até 10 arquivos</p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {previews.map((preview, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                      <img src={preview} alt={`Asset ${i + 1}`} className="w-full h-24 object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="absolute top-1 right-1 bg-destructive/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleAnalyzeVisual} disabled={selectedFiles.length === 0 || analyzebranding.isPending} className="w-full">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Análise por Descrição</CardTitle>
              <CardDescription>
                Descreva a marca, o estilo, as cores desejadas. A IA gera a proposta baseada na sua descrição.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder={`Exemplo: "A marca do ${tenantName} é focada em consultoria para empresários de alto ticket. Cores sóbrias, estilo premium..."`}
                className="min-h-[150px]"
              />
              <Button onClick={handleAnalyzeText} disabled={!textPrompt.trim() || analyzebranding.isPending} className="w-full">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configuração Manual</CardTitle>
              <CardDescription>Defina cada campo do branding manualmente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identidade</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome exibido</Label>
                    <Input value={manual.suggested_name} onChange={(e) => setManual(p => ({ ...p, suggested_name: e.target.value }))} placeholder={tenantName} />
                  </div>
                  <div>
                    <Label className="text-xs">Tom de voz</Label>
                    <Input value={manual.tone_of_voice} onChange={(e) => setManual(p => ({ ...p, tone_of_voice: e.target.value }))} placeholder="Profissional mas acolhedor" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Conceito da marca</Label>
                  <Textarea value={manual.brand_concept} onChange={(e) => setManual(p => ({ ...p, brand_concept: e.target.value }))} placeholder="Descreva o posicionamento..." className="min-h-[80px]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Personalidade (separar por vírgula)</Label>
                    <Input value={manual.personality} onChange={(e) => setManual(p => ({ ...p, personality: e.target.value }))} placeholder="Sofisticado, Inovador, Confiável" />
                  </div>
                  <div>
                    <Label className="text-xs">Público-alvo</Label>
                    <Input value={manual.target_audience} onChange={(e) => setManual(p => ({ ...p, target_audience: e.target.value }))} placeholder="Empresários que faturam 50k+/mês" />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paleta de Cores (HSL)</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(['primary', 'secondary', 'accent', 'background', 'foreground'] as const).map(key => (
                    <div key={key}>
                      <Label className="text-xs capitalize">{key}</Label>
                      <div className="flex gap-2 items-center">
                        <Input value={manual[key]} onChange={(e) => setManual(p => ({ ...p, [key]: e.target.value }))} placeholder="220 91% 45%" className="text-xs font-mono" />
                        {manual[key] && <div className="w-8 h-8 rounded border border-border shrink-0" style={{ backgroundColor: `hsl(${manual[key]})` }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipografia (Google Fonts)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Títulos / Display</Label>
                    <Input value={manual.display_font} onChange={(e) => setManual(p => ({ ...p, display_font: e.target.value }))} placeholder="Space Grotesk" />
                  </div>
                  <div>
                    <Label className="text-xs">Corpo / Body</Label>
                    <Input value={manual.body_font} onChange={(e) => setManual(p => ({ ...p, body_font: e.target.value }))} placeholder="Inter" />
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveManual} disabled={savingManual || saveManualBranding.isPending} className="w-full">
                {savingManual || saveManualBranding.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><PenTool className="h-4 w-4 mr-2" />Salvar Branding Manual</>}
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
        onUpdate={(updates) => {
          if (!branding?.id) return;
          updateBranding.mutate({ brandingId: branding.id, updates });
        }}
        isApproving={approveBranding.isPending}
        isRejecting={rejectBranding.isPending}
        isUpdating={updateBranding.isPending}
      />
    </div>
  );
}

// ==================== Editable Result Component ====================
function BrandingResult({
  branding,
  statusColors,
  statusLabels,
  onApprove,
  onReject,
  onUpdate,
  isApproving,
  isRejecting,
  isUpdating,
}: {
  branding: BrandingProposal | null;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  onApprove: () => void;
  onReject: () => void;
  onUpdate: (updates: Partial<BrandingProposal>) => void;
  isApproving: boolean;
  isRejecting: boolean;
  isUpdating: boolean;
}) {
  const [editMode, setEditMode] = useState<'off' | 'full' | 'colors'>('off');
  const isEditing = editMode !== 'off';
  const isColorOnly = editMode === 'colors';
  const [editColors, setEditColors] = useState<Record<string, string>>({});
  const [editSystemColors, setEditSystemColors] = useState<Record<string, string>>({});
  const [editTypography, setEditTypography] = useState<{ display_font: string; body_font: string }>({ display_font: '', body_font: '' });
  const [editName, setEditName] = useState('');
  const [editConcept, setEditConcept] = useState('');
  const [editThemeMode, setEditThemeMode] = useState<'dark' | 'light'>('dark');

  if (!branding) return null;

  // Strip wrapping hsl(...) if present, returning raw "220 91% 45%"
  const stripHsl = (val: string): string => {
    if (!val) return '';
    const m = val.match(/^hsl\(([^)]+)\)$/i);
    return m ? m[1].trim() : val.trim();
  };

  // HSL string "220 91% 45%" <-> hex "#RRGGBB"
  const hslToHex = (hslStr: string): string => {
    if (!hslStr) return '#888888';
    const parts = hslStr.replace(/,/g, ' ').split(/\s+/).map(s => parseFloat(s));
    if (parts.length < 3 || parts.some(isNaN)) return '#888888';
    let [h, s, l] = parts;
    s /= 100; l /= 100;
    const a2 = s * Math.min(l, 1 - l);
    const f = (n: number) => { const k = (n + h / 30) % 12; return l - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  };

  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Parse HSL string "220 15% 10%" -> { h, s, l }
  const parseHsl = (val: string) => {
    if (!val) return null;
    const parts = val.replace(/,/g, ' ').split(/\s+/).map(s => parseFloat(s));
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return { h: parts[0], s: parts[1], l: parts[2] };
  };

  // Flip lightness for theme switch: dark bg (5-15%) <-> light bg (95-100%)
  const flipLightness = (hslStr: string, isDarkToLight: boolean): string => {
    const parsed = parseHsl(hslStr);
    if (!parsed) return hslStr;
    const { h, s, l } = parsed;
    const newL = isDarkToLight
      ? Math.max(90, 100 - l) // dark->light: low L becomes high L
      : Math.min(15, 100 - l); // light->dark: high L becomes low L
    return `${Math.round(h)} ${Math.round(s)}% ${Math.round(newL)}%`;
  };

  const adaptColorsForTheme = (newTheme: 'dark' | 'light', oldTheme: 'dark' | 'light') => {
    if (newTheme === oldTheme) return;
    const isDarkToLight = newTheme === 'light';

    // Adapt palette colors
    setEditColors(prev => {
      const next = { ...prev };
      // background and foreground swap logic
      if (next.background) next.background = flipLightness(next.background, isDarkToLight);
      if (next.foreground) next.foreground = flipLightness(next.foreground, !isDarkToLight);
      if (next.muted) next.muted = flipLightness(next.muted, isDarkToLight);
      return next;
    });

    // Adapt system colors
    setEditSystemColors(prev => {
      const next = { ...prev };
      const bgKeys = ['background', 'card', 'muted', 'popover'];
      const fgKeys = ['foreground', 'card_foreground', 'muted_foreground', 'popover_foreground', 'primary_foreground', 'secondary_foreground', 'accent_foreground'];
      const borderKeys = ['border', 'input', 'ring'];

      bgKeys.forEach(k => {
        if (next[k]) next[k] = flipLightness(next[k], isDarkToLight);
      });
      fgKeys.forEach(k => {
        if (next[k]) next[k] = flipLightness(next[k], !isDarkToLight);
      });
      borderKeys.forEach(k => {
        if (next[k]) {
          const parsed = parseHsl(next[k]);
          if (parsed) {
            const newL = isDarkToLight ? Math.min(parsed.l + 60, 85) : Math.max(parsed.l - 60, 15);
            next[k] = `${Math.round(parsed.h)} ${Math.round(parsed.s)}% ${Math.round(newL)}%`;
          }
        }
      });
      return next;
    });
  };

  const handleThemeToggle = (newTheme: 'dark' | 'light') => {
    adaptColorsForTheme(newTheme, editThemeMode);
    setEditThemeMode(newTheme);
  };

  const startEditing = (mode: 'full' | 'colors') => {
    setEditColors({ ...branding.color_palette });
    const cleaned: Record<string, string> = {};
    Object.entries(branding.system_colors || {}).forEach(([k, v]) => {
      cleaned[k] = stripHsl(v as string);
    });
    setEditSystemColors(cleaned);
    setEditTypography({
      display_font: branding.typography?.display_font || '',
      body_font: branding.typography?.body_font || '',
    });
    setEditName(branding.suggested_name || '');
    setEditConcept(branding.brand_concept || '');
    setEditThemeMode(branding.theme_mode || 'dark');
    setEditMode(mode);
  };

  const handleSaveEdits = () => {
    const updates: Partial<BrandingProposal> = {
      color_palette: editColors,
      system_colors: editSystemColors,
      theme_mode: editThemeMode,
    };
    if (!isColorOnly) {
      updates.typography = { ...branding.typography, ...editTypography };
      updates.suggested_name = editName || branding.suggested_name;
      updates.brand_concept = editConcept || branding.brand_concept;
    }
    onUpdate(updates);
    setEditMode('off');
  };

  const colorKeys = ['primary', 'secondary', 'accent', 'background', 'foreground', 'muted'];
  const colorLabels: Record<string, string> = {
    primary: 'Primária', secondary: 'Secundária', accent: 'Destaque',
    background: 'Fundo', foreground: 'Texto', muted: 'Sutil',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Proposta de Branding</h3>
          <Badge className={cn('border', statusColors[branding.status])}>
            {statusLabels[branding.status]}
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            {(branding.theme_mode || 'dark') === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (branding.status === 'draft' || branding.status === 'approved') && (
            <>
              <Button variant="outline" size="sm" onClick={() => startEditing('colors')} className="gap-1.5 h-7 text-xs">
                <Palette className="h-3 w-3" />
                Editar Cores
              </Button>
              <Button variant="outline" size="sm" onClick={() => startEditing('full')} className="gap-1.5 h-7 text-xs">
                <Pencil className="h-3 w-3" />
                Editar Tudo
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editing banner */}
      {isEditing && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              {isColorOnly ? '🎨 Editando cores — selecione e salve.' : '✏️ Modo de edição — altere cores, fontes ou conceito e salve.'}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditMode('off')} className="h-7 text-xs">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveEdits} disabled={isUpdating} className="h-7 text-xs gap-1.5">
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Salvar Alterações
              </Button>
            </div>
          </div>
          {/* Theme mode toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs font-medium text-muted-foreground">Modo de Tema:</span>
            <div className="flex gap-1">
              <Button
                variant={editThemeMode === 'dark' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleThemeToggle('dark')}
              >
                🌙 Dark
              </Button>
              <Button
                variant={editThemeMode === 'light' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleThemeToggle('light')}
              >
                ☀️ Light
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Name & Concept — hide in color-only mode */}
      {!isColorOnly && (branding.brand_concept || branding.suggested_name) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Conceito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isEditing ? (
              <>
                <div>
                  <Label className="text-xs">Nome sugerido</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Conceito</Label>
                  <Textarea value={editConcept} onChange={(e) => setEditConcept(e.target.value)} className="min-h-[80px] text-sm" />
                </div>
              </>
            ) : (
              <>
                {branding.brand_concept && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{branding.brand_concept}</p>
                )}
                {branding.suggested_name && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-primary mb-1">Nome sugerido</p>
                    <p className="text-lg font-bold text-primary">{branding.suggested_name}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {branding.ai_analysis && !isEditing && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{branding.ai_analysis}</p>
          </CardContent>
        </Card>
      )}

      {branding.brand_attributes && !isEditing && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Atributos da Marca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {branding.brand_attributes.personality?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Personalidade</p>
                <div className="flex flex-wrap gap-1">
                  {branding.brand_attributes.personality.map((p: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {branding.brand_attributes.tone_of_voice && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tom de Voz</p>
                <p className="text-sm text-foreground">{branding.brand_attributes.tone_of_voice}</p>
              </div>
            )}
            {branding.brand_attributes.target_audience && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Público-alvo</p>
                <p className="text-sm text-foreground">{branding.brand_attributes.target_audience}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Color Palette */}
      {branding.color_palette && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-purple-500" />
              Paleta de Cores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {colorKeys.map((key) => {
                  const val = editColors[key] || '';
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{colorLabels[key] || key}</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={hslToHex(val)}
                          onChange={(e) => setEditColors(prev => ({ ...prev, [key]: hexToHsl(e.target.value) }))}
                          className="w-10 h-10 rounded-lg border border-border cursor-pointer shrink-0 bg-transparent p-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <Input
                            value={val}
                            onChange={(e) => setEditColors(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="220 91% 45%"
                            className="text-xs font-mono h-8"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {colorKeys.map((key) => {
                    const color = branding.color_palette?.[key];
                    if (!color) return null;
                    return (
                      <div key={key} className="text-center">
                        <div className="w-full h-12 rounded-lg border border-border mb-1" style={{ backgroundColor: `hsl(${color})` }} />
                        <p className="text-[10px] text-muted-foreground">{colorLabels[key] || key}</p>
                        <p className="text-[9px] text-muted-foreground/60 font-mono">{color}</p>
                      </div>
                    );
                  })}
                </div>
                {branding.color_palette.rationale && (
                  <p className="text-xs text-muted-foreground mt-2">{branding.color_palette.rationale}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Typography — hide in color-only mode */}
      {branding.typography && !isColorOnly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Type className="h-4 w-4 text-blue-500" />
              Tipografia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Display</Label>
                  <Input value={editTypography.display_font} onChange={(e) => setEditTypography(p => ({ ...p, display_font: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Body</Label>
                  <Input value={editTypography.body_font} onChange={(e) => setEditTypography(p => ({ ...p, body_font: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Display</p>
                  <p className="text-sm font-semibold text-foreground">{branding.typography.display_font}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Body</p>
                  <p className="text-sm text-foreground">{branding.typography.body_font}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Colors */}
      {branding.system_colors && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Cores do Sistema</CardTitle>
            <CardDescription>Variáveis CSS aplicadas nos componentes (cards, bordas, botões). Derivadas da paleta acima.</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(editSystemColors).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">--{key.replace(/_/g, '-')}</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={hslToHex(value as string)}
                        onChange={(e) => setEditSystemColors(prev => ({ ...prev, [key]: hexToHsl(e.target.value) }))}
                        className="w-8 h-8 rounded border border-border cursor-pointer shrink-0 bg-transparent p-0.5"
                      />
                      <Input
                        value={value as string}
                        onChange={(e) => setEditSystemColors(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="220 91% 45%"
                        className="text-xs font-mono h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(branding.system_colors).map(([key, value]) => {
                  const raw = stripHsl(value as string);
                  return (
                    <div key={key} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <div className="w-6 h-6 rounded border border-border shrink-0" style={{ backgroundColor: raw ? `hsl(${raw})` : 'transparent' }} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">--{key.replace(/_/g, '-')}</p>
                        <p className="text-[9px] text-muted-foreground/60 font-mono truncate">{raw}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Actions */}
      {branding.status === 'draft' && !isEditing && (
        <div className="flex gap-3">
          <Button onClick={onApprove} disabled={isApproving} className="flex-1">
            {isApproving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Aprovar e Aplicar
          </Button>
          <Button onClick={onReject} disabled={isRejecting} variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4 mr-2" />
            Rejeitar
          </Button>
        </div>
      )}

      {branding.status === 'approved' && !isEditing && (
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <Check className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-primary font-medium">Branding aplicado ao tenant com sucesso</p>
          </div>
          <Button onClick={onReject} variant="outline" className="w-full gap-2 text-foreground border-border">
            <RefreshCw className="h-4 w-4" />
            Refazer Branding do Zero
          </Button>
        </div>
      )}

      {branding.status === 'rejected' && !isEditing && (
        <div className="p-4 rounded-lg bg-muted border border-border text-center">
          <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Proposta rejeitada. Use as abas acima para gerar uma nova.</p>
        </div>
      )}
    </div>
  );
}
