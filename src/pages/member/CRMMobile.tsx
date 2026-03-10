import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useTenant } from "@/contexts/TenantContext";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { logActivity } from "@/hooks/useActivityLog";
import type { Lead } from "@/components/crm/LeadCard";
import {
  Camera,
  ChevronRight,
  Building2,
  Loader2,
  Phone,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
  UserPlus,
  ArrowLeft,
  Calendar,
  Mail,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type MobileView = "home" | "ai-upload" | "manual" | "lead-detail";

const temperatureConfig: Record<string, { label: string; emoji: string; color: string }> = {
  hot: { label: "Quente", emoji: "🔥", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  warm: { label: "Morno", emoji: "🌤️", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  cold: { label: "Frio", emoji: "❄️", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export default function CRMMobile() {
  const { toast } = useToast();
  const { activeMembership } = useTenant();
  const membershipId = activeMembership?.id;
  const tenantId = activeMembership?.tenant_id;
  const { stages } = usePipelineStages(tenantId, membershipId);

  const [view, setView] = useState<MobileView>("home");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterStage, setFilterStage] = useState<string>("all");

  // AI Upload state
  const [images, setImages] = useState<string[]>([]);
  const [extractedLeads, setExtractedLeads] = useState<any[]>([]);
  const [aiStep, setAiStep] = useState<"capture" | "analyzing" | "review">("capture");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual form state
  const [manualForm, setManualForm] = useState({
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    company: "",
    temperature: "cold",
    notes: "",
  });

  useEffect(() => {
    if (membershipId) loadLeads();
    else setIsLoading(false);
  }, [membershipId]);

  const loadLeads = async () => {
    if (!membershipId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("crm_prospections")
        .select("*")
        .eq("membership_id", membershipId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeads((data || []) as Lead[]);
    } catch {
      toast({ title: "Erro ao carregar leads", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ───── AI Upload Logic ─────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 10 - images.length;
    Array.from(files).slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setImages((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, [images.length]);

  const analyzeImages = async () => {
    if (images.length === 0) return;
    setAiStep("analyzing");
    try {
      const response = await supabase.functions.invoke("analyze-lead-screenshots", {
        body: { images },
      });
      if (response.error) throw new Error(response.error.message);
      const extracted = response.data.leads || [];
      if (extracted.length === 0) throw new Error("Nenhum lead detectado");
      setExtractedLeads(extracted);
      setAiStep("review");
    } catch (error) {
      toast({ title: "Erro na análise", description: error instanceof Error ? error.message : "Erro", variant: "destructive" });
      setAiStep("capture");
    }
  };

  const saveAILeads = async () => {
    if (!membershipId || extractedLeads.length === 0) return;
    setIsSubmitting(true);
    try {
      // Upload images
      const uploadedUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const base64 = images[i].split(",")[1];
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const fileName = `${membershipId}/${Date.now()}-${i}.png`;
        const { data } = await supabase.storage.from("lead-screenshots").upload(fileName, bytes, { contentType: "image/png" });
        if (data) uploadedUrls.push(data.path);
      }

      const insertData = extractedLeads.map((lead: any) => {
        const sourceType = lead.source_type || "other";
        const noteParts: string[] = [];
        if (lead.conversation_summary) noteParts.push(`📝 ${lead.conversation_summary}`);
        if (lead.suggested_approach) noteParts.push(`💡 ${lead.suggested_approach}`);
        if (lead.insights?.length) noteParts.push(`🔎 Insights: ${lead.insights.join("; ")}`);
        if (lead.objections?.length) noteParts.push(`⚠️ Objeções: ${lead.objections.join("; ")}`);

        return {
          membership_id: membershipId,
          tenant_id: tenantId,
          contact_name: lead.name || "Lead Desconhecido",
          contact_email: lead.email || null,
          contact_phone: lead.phone || null,
          whatsapp: sourceType === "whatsapp" ? (lead.phone || null) : null,
          company: lead.company || null,
          temperature: lead.temperature || "cold",
          status: "new",
          notes: noteParts.length > 0 ? noteParts.join("\n\n") : null,
          ai_insights: {
            interests: lead.interests,
            objections: lead.objections,
            insights: lead.insights,
            suggested_approach: lead.suggested_approach,
            conversation_summary: lead.conversation_summary,
            source_type: sourceType,
          },
          screenshot_urls: uploadedUrls,
        };
      });

      const { error } = await supabase.from("crm_prospections").insert(insertData);
      if (error) throw error;

      toast({ title: `${extractedLeads.length} lead(s) criado(s)!` });
      logActivity({ membershipId, tenantId, actionType: "lead_created", description: "Lead via IA mobile", pointsEarned: 10 });
      resetAI();
      setView("home");
      loadLeads();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAI = () => {
    setImages([]);
    setExtractedLeads([]);
    setAiStep("capture");
  };

  // ───── Manual Lead ─────
  const handleManualSubmit = async () => {
    if (!membershipId || !manualForm.contact_name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("crm_prospections").insert({
        membership_id: membershipId,
        tenant_id: tenantId,
        contact_name: manualForm.contact_name.trim(),
        contact_phone: manualForm.contact_phone.trim() || null,
        contact_email: manualForm.contact_email.trim() || null,
        company: manualForm.company.trim() || null,
        temperature: manualForm.temperature,
        notes: manualForm.notes.trim() || null,
        status: "new",
      });
      if (error) throw error;
      toast({ title: "Lead cadastrado!" });
      logActivity({ membershipId, tenantId, actionType: "lead_created", description: "Lead manual mobile", pointsEarned: 5 });
      setManualForm({ contact_name: "", contact_phone: "", contact_email: "", company: "", temperature: "cold", notes: "" });
      setView("home");
      loadLeads();
    } catch {
      toast({ title: "Erro ao cadastrar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ───── Lead Actions ─────
  const handleNextStage = async (lead: Lead) => {
    const currentIdx = stages.findIndex((s) => s.status_key === lead.status);
    if (currentIdx < 0 || currentIdx >= stages.length - 1) return;
    const nextStage = stages[currentIdx + 1];
    try {
      const { error } = await supabase
        .from("crm_prospections")
        .update({ status: nextStage.status_key })
        .eq("id", lead.id);
      if (error) throw error;
      toast({ title: `Movido para ${nextStage.name}` });
      if (membershipId) logActivity({ membershipId, tenantId, actionType: "lead_status_changed", description: `Lead → ${nextStage.name}`, metadata: { leadId: lead.id } });
      loadLeads();
      setSelectedLead(null);
    } catch {
      toast({ title: "Erro ao mover", variant: "destructive" });
    }
  };

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("crm_prospections")
        .update({ status: newStatus })
        .eq("id", lead.id);
      if (error) throw error;
      const stageName = stages.find((s) => s.status_key === newStatus)?.name || newStatus;
      toast({ title: `Movido para ${stageName}` });
      // Update selectedLead in place so detail view stays current
      setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
      loadLeads();
    } catch {
      toast({ title: "Erro ao mover", variant: "destructive" });
    }
  };

  // ───── Filtered Leads ─────
  const filteredLeads = leads.filter((l) => {
    const matchSearch = l.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStage = filterStage === "all" || l.status === filterStage;
    return matchSearch && matchStage;
  });

  // ───── RENDER ─────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ═══════ HOME VIEW ═══════
  if (view === "home") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-4 pt-[env(safe-area-inset-top)] pb-3">
          <h1 className="text-xl font-display font-bold mt-3">Meu CRM</h1>
          <p className="text-xs text-muted-foreground">{leads.length} leads no pipeline</p>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => { resetAI(); setView("ai-upload"); }}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium">Print com IA</span>
            <span className="text-[10px] text-muted-foreground text-center">Suba prints e a IA extrai</span>
          </button>

          <button
            onClick={() => setView("manual")}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-muted/50 border border-border active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">Cadastro Manual</span>
            <span className="text-[10px] text-muted-foreground text-center">Adicione dados na mão</span>
          </button>
        </div>

        {/* Search + Filter */}
        <div className="px-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterStage("all")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  filterStage === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                Todos ({leads.length})
              </button>
              {stages.map((s) => {
                const count = leads.filter((l) => l.status === s.status_key).length;
                return (
                  <button
                    key={s.status_key}
                    onClick={() => setFilterStage(s.status_key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                      filterStage === s.status_key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {s.name} ({count})
                  </button>
                );
              })}
            </div>
        </div>

        {/* Lead List */}
        <div className="flex-1 px-4 py-3 space-y-2 pb-24">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Nenhum lead encontrado</p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const temp = temperatureConfig[lead.temperature || "cold"] || temperatureConfig.cold;
              const stage = stages.find((s) => s.status_key === lead.status);
              const initials = lead.contact_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const currentIdx = stages.findIndex((s) => s.status_key === lead.status);
              const hasNext = currentIdx >= 0 && currentIdx < stages.length - 1;
              const nextStage = hasNext ? stages[currentIdx + 1] : null;

              return (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card active:bg-muted/50 transition-colors"
                  onClick={() => { setSelectedLead(lead); setView("lead-detail"); }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">{lead.contact_name}</span>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", temp.color)}>
                        {temp.emoji}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lead.company && (
                        <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {lead.company}
                        </span>
                      )}
                      {stage && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {stage.name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Next Stage Quick Action */}
                  {hasNext && nextStage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNextStage(lead); }}
                      className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center active:bg-primary/20 transition-colors"
                      title={`Mover para ${nextStage.name}`}
                    >
                      <ChevronRight className="w-5 h-5 text-primary" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ═══════ AI UPLOAD VIEW ═══════
  if (view === "ai-upload") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-4 pt-[env(safe-area-inset-top)] pb-3 flex items-center gap-3">
          <button onClick={() => { resetAI(); setView("home"); }} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold mt-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Print com IA
            </h2>
            <p className="text-xs text-muted-foreground">Suba prints e a IA extrai os leads</p>
          </div>
        </div>

        <div className="flex-1 px-4 py-4">
          {aiStep === "capture" && (
            <div className="space-y-4">
              {/* Upload area */}
              <div
                className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center active:border-primary/60 transition-colors"
                onClick={() => document.getElementById("mobile-file-input")?.click()}
              >
                <input
                  id="mobile-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Camera className="w-12 h-12 mx-auto text-primary/60 mb-3" />
                <p className="text-sm font-medium">Toque para tirar foto ou escolher</p>
                <p className="text-xs text-muted-foreground mt-1">Até 10 imagens de conversas</p>
              </div>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < 10 && (
                    <button
                      className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                      onClick={() => document.getElementById("mobile-file-input")?.click()}
                    >
                      <Plus className="w-6 h-6 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}

              {images.length > 0 && (
                <Button onClick={analyzeImages} className="w-full h-12 rounded-xl text-base gap-2">
                  <Sparkles className="w-5 h-5" />
                  Analisar {images.length} imagem(ns)
                </Button>
              )}
            </div>
          )}

          {aiStep === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium">Analisando {images.length} imagens...</p>
              <p className="text-xs text-muted-foreground mt-1">A IA está detectando leads</p>
            </div>
          )}

          {aiStep === "review" && (
            <div className="space-y-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-center">
                <p className="text-sm font-medium">
                  {extractedLeads.length} lead(s) detectado(s) ✨
                </p>
              </div>

              {extractedLeads.map((lead, idx) => {
                const sourceEmoji: Record<string, string> = {
                  whatsapp: "📱 WhatsApp",
                  instagram: "📸 Instagram",
                  linkedin: "💼 LinkedIn",
                  facebook: "👤 Facebook",
                  twitter: "🐦 Twitter",
                  other: "🌐 Outro",
                };
                const tempConfig = temperatureConfig[lead.temperature || "cold"] || temperatureConfig.cold;
                const updateLead = (field: string, value: string) => {
                  const updated = [...extractedLeads];
                  updated[idx] = { ...updated[idx], [field]: value };
                  setExtractedLeads(updated);
                };

                return (
                  <div key={idx} className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{lead.name || `Lead ${idx + 1}`}</span>
                        {lead.source_type && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {sourceEmoji[lead.source_type] || lead.source_type}
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", tempConfig.color)}>
                          {tempConfig.emoji} {tempConfig.label}
                        </Badge>
                      </div>
                      <button
                        onClick={() => setExtractedLeads((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Nome */}
                    <Input
                      value={lead.name || ""}
                      onChange={(e) => updateLead("name", e.target.value)}
                      placeholder="Nome"
                      className="h-9"
                    />

                    {/* Telefone + Empresa */}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={lead.phone || ""}
                        onChange={(e) => updateLead("phone", e.target.value)}
                        placeholder="Telefone / WhatsApp"
                        className="h-9"
                      />
                      <Input
                        value={lead.company || ""}
                        onChange={(e) => updateLead("company", e.target.value)}
                        placeholder="Empresa / Cargo"
                        className="h-9"
                      />
                    </div>

                    {/* Email */}
                    <Input
                      value={lead.email || ""}
                      onChange={(e) => updateLead("email", e.target.value)}
                      placeholder="Email"
                      className="h-9"
                      type="email"
                    />

                    {/* Temperatura */}
                    <Select
                      value={lead.temperature || "cold"}
                      onValueChange={(v) => updateLead("temperature", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hot">🔥 Quente</SelectItem>
                        <SelectItem value="warm">🌤️ Morno</SelectItem>
                        <SelectItem value="cold">❄️ Frio</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Resumo da conversa */}
                    {lead.conversation_summary && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                        📝 {lead.conversation_summary}
                      </p>
                    )}

                    {/* Sugestão de abordagem */}
                    {lead.suggested_approach && (
                      <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/10 p-2 rounded-lg">
                        💡 {lead.suggested_approach}
                      </p>
                    )}

                    {/* Interesses */}
                    {lead.interests?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {lead.interests.map((interest: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Objeções */}
                    {lead.objections?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {lead.objections.map((obj: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                            ⚠️ {obj}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <Button
                onClick={saveAILeads}
                disabled={isSubmitting || extractedLeads.length === 0}
                className="w-full h-12 rounded-xl text-base gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                Salvar {extractedLeads.length} Lead(s)
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════ MANUAL VIEW ═══════
  if (view === "manual") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-4 pt-[env(safe-area-inset-top)] pb-3 flex items-center gap-3">
          <button onClick={() => setView("home")} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold mt-3">Cadastro Manual</h2>
            <p className="text-xs text-muted-foreground">Adicione um lead manualmente</p>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-4 pb-24">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              placeholder="Nome completo"
              value={manualForm.contact_name}
              onChange={(e) => setManualForm((f) => ({ ...f, contact_name: e.target.value }))}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={manualForm.contact_phone}
                onChange={(e) => setManualForm((f) => ({ ...f, contact_phone: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@ex.com"
                value={manualForm.contact_email}
                onChange={(e) => setManualForm((f) => ({ ...f, contact_email: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input
              placeholder="Nome da empresa"
              value={manualForm.company}
              onChange={(e) => setManualForm((f) => ({ ...f, company: e.target.value }))}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Temperatura</Label>
            <div className="flex gap-2">
              {Object.entries(temperatureConfig).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setManualForm((f) => ({ ...f, temperature: key }))}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    manualForm.temperature === key
                      ? cfg.color + " border-current"
                      : "bg-muted text-muted-foreground border-transparent"
                  )}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Observações..."
              value={manualForm.notes}
              onChange={(e) => setManualForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="rounded-xl"
            />
          </div>

          <Button
            onClick={handleManualSubmit}
            disabled={isSubmitting || !manualForm.contact_name.trim()}
            className="w-full h-12 rounded-xl text-base gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Cadastrar Lead
          </Button>
        </div>
      </div>
    );
  }

  // ═══════ LEAD DETAIL VIEW ═══════
  if (view === "lead-detail" && selectedLead) {
    const temp = temperatureConfig[selectedLead.temperature || "cold"] || temperatureConfig.cold;
    const currentIdx = stages.findIndex((s) => s.status_key === selectedLead.status);
    const hasNext = currentIdx >= 0 && currentIdx < stages.length - 1;
    const nextStage = hasNext ? stages[currentIdx + 1] : null;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-4 pt-[env(safe-area-inset-top)] pb-3 flex items-center gap-3">
          <button onClick={() => { setSelectedLead(null); setView("home"); }} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold mt-3 truncate">{selectedLead.contact_name}</h2>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5 pb-24">
          {/* Header Card */}
          <div className="p-4 rounded-2xl border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-lg font-bold text-primary">
                {selectedLead.contact_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">{selectedLead.contact_name}</h3>
                {selectedLead.company && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> {selectedLead.company}
                  </p>
                )}
              </div>
              <Badge variant="outline" className={cn("text-xs", temp.color)}>
                {temp.emoji} {temp.label}
              </Badge>
            </div>

            <div className="space-y-1.5">
              {selectedLead.contact_phone && (
                <a href={`tel:${selectedLead.contact_phone}`} className="flex items-center gap-2 text-sm text-primary">
                  <Phone className="w-4 h-4" /> {selectedLead.contact_phone}
                </a>
              )}
              {selectedLead.contact_email && (
                <a href={`mailto:${selectedLead.contact_email}`} className="flex items-center gap-2 text-sm text-primary">
                  <Mail className="w-4 h-4" /> {selectedLead.contact_email}
                </a>
              )}
              {selectedLead.created_at && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" /> {format(new Date(selectedLead.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {/* Stage Selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Etapa no Pipeline</Label>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => (
                <button
                  key={s.status_key}
                  onClick={() => handleStatusChange(selectedLead, s.status_key)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-medium transition-all",
                    selectedLead.status === s.status_key
                      ? `${s.color} text-white`
                      : "bg-muted text-muted-foreground active:bg-muted/80"
                  )}
                >
                  {selectedLead.status === s.status_key && <Check className="w-3 h-3 inline mr-1" />}
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Advance */}
          {hasNext && nextStage && (
            <Button
              onClick={() => handleNextStage(selectedLead)}
              className="w-full h-12 rounded-xl text-base gap-2"
            >
              <ChevronRight className="w-5 h-5" />
              Avançar para {nextStage.name}
            </Button>
          )}

          {/* AI Insights */}
          {selectedLead.ai_insights?.suggested_approach && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Sugestão de Abordagem
              </p>
              <p className="text-sm">{selectedLead.ai_insights.suggested_approach}</p>
            </div>
          )}

          {/* Notes */}
          {selectedLead.notes && (
            <div className="p-3 rounded-xl bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
              <p className="text-sm">{selectedLead.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
