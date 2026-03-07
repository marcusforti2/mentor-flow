import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Brain, Loader2, Sparkles, TrendingUp, Clock, Users, Target,
  ArrowRight, Copy, Save, CheckCircle2, Zap,
} from "lucide-react";

interface CadenceStep {
  day: number;
  channel: string;
  message: string;
  objective: string;
}

interface AIInsight {
  segment: string;
  count: number;
  recommendation: string;
  urgency: "high" | "medium" | "low";
  cadence: CadenceStep[];
}

interface Mentee {
  id: string;
  user_id: string;
  profile?: { full_name: string | null; phone: string | null };
}

interface IntelligenceProps {
  mentees: Mentee[];
}

export function WhatsAppIntelligence({ mentees }: IntelligenceProps) {
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<AIInsight[] | null>(null);
  const [analysisType, setAnalysisType] = useState("follow_up");
  const [customContext, setCustomContext] = useState("");
  const [isSavingCadence, setIsSavingCadence] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!activeMembership) return;
    setIsAnalyzing(true);
    setInsights(null);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-intelligence", {
        body: {
          tenant_id: activeMembership.tenant_id,
          analysis_type: analysisType,
          custom_context: customContext,
        },
      });

      if (error) throw error;
      if (data?.insights) {
        setInsights(data.insights);
        toast({ title: "Análise concluída! 🧠", description: `${data.insights.length} segmentos identificados` });
      }
    } catch (err: any) {
      toast({ title: "Erro na análise", description: err.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAsFlow = async (insight: AIInsight, idx: number) => {
    if (!activeMembership) return;
    setIsSavingCadence(idx);

    try {
      const steps = insight.cadence.map((step, i) => ({
        order: i + 1,
        delay_hours: step.day * 24,
        message_template: step.message,
      }));

      await supabase
        .from("whatsapp_automation_flows" as any)
        .insert({
          tenant_id: activeMembership.tenant_id,
          owner_membership_id: activeMembership.id,
          name: `IA: ${insight.segment}`,
          description: insight.recommendation,
          trigger_type: "manual",
          steps,
          is_active: false,
          audience_type: "all_mentees",
        } as any);

      toast({ title: "Fluxo salvo! 🚀", description: "Acesse a aba Automações para ativar." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingCadence(null);
    }
  };

  const urgencyColors = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  const urgencyLabels = { high: "Urgente", medium: "Moderado", low: "Baixo" };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Inteligência Comercial com IA
          </CardTitle>
          <CardDescription className="text-xs">
            A IA analisa sua base de mentorados, identifica padrões e sugere cadências de follow-up que convertem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Tipo de Análise</Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow_up">🎯 Follow-up Inteligente</SelectItem>
                  <SelectItem value="reactivation">🔄 Reativação de Inativos</SelectItem>
                  <SelectItem value="onboarding">🚀 Onboarding Sequencial</SelectItem>
                  <SelectItem value="nurturing">💡 Nutrição de Engajamento</SelectItem>
                  <SelectItem value="upsell">💰 Upsell e Renovação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Contexto adicional (opcional)</Label>
              <Input
                placeholder="Ex: Foco em vendas B2B, próximo evento é dia 15..."
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-primary hover:bg-primary/90"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando base...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Analisar e Sugerir Cadências
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {insights && insights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{insights.length} segmentos identificados</h3>
          </div>

          {insights.map((insight, idx) => (
            <Card key={idx} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      {insight.segment}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {insight.recommendation}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={urgencyColors[insight.urgency]}>
                      {urgencyLabels[insight.urgency]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {insight.count} contatos
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Cadence timeline */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Cadência sugerida ({insight.cadence.length} etapas)
                  </Label>
                  <div className="relative">
                    {insight.cadence.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex gap-3 mb-3 last:mb-0">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center">
                          <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-500 shrink-0">
                            {stepIdx + 1}
                          </div>
                          {stepIdx < insight.cadence.length - 1 && (
                            <div className="w-px h-full bg-border flex-1 mt-1" />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 bg-muted/30 rounded-lg p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              Dia {step.day}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{step.objective}</span>
                          </div>
                          <p className="text-xs leading-relaxed">{step.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      const text = insight.cadence.map(s => `Dia ${s.day}: ${s.message}`).join("\n\n");
                      navigator.clipboard.writeText(text);
                      toast({ title: "Copiado! 📋" });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleSaveAsFlow(insight, idx)}
                    disabled={isSavingCadence === idx}
                  >
                    {isSavingCadence === idx ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Salvar como Fluxo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {insights && insights.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum segmento identificado. Adicione mais mentorados à sua base.</p>
        </div>
      )}
    </div>
  );
}
