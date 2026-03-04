import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Plus, Loader2, Trash2, Play, Pause, Clock, ArrowRight,
  MessageCircle, Zap, Wand2, Edit2, Save,
} from "lucide-react";

interface FlowStep {
  order: number;
  delay_hours: number;
  message_template: string;
}

interface AutomationFlow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  steps: FlowStep[];
  is_active: boolean;
  audience_type: string;
  created_at: string;
  last_run_at: string | null;
}

export function WhatsAppAutomationTab() {
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const [flows, setFlows] = useState<AutomationFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AI generation form
  const [objective, setObjective] = useState("");
  const [targetAudience, setTargetAudience] = useState("mentorados de vendas");
  const [tone, setTone] = useState("motivacional e profissional");
  const [numSteps, setNumSteps] = useState("5");
  const [context, setContext] = useState("");

  // Generated flow preview
  const [generatedFlow, setGeneratedFlow] = useState<{
    name: string;
    description: string;
    steps: FlowStep[];
  } | null>(null);

  // Edit mode
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
  const [editStepText, setEditStepText] = useState("");

  useEffect(() => {
    if (activeMembership) loadFlows();
  }, [activeMembership]);

  const loadFlows = async () => {
    if (!activeMembership) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("whatsapp_automation_flows" as any)
        .select("*")
        .eq("tenant_id", activeMembership.tenant_id)
        .order("created_at", { ascending: false });
      setFlows((data as any[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!objective.trim()) {
      toast({ title: "Descreva o objetivo da automação", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGeneratedFlow(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-whatsapp-flow", {
        body: {
          objective,
          target_audience: targetAudience,
          tone,
          num_steps: parseInt(numSteps),
          context,
        },
      });

      if (error) throw error;
      if (data?.flow) {
        setGeneratedFlow(data.flow);
        toast({ title: "Fluxo gerado! ✨", description: "Revise e salve para ativar." });
      } else {
        throw new Error("Resposta inválida da IA");
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar fluxo", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveFlow = async () => {
    if (!generatedFlow || !activeMembership) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("whatsapp_automation_flows" as any)
        .insert({
          tenant_id: activeMembership.tenant_id,
          owner_membership_id: activeMembership.id,
          name: generatedFlow.name,
          description: generatedFlow.description,
          trigger_type: "manual",
          steps: generatedFlow.steps,
          is_active: false,
          audience_type: "all_mentees",
        } as any);

      if (error) throw error;

      toast({ title: "Fluxo salvo! 🚀" });
      setIsCreateOpen(false);
      resetForm();
      loadFlows();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setObjective("");
    setTargetAudience("mentorados de vendas");
    setTone("motivacional e profissional");
    setNumSteps("5");
    setContext("");
    setGeneratedFlow(null);
    setEditingStepIdx(null);
  };

  const handleToggleFlow = async (id: string, isActive: boolean) => {
    try {
      await supabase
        .from("whatsapp_automation_flows" as any)
        .update({ is_active: !isActive } as any)
        .eq("id", id);
      setFlows((prev) => prev.map((f) => (f.id === id ? { ...f, is_active: !isActive } : f)));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteFlow = async (id: string) => {
    try {
      await supabase.from("whatsapp_automation_flows" as any).delete().eq("id", id);
      setFlows((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "Fluxo removido" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleEditStep = (idx: number) => {
    if (!generatedFlow) return;
    setEditingStepIdx(idx);
    setEditStepText(generatedFlow.steps[idx].message_template);
  };

  const handleSaveStepEdit = () => {
    if (!generatedFlow || editingStepIdx === null) return;
    const newSteps = [...generatedFlow.steps];
    newSteps[editingStepIdx] = { ...newSteps[editingStepIdx], message_template: editStepText };
    setGeneratedFlow({ ...generatedFlow, steps: newSteps });
    setEditingStepIdx(null);
  };

  const formatDelay = (hours: number) => {
    if (hours === 0) return "Imediato";
    if (hours < 24) return `${hours}h depois`;
    const days = Math.floor(hours / 24);
    const remaining = hours % 24;
    return remaining > 0 ? `${days}d ${remaining}h depois` : `${days}d depois`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Crie fluxos automatizados de WhatsApp com IA. A IA gera a sequência completa de mensagens.
        </p>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Criar com IA
        </Button>
      </div>

      {/* Existing flows */}
      {flows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Zap className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-semibold">Nenhuma automação</h3>
          <p className="text-sm mt-1">Use a IA para criar seu primeiro fluxo de WhatsApp!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {flows.map((flow) => (
            <Card key={flow.id} className={!flow.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{flow.name}</span>
                    </CardTitle>
                    {flow.description && (
                      <CardDescription className="text-xs line-clamp-2">{flow.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={flow.is_active ? "default" : "outline"} className="shrink-0">
                    {flow.is_active ? "Ativa" : "Pausada"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Steps preview */}
                <div className="space-y-1.5">
                  {(flow.steps as FlowStep[]).map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0 mt-0.5 w-24">
                        <Clock className="h-3 w-3" />
                        <span>{formatDelay(step.delay_hours)}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-foreground line-clamp-1">{step.message_template}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Switch
                    checked={flow.is_active}
                    onCheckedChange={() => handleToggleFlow(flow.id, flow.is_active)}
                  />
                  <span className="text-xs text-muted-foreground flex-1">
                    {(flow.steps as FlowStep[]).length} etapas
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDeleteFlow(flow.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ====== CREATE DIALOG ====== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Criar Automação com IA
            </DialogTitle>
            <DialogDescription>
              Descreva o objetivo e a IA gerará um fluxo completo de mensagens com intervalos.
            </DialogDescription>
          </DialogHeader>

          {!generatedFlow ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Objetivo da automação *</Label>
                <Textarea
                  placeholder="Ex: Sequência de boas-vindas para novos mentorados com dicas de vendas ao longo da primeira semana"
                  rows={3}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Público-alvo</Label>
                  <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº de etapas</Label>
                  <Select value={numSteps} onValueChange={setNumSteps}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 mensagens</SelectItem>
                      <SelectItem value="5">5 mensagens</SelectItem>
                      <SelectItem value="7">7 mensagens</SelectItem>
                      <SelectItem value="10">10 mensagens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tom de voz</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motivacional e profissional">Motivacional e Profissional</SelectItem>
                    <SelectItem value="amigável e informal">Amigável e Informal</SelectItem>
                    <SelectItem value="direto e objetivo">Direto e Objetivo</SelectItem>
                    <SelectItem value="inspiracional e coaching">Inspiracional e Coaching</SelectItem>
                    <SelectItem value="urgente e persuasivo">Urgente e Persuasivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contexto adicional (opcional)</Label>
                <Textarea
                  placeholder="Ex: Mentorados que vendem produtos digitais, foco em Instagram..."
                  rows={2}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleGenerate}
                disabled={isGenerating || !objective.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando fluxo...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Gerar Automação com IA
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Flow preview */}
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{generatedFlow.name}</CardTitle>
                  <CardDescription className="text-xs">{generatedFlow.description}</CardDescription>
                </CardHeader>
              </Card>

              {/* Steps */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Etapas do fluxo ({generatedFlow.steps.length})
                </Label>
                {generatedFlow.steps.map((step, idx) => (
                  <Card key={idx} className="relative">
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Etapa {step.order}
                        </Badge>
                        <Badge className="text-[10px] bg-emerald-500/20 text-emerald-600 border-emerald-500/30 shrink-0">
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          {formatDelay(step.delay_hours)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto"
                          onClick={() => editingStepIdx === idx ? handleSaveStepEdit() : handleEditStep(idx)}
                        >
                          {editingStepIdx === idx ? (
                            <Save className="h-3 w-3" />
                          ) : (
                            <Edit2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {editingStepIdx === idx ? (
                        <Textarea
                          value={editStepText}
                          onChange={(e) => setEditStepText(e.target.value)}
                          rows={3}
                          className="text-xs"
                        />
                      ) : (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-500 inline mr-1.5" />
                          {step.message_template}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setGeneratedFlow(null)}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Gerar Novamente
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSaveFlow}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Automação
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
