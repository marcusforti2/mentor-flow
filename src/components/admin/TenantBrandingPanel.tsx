import { useState, useRef } from 'react';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, Sparkles, Check, X, Loader2, Palette, Type, Eye, FileImage, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantBrandingPanelProps {
  tenantId: string;
  tenantName: string;
  membershipId?: string;
}

export function TenantBrandingPanel({ tenantId, tenantName, membershipId }: TenantBrandingPanelProps) {
  const { branding, isLoading, analyzebranding, approveBranding, rejectBranding } = useTenantBranding(tenantId);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    analyzebranding.mutate({
      tenantId,
      files: selectedFiles,
      membershipId,
    });
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
      {/* Upload Section */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Brain className="h-5 w-5 text-emerald-400" />
            AI Branding Engine
          </CardTitle>
          <CardDescription className="text-slate-400">
            Envie prints do Instagram, logo, materiais da marca de <strong className="text-slate-200">{tenantName}</strong>. 
            A IA analisa e gera uma proposta completa de branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
          >
            <Upload className="h-10 w-10 mx-auto text-slate-500 mb-3" />
            <p className="text-sm text-slate-400">
              Clique para enviar prints, logos e materiais visuais
            </p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP — até 10 arquivos</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* File Previews */}
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
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1">
                    <p className="text-[10px] text-white truncate">{selectedFiles[i]?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={selectedFiles.length === 0 || analyzebranding.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {analyzebranding.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Proposta de Branding ({selectedFiles.length} arquivo{selectedFiles.length !== 1 ? 's' : ''})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Branding Proposal Result */}
      {branding && (
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Proposta de Branding</h3>
            <Badge className={cn('border', statusColors[branding.status])}>
              {statusLabels[branding.status]}
            </Badge>
          </div>

          {/* AI Analysis */}
          {branding.ai_analysis && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  Análise da IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400 whitespace-pre-wrap">{branding.ai_analysis}</p>
              </CardContent>
            </Card>
          )}

          {/* Brand Concept */}
          {branding.brand_concept && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Conceito da Marca
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

          {/* Brand Attributes */}
          {branding.brand_attributes && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-300">Atributos da Marca</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {branding.brand_attributes.personality && (
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
                {branding.brand_attributes.brand_maturity && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Maturidade</p>
                    <Badge variant="outline" className="text-xs border-slate-500/50 text-slate-300">
                      {branding.brand_attributes.brand_maturity}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Color Palette */}
          {branding.color_palette && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
                  <Palette className="h-4 w-4 text-purple-400" />
                  Paleta de Cores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {['primary', 'secondary', 'accent', 'background', 'foreground', 'muted'].map((key) => {
                    const color = branding.color_palette?.[key];
                    if (!color) return null;
                    return (
                      <div key={key} className="text-center">
                        <div
                          className="w-full h-12 rounded-lg border border-slate-600 mb-1"
                          style={{ backgroundColor: `hsl(${color})` }}
                        />
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

          {/* Typography */}
          {branding.typography && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
                  <Type className="h-4 w-4 text-blue-400" />
                  Tipografia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Display / Títulos</p>
                    <p className="text-sm font-semibold text-slate-200">{branding.typography.display_font}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Body / Corpo</p>
                    <p className="text-sm text-slate-200">{branding.typography.body_font}</p>
                  </div>
                </div>
                {branding.typography.rationale && (
                  <p className="text-xs text-slate-500 mt-2">{branding.typography.rationale}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* System Colors Preview */}
          {branding.system_colors && (
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-300">Cores do Sistema (CSS Variables)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(branding.system_colors).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
                      <div
                        className="w-6 h-6 rounded border border-slate-600 shrink-0"
                        style={{ backgroundColor: `hsl(${value})` }}
                      />
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

          {/* Action Buttons */}
          {branding.status === 'draft' && (
            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={approveBranding.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {approveBranding.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Aprovar e Aplicar
              </Button>
              <Button
                onClick={handleReject}
                disabled={rejectBranding.isPending}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <X className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            </div>
          )}

          {branding.status === 'approved' && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <Check className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-emerald-300">Branding aplicado ao tenant com sucesso</p>
              <p className="text-xs text-emerald-400/60 mt-1">
                Aprovado em {branding.approved_at ? new Date(branding.approved_at).toLocaleDateString('pt-BR') : '—'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
