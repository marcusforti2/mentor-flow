import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Users,
  Trash2,
} from "lucide-react";

interface LeadUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
  membershipId: string;
  tenantId?: string;
}

interface ExtractedLead {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  temperature: "cold" | "warm" | "hot";
  interests?: string[];
  objections?: string[];
  insights?: string[];
  suggested_approach?: string;
  conversation_summary?: string;
  source_type?: string;
  image_indices?: number[];
}

const temperatureOptions = [
  { value: "cold", label: "Frio", color: "bg-blue-500/20 text-blue-400" },
  { value: "warm", label: "Morno", color: "bg-amber-500/20 text-amber-400" },
  { value: "hot", label: "Quente", color: "bg-red-500/20 text-red-400" },
];

export function LeadUploadModal({
  open,
  onOpenChange,
  onLeadCreated,
  membershipId,
  tenantId,
}: LeadUploadModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "analyzing" | "review">("upload");
  const [images, setImages] = useState<string[]>([]);
  const [leads, setLeads] = useState<ExtractedLead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

  const analyzeImages = async () => {
    if (images.length === 0) {
      toast({
        title: "Nenhuma imagem",
        description: "Adicione pelo menos uma imagem para analisar.",
        variant: "destructive",
      });
      return;
    }

    setStep("analyzing");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Não autenticado");
      }

      const response = await supabase.functions.invoke("analyze-lead-screenshots", {
        body: { images },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const extractedLeads = (response.data.leads || []) as ExtractedLead[];
      
      if (extractedLeads.length === 0) {
        throw new Error("Nenhum lead identificado nas imagens");
      }

      setLeads(extractedLeads);
      setCurrentLeadIndex(0);
      setStep("review");
    } catch (error) {
      console.error("Error analyzing images:", error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Erro ao analisar imagens",
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  const updateLead = (index: number, updates: Partial<ExtractedLead>) => {
    setLeads((prev) => prev.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  };

  const removeLead = (index: number) => {
    setLeads((prev) => prev.filter((_, i) => i !== index));
    if (currentLeadIndex >= leads.length - 1) {
      setCurrentLeadIndex(Math.max(0, leads.length - 2));
    }
  };

  const saveAllLeads = async () => {
    if (leads.length === 0) return;

    setIsSubmitting(true);

    try {
      // Upload all images to storage first
      const uploadedUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i].split(",")[1];
        const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const fileName = `${membershipId}/${Date.now()}-${i}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("lead-screenshots")
          .upload(fileName, byteArray, { contentType: "image/png" });

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else if (uploadData) {
          uploadedUrls.push(uploadData.path);
        }
      }

      // Insert all leads
      const insertData = leads.map((lead) => {
        const leadImageUrls = (lead.image_indices || [])
          .filter((idx) => idx < uploadedUrls.length)
          .map((idx) => uploadedUrls[idx]);

        return {
          membership_id: membershipId,
          tenant_id: tenantId,
          contact_name: lead.name,
          contact_email: lead.email || null,
          contact_phone: lead.phone || null,
          company: lead.company || null,
          temperature: lead.temperature,
          status: "new",
          ai_insights: {
            interests: lead.interests,
            objections: lead.objections,
            insights: lead.insights,
            suggested_approach: lead.suggested_approach,
            conversation_summary: lead.conversation_summary,
            source_type: lead.source_type,
          },
          screenshot_urls: leadImageUrls.length > 0 ? leadImageUrls : uploadedUrls,
        };
      });

      const { error: insertError } = await supabase
        .from("crm_prospections")
        .insert(insertData);

      if (insertError) throw insertError;

      toast({
        title: `${leads.length} lead${leads.length > 1 ? "s" : ""} criado${leads.length > 1 ? "s" : ""}!`,
        description: leads.map((l) => l.name).join(", "),
      });

      onLeadCreated();
      handleClose();
    } catch (error) {
      console.error("Error saving leads:", error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro ao criar leads",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setImages([]);
    setLeads([]);
    setCurrentLeadIndex(0);
    onOpenChange(false);
  };

  const currentLead = leads[currentLeadIndex];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Novo Lead com IA
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Arraste prints de conversas ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Até 10 imagens — a IA detecta automaticamente cada lead diferente
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

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {images.length}/10 imagens
              </span>
              <Button onClick={analyzeImages} disabled={images.length === 0}>
                <Sparkles className="w-4 h-4 mr-2" />
                Analisar com IA
              </Button>
            </div>
          </div>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analisando {images.length} imagens...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Detectando leads e extraindo informações
            </p>
          </div>
        )}

        {step === "review" && currentLead && (
          <div className="space-y-4">
            {/* Lead counter & navigation */}
            <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {leads.length} lead{leads.length > 1 ? "s" : ""} detectado{leads.length > 1 ? "s" : ""}
                </span>
              </div>
              {leads.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentLeadIndex === 0}
                    onClick={() => setCurrentLeadIndex((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm tabular-nums min-w-[3ch] text-center">
                    {currentLeadIndex + 1}/{leads.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentLeadIndex === leads.length - 1}
                    onClick={() => setCurrentLeadIndex((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeLead(currentLeadIndex)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Lead pills */}
            {leads.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {leads.map((l, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentLeadIndex(i)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs border transition-all",
                      i === currentLeadIndex
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {l.name || `Lead ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            {/* Editable form */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={currentLead.name}
                    onChange={(e) => updateLead(currentLeadIndex, { name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Empresa</Label>
                  <Input
                    value={currentLead.company || ""}
                    onChange={(e) => updateLead(currentLeadIndex, { company: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={currentLead.phone || ""}
                    onChange={(e) => updateLead(currentLeadIndex, { phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={currentLead.email || ""}
                    onChange={(e) => updateLead(currentLeadIndex, { email: e.target.value })}
                  />
                </div>
              </div>

              {/* Temperature */}
              <div>
                <Label>Temperatura do Lead</Label>
                <div className="flex gap-2 mt-1">
                  {temperatureOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm border transition-all",
                        currentLead.temperature === opt.value
                          ? opt.color + " border-current"
                          : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground"
                      )}
                      onClick={() =>
                        updateLead(currentLeadIndex, { temperature: opt.value as any })
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Insights */}
              {currentLead.insights && currentLead.insights.length > 0 && (
                <div>
                  <Label>Insights da IA</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {currentLead.insights.map((insight, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {insight}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested approach */}
              {currentLead.suggested_approach && (
                <div>
                  <Label>Sugestão de Abordagem</Label>
                  <Textarea
                    value={currentLead.suggested_approach}
                    onChange={(e) =>
                      updateLead(currentLeadIndex, { suggested_approach: e.target.value })
                    }
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Images preview for this lead */}
              {currentLead.image_indices && currentLead.image_indices.length > 0 && (
                <div>
                  <Label className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Screenshots deste lead ({currentLead.image_indices.length})
                  </Label>
                  <div className="flex gap-2 mt-1 overflow-x-auto py-1">
                    {currentLead.image_indices
                      .filter((idx) => idx < images.length)
                      .map((imgIdx) => (
                        <img
                          key={imgIdx}
                          src={images[imgIdx]}
                          alt=""
                          className="h-16 w-auto rounded border"
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={saveAllLeads} disabled={isSubmitting || leads.some((l) => !l.name)}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Salvar {leads.length} Lead{leads.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
