import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, Sparkles, User, Phone } from "lucide-react";

interface Mentee {
  id: string;
  user_id: string;
  profile?: { full_name: string | null; phone: string | null };
}

interface QuickSendProps {
  mentees: Mentee[];
  onSent: () => void;
}

export function WhatsAppQuickSend({ mentees, onSent }: QuickSendProps) {
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const [selectedMenteeId, setSelectedMenteeId] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const menteesWithPhone = mentees.filter(m => m.profile?.phone);
  const selectedMentee = mentees.find(m => m.id === selectedMenteeId);

  const handleGenerateMessage = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-whatsapp-flow", {
        body: {
          objective: aiPrompt,
          target_audience: selectedMentee?.profile?.full_name || "mentorado",
          tone: "direto e profissional",
          num_steps: 1,
          context: `Mensagem única de WhatsApp. ${selectedMentee ? `Para: ${selectedMentee.profile?.full_name}` : ""}`,
        },
      });
      if (error) throw error;
      const msg = data?.flow?.steps?.[0]?.message_template || "";
      if (msg) {
        setMessage(msg);
        setAiPrompt("");
        toast({ title: "Mensagem gerada! ✨" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    const phone = selectedMentee?.profile?.phone || customPhone;
    if (!phone || !message.trim() || !activeMembership) {
      toast({ title: "Preencha telefone e mensagem", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const finalMessage = message.replace(
        /\{\{nome\}\}/g,
        selectedMentee?.profile?.full_name || ""
      );

      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          tenant_id: activeMembership.tenant_id,
          single_send: true,
          phone,
          message: finalMessage,
          recipient_name: selectedMentee?.profile?.full_name || "Manual",
        },
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada! ✅",
        description: `Para: ${phone}`,
      });
      setMessage("");
      setCustomPhone("");
      setSelectedMenteeId("");
      onSent();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Destinatário */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-500" />
            Destinatário
          </CardTitle>
          <CardDescription className="text-xs">
            Selecione um mentorado ou digite o número manualmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mentorado</Label>
            <Select value={selectedMenteeId} onValueChange={(v) => {
              setSelectedMenteeId(v);
              setCustomPhone("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar mentorado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">📱 Número personalizado</SelectItem>
                {menteesWithPhone.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.profile?.full_name || "Sem nome"} — {m.profile?.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMenteeId === "custom" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Número (com DDD + código do país)
              </Label>
              <Input
                placeholder="5511999998888"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
              />
            </div>
          )}

          {selectedMentee && selectedMentee.profile && (
            <Card className="bg-muted/30 border-muted">
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-sm">
                  {selectedMentee.profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedMentee.profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedMentee.profile.phone}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Mensagem */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-500" />
            Mensagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Assistant */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-3 pb-3 space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Sparkles className="h-3 w-3 text-emerald-500" />
                Assistente IA
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Lembrar da call de amanhã, cobrar tarefa..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateMessage()}
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  onClick={handleGenerateMessage}
                  disabled={isGenerating || !aiPrompt.trim()}
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Textarea
              placeholder="Olá {{nome}}! 👋 ..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                {message.length}/300 caracteres • Use {"{{nome}}"} para personalizar
              </p>
              {message.length > 300 && (
                <Badge variant="destructive" className="text-[10px]">Muito longa</Badge>
              )}
            </div>
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSend}
            disabled={isSending || !message.trim() || (!selectedMentee?.profile?.phone && !customPhone)}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isSending ? "Enviando..." : "Enviar Mensagem"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
