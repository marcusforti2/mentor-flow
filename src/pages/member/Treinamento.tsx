import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  XCircle,
  Lightbulb,
  MessageSquare,
  Save,
  History,
  ChevronDown,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComoMelhorarItem {
  titulo: string;
  detalhes: string;
}

interface AnalysisResult {
  pontos_fortes: string[];
  pontos_fracos: string[];
  muda_urgente: string[];
  ouro_nao_mude: string[];
  errou_feio: string[];
  como_melhorar: (string | ComoMelhorarItem)[];
  resumo: string;
  nota_geral: number;
}

interface SavedAnalysis {
  id: string;
  analysis_type: string;
  nota_geral: number;
  resumo: string;
  pontos_fortes: string[];
  pontos_fracos: string[];
  muda_urgente: string[];
  ouro_nao_mude: string[];
  errou_feio: string[];
  como_melhorar: (string | ComoMelhorarItem)[];
  created_at: string;
}

export default function Treinamento() {
  const { user } = useAuth();
  const [mentoradoId, setMentoradoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"transcricao" | "prints">("transcricao");
  const [viewMode, setViewMode] = useState<"new" | "history">("new");
  
  // Transcription state
  const [transcription, setTranscription] = useState("");
  const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
  
  // Prints state
  const [images, setImages] = useState<string[]>([]);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  // History state
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);

  useEffect(() => {
    const fetchMentoradoId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("mentorados")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (data) setMentoradoId(data.id);
    };
    fetchMentoradoId();
  }, [user]);

  // Load history when switching to history tab
  useEffect(() => {
    if (viewMode === "history" && mentoradoId) {
      loadHistory();
    }
  }, [viewMode, mentoradoId]);

  const loadHistory = async () => {
    if (!mentoradoId) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("training_analyses")
        .select("*")
        .eq("mentorado_id", mentoradoId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        ...item,
        pontos_fortes: item.pontos_fortes as string[] || [],
        pontos_fracos: item.pontos_fracos as string[] || [],
        muda_urgente: item.muda_urgente as string[] || [],
        ouro_nao_mude: item.ouro_nao_mude as string[] || [],
        errou_feio: item.errou_feio as string[] || [],
        como_melhorar: item.como_melhorar as (string | ComoMelhorarItem)[] || [],
      }));
      
      setSavedAnalyses(transformedData);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handle PDF file upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setTranscriptionFile(file);
      toast.info("PDF carregado! A IA irá extrair o texto.");
    } else if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setTranscription(text);
      };
      reader.readAsText(file);
    }
  };

  // Handle image file select
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 10 - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  }, [images.length]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    const remainingSlots = 10 - images.length;
    const filesToProcess = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  }, [images.length]);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Analyze content
  const analyzeContent = async () => {
    if (activeTab === "transcricao" && !transcription && !transcriptionFile) {
      toast.error("Adicione uma transcrição ou arquivo para analisar.");
      return;
    }
    if (activeTab === "prints" && images.length === 0) {
      toast.error("Adicione pelo menos uma imagem para analisar.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setExpandedItems(new Set());

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Não autenticado");
      }

      let payload: any = {
        type: "training_analysis",
        analysis_type: activeTab,
      };

      if (activeTab === "transcricao") {
        if (transcriptionFile && transcriptionFile.type === "application/pdf") {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(transcriptionFile);
          });
          payload.pdf_base64 = base64;
        } else {
          payload.transcription = transcription;
        }
      } else {
        payload.images = images;
      }

      const response = await supabase.functions.invoke("ai-analysis", {
        body: payload,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const result = response.data?.result;
      if (typeof result === "string") {
        try {
          const parsed = JSON.parse(result);
          setAnalysisResult(parsed);
        } catch {
          setAnalysisResult({
            pontos_fortes: [],
            pontos_fracos: [],
            muda_urgente: [],
            ouro_nao_mude: [],
            errou_feio: [],
            como_melhorar: [],
            resumo: result,
            nota_geral: 0,
          });
        }
      } else if (result) {
        setAnalysisResult(result);
      }
    } catch (error) {
      console.error("Error analyzing:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao analisar conteúdo");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save analysis
  const saveAnalysis = async () => {
    if (!analysisResult || !mentoradoId) {
      toast.error("Nenhuma análise para salvar");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("training_analyses").insert({
        mentorado_id: mentoradoId,
        analysis_type: activeTab,
        nota_geral: analysisResult.nota_geral,
        resumo: analysisResult.resumo,
        pontos_fortes: analysisResult.pontos_fortes as unknown as any,
        pontos_fracos: analysisResult.pontos_fracos as unknown as any,
        muda_urgente: analysisResult.muda_urgente as unknown as any,
        ouro_nao_mude: analysisResult.ouro_nao_mude as unknown as any,
        errou_feio: analysisResult.errou_feio as unknown as any,
        como_melhorar: analysisResult.como_melhorar as unknown as any,
      });

      if (error) throw error;
      toast.success("Análise salva com sucesso!");
      
      // Reload history
      await loadHistory();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar análise");
    } finally {
      setIsSaving(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setTranscription("");
    setTranscriptionFile(null);
    setImages([]);
    setExpandedItems(new Set());
  };

  const toggleExpand = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getNoteColor = (nota: number) => {
    if (nota >= 80) return "text-green-500";
    if (nota >= 60) return "text-amber-500";
    return "text-red-500";
  };

  // Render a single como_melhorar item
  const renderComoMelhorarItem = (item: string | ComoMelhorarItem, idx: number) => {
    const isExpanded = expandedItems.has(idx);
    
    // Check if item is the new format with titulo/detalhes
    if (typeof item === "object" && item.titulo && item.detalhes) {
      return (
        <Collapsible key={idx} open={isExpanded} onOpenChange={() => toggleExpand(idx)}>
          <CollapsibleTrigger asChild>
            <div className="text-sm flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 cursor-pointer hover:bg-primary/15 transition-colors">
              <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.titulo}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-primary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-primary" />
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 ml-6 p-3 bg-muted/50 rounded-lg border text-sm text-muted-foreground whitespace-pre-wrap">
              {item.detalhes}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }
    
    // Fallback for string items (old format)
    return (
      <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
        <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        {String(item)}
      </li>
    );
  };

  // Render the analysis result (reusable for both current and history)
  const renderAnalysisContent = (result: AnalysisResult | SavedAnalysis) => (
    <div className="space-y-6">
      {/* Resumo */}
      {result.resumo && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm">{result.resumo}</p>
        </div>
      )}

      {/* Ouro - não mude */}
      {result.ouro_nao_mude?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
            <Trophy className="w-5 h-5" />
            <h3 className="font-semibold">🏆 Seu Ouro - Não Mude!</h3>
          </div>
          <ul className="space-y-1.5">
            {result.ouro_nao_mude.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Trophy className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pontos Fortes */}
      {result.pontos_fortes?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-500">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-semibold">Pontos Fortes</h3>
          </div>
          <ul className="space-y-1.5">
            {result.pontos_fortes.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <TrendingUp className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Muda Urgente */}
      {result.muda_urgente?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-500">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold">⚡ Muda Urgente AGORA!</h3>
          </div>
          <ul className="space-y-1.5">
            {result.muda_urgente.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Errou Feio */}
      {result.errou_feio?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="w-5 h-5" />
            <h3 className="font-semibold">❌ Aqui Você Errou Feio</h3>
          </div>
          <ul className="space-y-1.5">
            {result.errou_feio.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pontos Fracos */}
      {result.pontos_fracos?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingDown className="w-5 h-5" />
            <h3 className="font-semibold">Pontos Fracos</h3>
          </div>
          <ul className="space-y-1.5">
            {result.pontos_fracos.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-muted/50 rounded-lg border">
                <TrendingDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Como Melhorar */}
      {result.como_melhorar?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="w-5 h-5" />
            <h3 className="font-semibold">💡 Como Melhorar</h3>
            <span className="text-xs text-muted-foreground">(clique para expandir)</span>
          </div>
          <ul className="space-y-2">
            {result.como_melhorar.map((item, idx) => renderComoMelhorarItem(item, idx))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 px-4 md:px-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Treinamento de Vendas</h1>
          <p className="text-muted-foreground">
            Analise suas conversas e transcrições para melhorar sua performance
          </p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "new" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("new")}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Nova Análise
          </Button>
          <Button
            variant={viewMode === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("history")}
          >
            <History className="w-4 h-4 mr-2" />
            Histórico
            {savedAnalyses.length > 0 && (
              <Badge variant="secondary" className="ml-2">{savedAnalyses.length}</Badge>
            )}
          </Button>
        </div>
      </div>

      {viewMode === "new" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Envie para Análise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="transcricao" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Transcrição
                  </TabsTrigger>
                  <TabsTrigger value="prints" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Prints
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="transcricao" className="space-y-4 mt-4">
                  <div
                    className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById("pdf-input")?.click()}
                  >
                    <input
                      id="pdf-input"
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      className="hidden"
                      onChange={handlePdfUpload}
                    />
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Arraste um PDF ou arquivo de texto
                    </p>
                    {transcriptionFile && (
                      <Badge variant="secondary" className="mt-2">
                        {transcriptionFile.name}
                      </Badge>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <span className="bg-background px-2 text-xs text-muted-foreground">
                        ou cole a transcrição
                      </span>
                    </div>
                    <hr className="border-muted-foreground/20" />
                  </div>

                  <Textarea
                    placeholder="Cole aqui a transcrição da sua reunião ou chamada de vendas..."
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                </TabsContent>

                <TabsContent value="prints" className="space-y-4 mt-4">
                  <div
                    className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("image-input")?.click()}
                  >
                    <input
                      id="image-input"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Arraste prints de conversas ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Até 10 imagens (WhatsApp, Instagram, etc.)
                    </p>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(idx);
                            }}
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground text-right">
                    {images.length}/10 imagens
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 mt-4">
                {analysisResult && (
                  <Button variant="outline" onClick={clearAnalysis}>
                    Limpar
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={analyzeContent}
                  disabled={isAnalyzing || (activeTab === "transcricao" && !transcription && !transcriptionFile) || (activeTab === "prints" && images.length === 0)}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analisar com IA
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Análise da IA
                </span>
                <div className="flex items-center gap-2">
                  {analysisResult?.nota_geral !== undefined && analysisResult.nota_geral > 0 && (
                    <span className={`text-2xl font-bold ${getNoteColor(analysisResult.nota_geral)}`}>
                      {analysisResult.nota_geral}/100
                    </span>
                  )}
                  {analysisResult && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveAnalysis}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1" />
                          Salvar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Analisando sua performance...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Isso pode levar alguns segundos
                  </p>
                </div>
              ) : analysisResult ? (
                <ScrollArea className="h-[500px] pr-4">
                  {renderAnalysisContent(analysisResult)}
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Envie uma transcrição ou prints de conversa para receber uma análise detalhada
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    A IA vai identificar pontos fortes, fracos e sugerir melhorias
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* History View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Suas Análises
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : savedAnalyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma análise salva</p>
                  <p className="text-xs mt-1">Faça uma análise e salve para ver aqui</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2 pr-4">
                    {savedAnalyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAnalysis?.id === analysis.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedAnalysis(analysis)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="secondary">
                            {analysis.analysis_type === "transcricao" ? (
                              <><FileText className="w-3 h-3 mr-1" /> Transcrição</>
                            ) : (
                              <><MessageSquare className="w-3 h-3 mr-1" /> Prints</>
                            )}
                          </Badge>
                          <span className={`font-bold ${getNoteColor(analysis.nota_geral)}`}>
                            {analysis.nota_geral}/100
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {analysis.resumo || "Sem resumo"}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(analysis.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Selected Analysis Detail */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Detalhes da Análise
                </span>
                {selectedAnalysis && (
                  <span className={`text-2xl font-bold ${getNoteColor(selectedAnalysis.nota_geral)}`}>
                    {selectedAnalysis.nota_geral}/100
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAnalysis ? (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedAnalysis.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    <Badge variant="secondary" className="ml-2">
                      {selectedAnalysis.analysis_type === "transcricao" ? "Transcrição" : "Prints"}
                    </Badge>
                  </div>
                  {renderAnalysisContent(selectedAnalysis)}
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Selecione uma análise ao lado para ver os detalhes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
