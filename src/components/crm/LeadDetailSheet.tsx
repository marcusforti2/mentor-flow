import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "./LeadCard";
import {
  Building2,
  Calendar,
  Image as ImageIcon,
  Lightbulb,
  Mail,
  MessageSquare,
  Phone,
  Save,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const statusOptions = [
  { value: "new", label: "Novo", color: "bg-slate-500" },
  { value: "contacted", label: "Contato", color: "bg-blue-500" },
  { value: "proposal", label: "Proposta", color: "bg-purple-500" },
  { value: "closed", label: "Fechado", color: "bg-green-500" },
  { value: "lost", label: "Perdido", color: "bg-red-500" },
];

const temperatureConfig = {
  hot: { label: "Quente", color: "bg-red-500/20 text-red-400" },
  warm: { label: "Morno", color: "bg-amber-500/20 text-amber-400" },
  cold: { label: "Frio", color: "bg-blue-500/20 text-blue-400" },
};

export function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onUpdate,
}: LeadDetailSheetProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(lead?.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!lead) return null;

  const temp = temperatureConfig[lead.temperature as keyof typeof temperatureConfig] || temperatureConfig.cold;
  const currentStatus = statusOptions.find((s) => s.value === lead.status) || statusOptions[0];

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("crm_prospections")
        .update({ status: newStatus })
        .eq("id", lead.id);

      if (error) throw error;
      onUpdate();
      toast({ title: "Status atualizado!" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
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
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;

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
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-medium text-primary">
                {lead.contact_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span>{lead.contact_name}</span>
                  <Badge variant="outline" className={cn("text-xs", temp.color)}>
                    {temp.label}
                  </Badge>
                </div>
                {lead.company && (
                  <p className="text-sm font-normal text-muted-foreground">{lead.company}</p>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Status selector */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">STATUS</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleStatusChange(status.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      lead.status === status.value
                        ? `${status.color} text-white`
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Contact info */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">CONTATO</Label>
              {lead.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${lead.contact_phone}`} className="hover:text-primary">
                    {lead.contact_phone}
                  </a>
                </div>
              )}
              {lead.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${lead.contact_email}`} className="hover:text-primary">
                    {lead.contact_email}
                  </a>
                </div>
              )}
              {lead.created_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Criado em {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* AI Insights */}
            {lead.ai_insights && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    INSIGHTS DA IA
                  </Label>

                  {lead.ai_insights.insights && lead.ai_insights.insights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lead.ai_insights.insights.map((insight, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {insight}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {lead.ai_insights.suggested_approach && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-1 text-xs text-primary mb-1">
                        <Target className="w-3 h-3" />
                        Sugestão de Abordagem
                      </div>
                      <p className="text-sm">{lead.ai_insights.suggested_approach}</p>
                    </div>
                  )}

                  {lead.ai_insights.conversation_summary && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
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
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    SCREENSHOTS ({lead.screenshot_urls.length})
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
              <Label className="text-xs text-muted-foreground">ANOTAÇÕES</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre este lead..."
                rows={4}
              />
              <Button size="sm" onClick={handleSaveNotes} disabled={isSaving}>
                <Save className="w-3 h-3 mr-1" />
                Salvar
              </Button>
            </div>

            <Separator />

            {/* Delete */}
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Excluir Lead
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Image modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img src={selectedImage} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}
