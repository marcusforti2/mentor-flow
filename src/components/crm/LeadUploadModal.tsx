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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  Check,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";

interface LeadUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
  membershipId: string;
  tenantId?: string;
}

interface ExtractedData {
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
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
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

      const data = response.data.data as ExtractedData;
      setExtractedData(data);
      setEditedData(data);
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

  const saveLead = async () => {
    if (!editedData) return;

    setIsSubmitting(true);

    try {
      // Upload images to storage
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

      // Create the lead using membership_id
      const { error: insertError } = await supabase.from("crm_prospections").insert({
        membership_id: membershipId,
        tenant_id: tenantId,
        contact_name: editedData.name,
        contact_email: editedData.email || null,
        contact_phone: editedData.phone || null,
        company: editedData.company || null,
        temperature: editedData.temperature,
        status: "new",
        ai_insights: {
          interests: editedData.interests,
          objections: editedData.objections,
          insights: editedData.insights,
          suggested_approach: editedData.suggested_approach,
          conversation_summary: editedData.conversation_summary,
          source_type: editedData.source_type,
        },
        screenshot_urls: uploadedUrls,
      });

      if (insertError) throw insertError;

      toast({
        title: "Lead criado!",
        description: `${editedData.name} foi adicionado ao seu CRM.`,
      });

      onLeadCreated();
      handleClose();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro ao criar lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setImages([]);
    setExtractedData(null);
    setEditedData(null);
    onOpenChange(false);
  };

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
            {/* Dropzone */}
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
                Até 10 imagens (WhatsApp, Instagram, LinkedIn, etc.)
              </p>
            </div>

            {/* Image previews */}
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

            {/* Counter */}
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
              Identificando informações do lead
            </p>
          </div>
        )}

        {step === "review" && editedData && (
          <div className="space-y-4">
            {/* Success indicator */}
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">Análise concluída!</span>
            </div>

            {/* Editable form */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={editedData.name}
                    onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Empresa</Label>
                  <Input
                    value={editedData.company || ""}
                    onChange={(e) => setEditedData({ ...editedData, company: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={editedData.phone || ""}
                    onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editedData.email || ""}
                    onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
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
                        editedData.temperature === opt.value
                          ? opt.color + " border-current"
                          : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground"
                      )}
                      onClick={() => setEditedData({ ...editedData, temperature: opt.value as any })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Insights */}
              {editedData.insights && editedData.insights.length > 0 && (
                <div>
                  <Label>Insights da IA</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {editedData.insights.map((insight, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {insight}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested approach */}
              {editedData.suggested_approach && (
                <div>
                  <Label>Sugestão de Abordagem</Label>
                  <Textarea
                    value={editedData.suggested_approach}
                    onChange={(e) =>
                      setEditedData({ ...editedData, suggested_approach: e.target.value })
                    }
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Images preview */}
              <div>
                <Label className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  Screenshots anexados ({images.length})
                </Label>
                <div className="flex gap-2 mt-1 overflow-x-auto py-1">
                  {images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt=""
                      className="h-16 w-auto rounded border"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={saveLead} disabled={isSubmitting || !editedData.name}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Salvar Lead
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
