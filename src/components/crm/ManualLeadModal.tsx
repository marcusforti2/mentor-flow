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
import { Loader2 } from "lucide-react";

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
  const [form, setForm] = useState({
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    company: "",
    temperature: "cold",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_name.trim()) {
      toast({ title: "Nome do contato é obrigatório", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("crm_prospections").insert({
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        company: form.company.trim() || null,
        temperature: form.temperature,
        notes: form.notes.trim() || null,
        status: "new",
        membership_id: membershipId,
        tenant_id: tenantId || null,
      });

      if (error) throw error;

      toast({ title: "Lead cadastrado com sucesso!" });
      setForm({ contact_name: "", contact_phone: "", contact_email: "", company: "", temperature: "cold", notes: "" });
      onOpenChange(false);
      onLeadCreated();
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({ title: "Erro ao cadastrar lead", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro Manual de Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              placeholder="Nome da empresa"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          </div>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cadastrar Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
