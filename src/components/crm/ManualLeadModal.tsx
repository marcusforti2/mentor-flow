import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";
import { Loader2, Sparkles, Instagram, Linkedin, Globe, MessageCircle, Briefcase } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ManualLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
  membershipId: string;
  tenantId?: string;
}

export function ManualLeadModal({
  open,
  onOpenChange,
  onLeadCreated,
  membershipId,
  tenantId,
}: ManualLeadModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [form, setForm] = useState({
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    company: "",
    position: "",
    temperature: "cold",
    instagram_url: "",
    linkedin_url: "",
    website_url: "",
    whatsapp: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      contact_name: "", contact_phone: "", contact_email: "", company: "",
      position: "", temperature: "cold", instagram_url: "", linkedin_url: "",
      website_url: "", whatsapp: "", notes: "",
    });
  };

  const buildInsertPayload = () => ({
    contact_name: form.contact_name.trim(),
    contact_phone: form.contact_phone.trim() || null,
    contact_email: form.contact_email.trim() || null,
    company: form.company.trim() || null,
    position: form.position.trim() || null,
    temperature: form.temperature,
    instagram_url: form.instagram_url.trim() || null,
    linkedin_url: form.linkedin_url.trim() || null,
    website_url: form.website_url.trim() || null,
    whatsapp: form.whatsapp.trim() || null,
    profile_url: form.linkedin_url.trim() || form.instagram_url.trim() || null,
    notes: form.notes.trim() || null,
    status: "new" as const,
    membership_id: membershipId,
    tenant_id: tenantId || null,
  });

  const handleSubmit = async (e: React.FormEvent, analyze = false) => {
    e.preventDefault();
    if (!form.contact_name.trim()) {
      toast({ title: "Nome do contato é obrigatório", variant: "destructive" });
      return;
    }

    analyze ? setIsAnalyzing(true) : setIsSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from("crm_prospections")
        .insert(buildInsertPayload())
        .select("id")
        .single();

      if (error) throw error;

      await logActivity({
        membershipId,
        tenantId: tenantId || undefined,
        actionType: 'lead_created',
        description: `Cadastrou lead: ${form.contact_name.trim()}`,
        pointsEarned: 3,
      });

      if (analyze && inserted?.id) {
        // Trigger AI analysis via the lead-qualifier edge function
        try {
          const profileUrl = form.linkedin_url.trim() || form.instagram_url.trim();
          if (profileUrl) {
            await supabase.functions.invoke('auto-qualify-lead', {
              body: { 
                prospection_id: inserted.id,
                profile_url: profileUrl,
                membership_id: membershipId,
              }
            });
            toast({ title: "Lead cadastrado e análise de perfil iniciada! 🚀", description: "A análise IA ficará disponível no Arsenal de Vendas em instantes." });
          } else {
            toast({ title: "Lead cadastrado!", description: "Adicione um perfil social para análise IA automática." });
          }
        } catch (aiErr) {
          console.error("AI analysis error:", aiErr);
          toast({ title: "Lead cadastrado!", description: "A análise IA será feita manualmente no Arsenal." });
        }
      } else {
        toast({ title: "Lead cadastrado com sucesso!" });
      }

      resetForm();
      onOpenChange(false);
      onLeadCreated();
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({ title: "Erro ao cadastrar lead", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Cadastro Manual de Lead</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="contact_name">Nome do Contato *</Label>
              <Input
                id="contact_name"
                placeholder="Nome completo"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                required
              />
            </div>

            {/* Telefone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input
                  id="contact_phone"
                  placeholder="(11) 99999-9999"
                  value={form.contact_phone}
                  onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.contact_email}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                />
              </div>
            </div>

            {/* Empresa + Cargo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="company">
                  <Briefcase className="inline h-3.5 w-3.5 mr-1" />
                  Empresa
                </Label>
                <Input
                  id="company"
                  placeholder="Nome da empresa"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  placeholder="Ex: CEO, Diretor..."
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp">
                <MessageCircle className="inline h-3.5 w-3.5 mr-1 text-emerald-500" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                placeholder="(11) 99999-9999 ou link wa.me/"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              />
            </div>

            {/* Redes Sociais */}
            <div className="space-y-3 rounded-xl border border-border/50 p-3 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Redes Sociais</p>
              <div className="space-y-2">
                <Label htmlFor="instagram_url" className="text-sm">
                  <Instagram className="inline h-3.5 w-3.5 mr-1 text-pink-500" />
                  Instagram
                </Label>
                <Input
                  id="instagram_url"
                  placeholder="https://instagram.com/perfil ou @perfil"
                  value={form.instagram_url}
                  onChange={(e) => setForm((f) => ({ ...f, instagram_url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin_url" className="text-sm">
                  <Linkedin className="inline h-3.5 w-3.5 mr-1 text-blue-500" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin_url"
                  placeholder="https://linkedin.com/in/perfil"
                  value={form.linkedin_url}
                  onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url" className="text-sm">
                  <Globe className="inline h-3.5 w-3.5 mr-1 text-primary" />
                  Website
                </Label>
                <Input
                  id="website_url"
                  placeholder="https://site.com.br"
                  value={form.website_url}
                  onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                />
              </div>
            </div>

            {/* Temperatura */}
            <div className="space-y-2">
              <Label>Temperatura</Label>
              <Select value={form.temperature} onValueChange={(v) => setForm((f) => ({ ...f, temperature: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">❄️ Frio</SelectItem>
                  <SelectItem value="warm">🌤️ Morno</SelectItem>
                  <SelectItem value="hot">🔥 Quente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Observações sobre o lead..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || isAnalyzing}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar Lead
              </Button>
              <Button 
                type="button" 
                disabled={isSubmitting || isAnalyzing}
                onClick={(e) => handleSubmit(e as any, true)}
                className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Salvar e Analisar Perfil
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
