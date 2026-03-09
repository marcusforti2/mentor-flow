import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "./LeadCard";
import type { PipelineStage } from "@/hooks/usePipelineStages";
import {
  Building2,
  Calendar,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Phone,
  Save,
  Target,
  Trash2,
  X,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  User,
  Globe,
  MapPin,
  Users,
  Zap,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  stages?: PipelineStage[];
}

const temperatureConfig = {
  hot: { label: "Quente", emoji: "🔥", color: "text-red-400 border-red-500/30 bg-red-500/10" },
  warm: { label: "Morno", emoji: "🌤️", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  cold: { label: "Frio", emoji: "❄️", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
};

const fallbackStages: PipelineStage[] = [
  { name: "Novos", status_key: "new", color: "bg-slate-500", position: 0 },
  { name: "Contato", status_key: "contacted", color: "bg-blue-500", position: 1 },
  { name: "Reunião", status_key: "meeting_scheduled", color: "bg-amber-500", position: 2 },
  { name: "Proposta", status_key: "proposal_sent", color: "bg-purple-500", position: 3 },
  { name: "Fechados", status_key: "closed_won", color: "bg-green-500", position: 4 },
  { name: "Perdidos", status_key: "closed_lost", color: "bg-red-500", position: 5 },
];

export function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onUpdate,
  stages,
}: LeadDetailSheetProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Sync notes when lead changes
  useEffect(() => {
    setNotes(lead?.notes || "");
  }, [lead?.id, lead?.notes]);

  if (!lead) return null;

  const temp = temperatureConfig[lead.temperature as keyof typeof temperatureConfig] || temperatureConfig.cold;
  const statusOptions = (stages && stages.length > 0 ? stages : fallbackStages)
    .sort((a, b) => a.position - b.position);

  const currentStage = statusOptions.find((s) => s.status_key === lead.status);
  const currentStageIndex = statusOptions.findIndex((s) => s.status_key === lead.status);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === lead.status) return;
    setChangingStatus(newStatus);
    try {
      const { error } = await supabase
        .from("crm_prospections")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", lead.id);

      if (error) throw error;
      onUpdate();
      toast({ title: "Status atualizado!" });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } finally {
      setChangingStatus(null);
    }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("crm_prospections")
        .update({ notes })
        .eq("id", lead.id);

      if (error) throw error;
      onUpdate();
      toast({ title: "Anotações salvas!" });
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("crm_prospections")
        .delete()
        .eq("id", lead.id);

      if (error) throw error;
      onUpdate();
      onOpenChange(false);
      toast({ title: "Lead excluído!" });
    } catch (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          {/* Header with gradient */}
          <div className="p-6 pb-4 border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                  {lead.contact_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="truncate">{lead.contact_name}</span>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 shrink-0", temp.color)}>
                      {temp.emoji} {temp.label}
                    </Badge>
                  </div>
                  {lead.company && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      <p className="text-sm font-normal text-muted-foreground truncate">{lead.company}</p>
                    </div>
                  )}
                </div>
              </SheetTitle>
            </SheetHeader>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status Pipeline - Visual stepper */}
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block font-semibold">
                Status
              </Label>
              <Select value={lead.status || ""} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status">
                    {currentStage && (
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full", currentStage.color)} />
                        {currentStage.name}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {statusOptions.map((stage) => (
                    <SelectItem key={stage.status_key} value={stage.status_key}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", stage.color)} />
                        {stage.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Contact info - compact cards */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Contato
              </Label>
              <div className="grid gap-2">
                {lead.contact_phone && (
                  <a
                    href={`tel:${lead.contact_phone}`}
                    className="flex items-center gap-2.5 text-sm p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-500" />
                    </div>
                    <span>{lead.contact_phone}</span>
                  </a>
                )}
                {lead.contact_email && (
                  <a
                    href={`mailto:${lead.contact_email}`}
                    className="flex items-center gap-2.5 text-sm p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="truncate">{lead.contact_email}</span>
                  </a>
                )}
                {lead.created_at && (
                  <div className="flex items-center gap-2.5 text-sm p-2.5 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Criado em</span>
                      <p className="text-sm">{format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights */}
            {lead.ai_insights && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Qualificação IA
                  </Label>

                  {/* Score */}
                  {lead.ai_insights.score !== undefined && (
                    <div className="p-4 rounded-xl border bg-gradient-to-br from-primary/5 to-transparent">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold",
                            lead.ai_insights.score >= 75 ? 'bg-green-500/15 text-green-500' :
                            lead.ai_insights.score >= 50 ? 'bg-yellow-500/15 text-yellow-500' :
                            lead.ai_insights.score >= 25 ? 'bg-orange-500/15 text-orange-500' :
                            'bg-red-500/15 text-red-500'
                          )}>
                            {lead.ai_insights.score}
                          </div>
                          <div>
                            <p className="font-medium text-sm">Score de Qualificação</p>
                            <p className="text-xs text-muted-foreground">
                              {lead.ai_insights.score >= 75 ? 'Excelente fit!' :
                               lead.ai_insights.score >= 50 ? 'Bom potencial' :
                               lead.ai_insights.score >= 25 ? 'Potencial moderado' :
                               'Baixo fit'}
                            </p>
                          </div>
                        </div>
                        {lead.ai_insights.recommendation && (
                          <Badge className={cn("text-[10px]",
                            lead.ai_insights.recommendation === 'pursue_hot' ? 'bg-green-500 hover:bg-green-600' :
                            lead.ai_insights.recommendation === 'nurture' ? 'bg-yellow-500 hover:bg-yellow-600' :
                            lead.ai_insights.recommendation === 'low_priority' ? 'bg-orange-500 hover:bg-orange-600' :
                            'bg-red-500 hover:bg-red-600'
                          )}>
                            {lead.ai_insights.recommendation === 'pursue_hot' ? '🔥 Prioridade' :
                             lead.ai_insights.recommendation === 'nurture' ? '🌱 Nutrir' :
                             lead.ai_insights.recommendation === 'low_priority' ? '⏳ Baixa' :
                             '❌ Não fit'}
                          </Badge>
                        )}
                      </div>
                      <Progress value={lead.ai_insights.score} className="h-1.5" />
                    </div>
                  )}

                  {/* Summary */}
                  {lead.ai_insights.summary && (
                    <div className="p-3 bg-muted/40 rounded-lg">
                      <p className="text-sm leading-relaxed">{lead.ai_insights.summary}</p>
                    </div>
                  )}

                  {/* Tabs */}
                  {(lead.ai_insights.pain_points || lead.ai_insights.opportunities || lead.ai_insights.approach_strategy) && (
                    <Tabs defaultValue="opportunities" className="w-full">
                      <TabsList className="w-full grid grid-cols-3 h-9">
                        <TabsTrigger value="opportunities" className="text-[11px] gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Oport.
                        </TabsTrigger>
                        <TabsTrigger value="pain_points" className="text-[11px] gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Dores
                        </TabsTrigger>
                        <TabsTrigger value="approach" className="text-[11px] gap-1">
                          <Target className="w-3 h-3" />
                          Abordagem
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="opportunities" className="mt-3">
                        {lead.ai_insights.opportunities?.length ? (
                          <ul className="space-y-2">
                            {lead.ai_insights.opportunities.map((opp, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-green-500/5">
                                <Zap className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                <span>{opp}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                        )}
                      </TabsContent>

                      <TabsContent value="pain_points" className="mt-3">
                        {lead.ai_insights.pain_points?.length ? (
                          <ul className="space-y-2">
                            {lead.ai_insights.pain_points.map((pain, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-orange-500/5">
                                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <span>{pain}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                        )}
                      </TabsContent>

                      <TabsContent value="approach" className="mt-3 space-y-3">
                        {lead.ai_insights.approach_strategy ? (
                          <>
                            {lead.ai_insights.approach_strategy.opening_hook && (
                              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">🎯 Gancho de Abertura</p>
                                <p className="text-sm">{lead.ai_insights.approach_strategy.opening_hook}</p>
                              </div>
                            )}
                            {lead.ai_insights.approach_strategy.value_proposition && (
                              <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-1">💎 Proposta de Valor</p>
                                <p className="text-sm">{lead.ai_insights.approach_strategy.value_proposition}</p>
                              </div>
                            )}
                            {lead.ai_insights.approach_strategy.conversation_starters?.length ? (
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">💬 Iniciadores de Conversa</p>
                                <ul className="space-y-1.5">
                                  {lead.ai_insights.approach_strategy.conversation_starters.map((starter, idx) => (
                                    <li key={idx} className="text-sm p-2.5 bg-muted/30 rounded-lg italic">"{starter}"</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}

                  {/* Extracted Profile Data */}
                  {lead.ai_insights.extracted_data && (
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3 h-3" /> Perfil Extraído
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {lead.ai_insights.extracted_data.platform && (
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3 h-3 text-muted-foreground" />
                            <span className="capitalize">{lead.ai_insights.extracted_data.platform}</span>
                          </div>
                        )}
                        {lead.ai_insights.extracted_data.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span>{lead.ai_insights.extracted_data.location}</span>
                          </div>
                        )}
                        {lead.ai_insights.extracted_data.followers && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span>{lead.ai_insights.extracted_data.followers} seguidores</span>
                          </div>
                        )}
                        {lead.ai_insights.extracted_data.website && (
                          <div className="flex items-center gap-1.5 col-span-2">
                            <Globe className="w-3 h-3 text-muted-foreground" />
                            <a href={lead.ai_insights.extracted_data.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                              {lead.ai_insights.extracted_data.website}
                            </a>
                          </div>
                        )}
                      </div>
                      {lead.ai_insights.extracted_data.bio && (
                        <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">"{lead.ai_insights.extracted_data.bio}"</p>
                      )}
                    </div>
                  )}

                  {/* Legacy insights */}
                  {lead.ai_insights.insights?.length && !lead.ai_insights.score ? (
                    <div className="flex flex-wrap gap-1.5">
                      {lead.ai_insights.insights.map((insight, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {insight}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {lead.ai_insights.suggested_approach && !lead.ai_insights.score && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-1 text-[10px] text-primary uppercase tracking-wider font-semibold mb-1">
                        <Target className="w-3 h-3" />
                        Sugestão de Abordagem
                      </div>
                      <p className="text-sm">{lead.ai_insights.suggested_approach}</p>
                    </div>
                  )}

                  {lead.ai_insights.conversation_summary && (
                    <div className="p-3 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                        <MessageSquare className="w-3 h-3" />
                        Resumo da Conversa
                      </div>
                      <p className="text-sm">{lead.ai_insights.conversation_summary}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Screenshots */}
            {lead.screenshot_urls && lead.screenshot_urls.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Screenshots ({lead.screenshot_urls.length})
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {lead.screenshot_urls.map((url, idx) => {
                      const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/lead-screenshots/${url}`;
                      return (
                        <img
                          key={idx}
                          src={publicUrl}
                          alt=""
                          className="aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border"
                          onClick={() => setSelectedImage(publicUrl)}
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Anotações
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre este lead..."
                rows={4}
                className="resize-none"
              />
              <Button size="sm" onClick={handleSaveNotes} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                Salvar
              </Button>
            </div>

            <Separator />

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full" disabled={isDeleting}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir Lead
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir <strong>{lead.contact_name}</strong>? 
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "Excluindo..." : "Excluir"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SheetContent>
      </Sheet>

      {/* Image modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-4 right-4 text-white" onClick={() => setSelectedImage(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={selectedImage} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}
