import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, Sparkles, RefreshCw, BarChart3, Target, AlertTriangle, Phone, Upload, ImagePlus, X, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAIToolHistory } from '@/hooks/useAIToolHistory';
import { AIToolHistoryPanel } from './AIToolHistoryPanel';

interface ConversionAnalyzerProps {
  mentoradoId: string | null;
}

export function ConversionAnalyzer({ mentoradoId }: ConversionAnalyzerProps) {
  const [tab, setTab] = useState('call');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Call analysis state
  const [transcription, setTranscription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [analysisType, setAnalysisType] = useState<'transcricao' | 'prints' | 'documento'>('transcricao');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBase64, setDocBase64] = useState<string | null>(null);

  const { history, loading: loadingHistory, saveToHistory } = useAIToolHistory(mentoradoId, 'conversion_analyzer');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImages(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use PDF, Word (.docx) ou texto (.txt)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }
    setDocFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setDocBase64(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Call/Conversation Analysis
  const handleCallAnalysis = async () => {
    if (analysisType === 'transcricao' && !transcription.trim()) {
      toast.error('Cole a transcrição da chamada');
      return;
    }
    if (analysisType === 'prints' && images.length === 0) {
      toast.error('Envie ao menos um print da conversa');
      return;
    }
    if (analysisType === 'documento' && !docBase64) {
      toast.error('Envie um arquivo PDF ou Word');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: {
          type: 'training_analysis',
          analysis_type: analysisType === 'documento' ? 'transcricao' : analysisType,
          transcription: analysisType === 'transcricao' ? transcription : undefined,
          images: analysisType === 'prints' ? images : undefined,
          pdf_base64: analysisType === 'documento' ? docBase64 : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      let resultText = '';
      if (typeof data?.result === 'object') {
        resultText = JSON.stringify(data.result, null, 2);
      } else {
        resultText = data?.result || '';
      }

      setResult(resultText);
      toast.success('Análise de call concluída!');

      if (resultText) {
        const typeLabels = { transcricao: 'Transcrição', prints: 'Prints', documento: 'Documento' };
        await saveToHistory({
          title: `Análise de Call (${typeLabels[analysisType]}) - ${new Date().toLocaleDateString('pt-BR')}`,
          inputData: {
            analysis_type: analysisType,
            ...(analysisType === 'transcricao' ? { transcription_preview: transcription.slice(0, 200) } : {}),
            ...(analysisType === 'prints' ? { images_count: images.length } : {}),
            ...(analysisType === 'documento' ? { file_name: docFile?.name } : {}),
          },
          outputText: resultText,
        });
      }
    } catch (error) {
      console.error('Error analyzing call:', error);
      toast.error('Erro ao analisar chamada');
    } finally {
      setIsLoading(false);
    }
  };

  // Pipeline Analysis
  const handlePipelineAnalysis = async () => {
    setIsLoading(true);
    setResult('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'conversion_analyzer',
          mentorado_id: mentoradoId,
          data: {},
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const resultText = data?.result || '';
      setResult(resultText);
      toast.success('Análise de pipeline concluída!');

      if (resultText) {
        await saveToHistory({
          title: `Análise de Pipeline - ${new Date().toLocaleDateString('pt-BR')}`,
          outputText: resultText,
        });
      }
    } catch (error) {
      console.error('Error analyzing pipeline:', error);
      toast.error('Erro ao analisar pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCallAnalysisResult = () => {
    if (!result) return null;

    // Try to parse as JSON (training_analysis format)
    try {
      const parsed = JSON.parse(result);
      if (parsed.nota_geral !== undefined) {
        return (
          <div className="space-y-6">
            {/* Score */}
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${parsed.nota_geral >= 70 ? 'text-green-500' : parsed.nota_geral >= 40 ? 'text-yellow-500' : 'text-destructive'}`}>
                {parsed.nota_geral}/100
              </div>
              <div className="text-muted-foreground text-sm flex-1">{parsed.resumo}</div>
            </div>

            {/* Gold - Don't Change */}
            {parsed.ouro_nao_mude?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-500 flex items-center gap-2">🥇 Ouro — Não Mude!</h4>
                <ul className="space-y-1">
                  {parsed.ouro_nao_mude.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-foreground bg-yellow-500/10 rounded-lg px-3 py-2">✅ {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Change Urgently */}
            {parsed.muda_urgente?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-destructive flex items-center gap-2">🚨 Muda Urgente!</h4>
                <ul className="space-y-1">
                  {parsed.muda_urgente.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-foreground bg-destructive/10 rounded-lg px-3 py-2">⚠️ {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {parsed.errou_feio?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-400 flex items-center gap-2">❌ Errou Feio</h4>
                <ul className="space-y-1">
                  {parsed.errou_feio.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-foreground bg-red-500/10 rounded-lg px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strengths */}
            {parsed.pontos_fortes?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-green-500">💪 Pontos Fortes</h4>
                <ul className="space-y-1">
                  {parsed.pontos_fortes.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-foreground bg-green-500/10 rounded-lg px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {parsed.pontos_fracos?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-orange-500">📉 Pontos Fracos</h4>
                <ul className="space-y-1">
                  {parsed.pontos_fracos.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-foreground bg-orange-500/10 rounded-lg px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* How to Improve */}
            {parsed.como_melhorar?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">🎯 Como Melhorar</h4>
                {parsed.como_melhorar.map((item: any, i: number) => (
                  <div key={i} className="bg-primary/10 rounded-lg px-4 py-3 space-y-1">
                    <p className="font-medium text-sm">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground">{item.detalhes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
    } catch {
      // Not JSON, render as markdown
    }

    return (
      <div className="prose-ai-content max-h-[500px] overflow-y-auto pr-2">
        <ReactMarkdown>{result}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setResult(''); }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="call" className="gap-2">
            <Phone className="h-4 w-4" />
            Análise de Call
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análise de Pipeline
          </TabsTrigger>
        </TabsList>

        {/* Call Analysis Tab */}
        <TabsContent value="call" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <CardTitle>Análise de Call / Conversa</CardTitle>
              </div>
              <CardDescription>
                Cole a transcrição ou envie prints de conversas para receber um diagnóstico completo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                <Button
                  variant={analysisType === 'transcricao' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('transcricao')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Transcrição
                </Button>
                <Button
                  variant={analysisType === 'prints' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('prints')}
                >
                  <ImagePlus className="h-4 w-4 mr-1" />
                  Prints
                </Button>
                <Button
                  variant={analysisType === 'documento' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalysisType('documento')}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  PDF / Word
                </Button>
              </div>

              {analysisType === 'transcricao' ? (
                <div className="space-y-2">
                  <Label>Transcrição da chamada</Label>
                  <Textarea
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    placeholder="Cole aqui a transcrição da reunião ou chamada..."
                    rows={8}
                    className="resize-y"
                  />
                </div>
              ) : analysisType === 'prints' ? (
                <div className="space-y-3">
                  <Label>Prints da conversa</Label>
                  <div className="flex flex-wrap gap-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                        <img src={img} alt={`Print ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <Input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Arquivo PDF ou Word</Label>
                  {docFile ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <FileText className="h-8 w-8 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{docFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(docFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => { setDocFile(null); setDocBase64(null); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Clique para enviar PDF, Word ou TXT</p>
                      <p className="text-xs text-muted-foreground mt-1">Máximo 10MB</p>
                      <Input type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={handleDocUpload} />
                    </label>
                  )}
                </div>
              )}

              <Button onClick={handleCallAnalysis} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar {analysisType === 'transcricao' ? 'Transcrição' : analysisType === 'prints' ? 'Prints' : 'Documento'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Call Result */}
          {result && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Diagnóstico da Análise</CardTitle>
              </CardHeader>
              <CardContent>
                {renderCallAnalysisResult()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pipeline Analysis Tab */}
        <TabsContent value="pipeline" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle>Analisador de Pipeline</CardTitle>
                </div>
                <Button onClick={handlePipelineAnalysis} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analisar Pipeline
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                Identifique padrões de sucesso e fracasso nos seus leads
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">O que analisamos</p>
                    <p className="font-semibold">Leads Fechados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comparamos com</p>
                    <p className="font-semibold">Leads Perdidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Para encontrar</p>
                    <p className="font-semibold">Padrões de Sucesso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Result */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Relatório de Análise</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="prose-ai-content max-h-[500px] overflow-y-auto pr-2">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">Clique em "Analisar Pipeline" para identificar padrões</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* History - shared across tabs */}
      <AIToolHistoryPanel
        history={history}
        loading={loadingHistory}
        onSelect={(entry) => {
          setResult(entry.output_text || '');
          toast.success('Análise carregada do histórico');
        }}
      />
    </div>
  );
}
