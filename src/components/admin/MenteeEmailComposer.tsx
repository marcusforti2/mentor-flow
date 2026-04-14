import { useState } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Sparkles, Send, Plus, Trash2, Calendar, Mail } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menteeEmail: string;
  menteeName: string;
  mentorName: string;
  tenantId: string;
}

interface EmailDraft {
  subject: string;
  body_html: string;
  send_date?: string;
  day_offset?: number;
}

export function MenteeEmailComposer({ open, onOpenChange, menteeEmail, menteeName, mentorName, tenantId }: Props) {
  const [tab, setTab] = useState("single");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Single email state
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("profissional e motivacional");
  const [singleDraft, setSingleDraft] = useState<EmailDraft | null>(null);

  // Sequence state
  const [seqContext, setSeqContext] = useState("");
  const [seqTone, setSeqTone] = useState("profissional e motivacional");
  const [seqCount, setSeqCount] = useState("3");
  const [seqInterval, setSeqInterval] = useState("3");
  const [sequenceDrafts, setSequenceDrafts] = useState<EmailDraft[]>([]);

  const toneOptions = [
    { value: "profissional e motivacional", label: "Profissional & Motivacional" },
    { value: "casual e amigável", label: "Casual & Amigável" },
    { value: "direto e objetivo", label: "Direto & Objetivo" },
    { value: "inspiracional e empoderador", label: "Inspiracional" },
    { value: "urgente e provocativo", label: "Urgente & Provocativo" },
  ];

  const handleGenerateSingle = async () => {
    if (!context.trim()) {
      toast.error("Descreva o contexto do email");
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mentee-email", {
        body: {
          mode: "generate",
          tenant_id: tenantId,
          mentee_name: menteeName,
          mentor_name: mentorName,
          context,
          tone,
        },
      });
      if (error) throw error;
      if (data?.email) {
        setSingleDraft(data.email);
        toast.success("Email gerado com IA!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar email");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSequence = async () => {
    if (!seqContext.trim()) {
      toast.error("Descreva o objetivo da sequência");
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mentee-email", {
        body: {
          mode: "generate_sequence",
          tenant_id: tenantId,
          mentee_name: menteeName,
          mentor_name: mentorName,
          context: seqContext,
          tone: seqTone,
          count: parseInt(seqCount),
          interval_days: parseInt(seqInterval),
        },
      });
      if (error) throw error;
      if (data?.sequence) {
        const withDates = data.sequence.map((e: any) => ({
          ...e,
          send_date: addDays(new Date(), e.day_offset || 0).toISOString(),
        }));
        setSequenceDrafts(withDates);
        toast.success(`Sequência de ${withDates.length} emails gerada!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar sequência");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendSingle = async () => {
    if (!singleDraft) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mentee-email", {
        body: {
          mode: "single",
          tenant_id: tenantId,
          mentee_email: menteeEmail,
          mentee_name: menteeName,
          mentor_name: mentorName,
          emails: [singleDraft],
        },
      });
      if (error) throw error;
      toast.success("Email enviado com sucesso!");
      setSingleDraft(null);
      setContext("");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar email");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSequence = async () => {
    if (!sequenceDrafts.length) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mentee-email", {
        body: {
          mode: "send_sequence",
          tenant_id: tenantId,
          mentee_email: menteeEmail,
          mentee_name: menteeName,
          mentor_name: mentorName,
          emails: sequenceDrafts,
        },
      });
      if (error) throw error;
      const sentCount = data?.results?.filter((r: any) => r.ok).length || 0;
      toast.success(`${sentCount} email(s) agendado(s) com sucesso!`);
      setSequenceDrafts([]);
      setSeqContext("");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar sequência");
    } finally {
      setIsSending(false);
    }
  };

  const removeSequenceEmail = (index: number) => {
    setSequenceDrafts(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email para {menteeName}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{menteeEmail}</p>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email Único
            </TabsTrigger>
            <TabsTrigger value="sequence" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Sequência
            </TabsTrigger>
          </TabsList>

          {/* === SINGLE EMAIL === */}
          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Sobre o que é o email?</Label>
              <Textarea
                placeholder="Ex: Parabenizar pela evolução no CRM, cobrar entrega das tarefas, motivar para próxima sessão..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Tom da mensagem</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {toneOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerateSingle} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar com IA
            </Button>

            {singleDraft && (
              <Card className="border-primary/20">
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Assunto</Label>
                    <Input
                      value={singleDraft.subject}
                      onChange={(e) => setSingleDraft({ ...singleDraft, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Corpo do email</Label>
                    <Textarea
                      value={singleDraft.body_html}
                      onChange={(e) => setSingleDraft({ ...singleDraft, body_html: e.target.value })}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2">Pré-visualização:</p>
                    <div
                      className="text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(singleDraft.body_html) }}
                    />
                  </div>

                  <Separator />

                  <Button onClick={handleSendSingle} disabled={isSending} className="w-full">
                    {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Enviar agora
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* === SEQUENCE === */}
          <TabsContent value="sequence" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Objetivo da sequência</Label>
              <Textarea
                placeholder="Ex: Acompanhar progresso semanal, manter engajamento, preparar para próximo módulo..."
                value={seqContext}
                onChange={(e) => setSeqContext(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tom</Label>
                <Select value={seqTone} onValueChange={setSeqTone}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qtd emails</Label>
                <Select value={seqCount} onValueChange={setSeqCount}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} emails</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Intervalo</Label>
                <Select value={seqInterval} onValueChange={setSeqInterval}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 7].map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} dia{d > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerateSequence} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar sequência com IA
            </Button>

            {sequenceDrafts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{sequenceDrafts.length} emails na sequência</h4>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(sequenceDrafts[0]?.send_date || new Date()), "dd MMM", { locale: ptBR })}
                    {" → "}
                    {format(new Date(sequenceDrafts[sequenceDrafts.length - 1]?.send_date || new Date()), "dd MMM", { locale: ptBR })}
                  </Badge>
                </div>

                {sequenceDrafts.map((draft, i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="pt-3 pb-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            #{i + 1}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {draft.send_date
                              ? format(new Date(draft.send_date), "dd MMM yyyy", { locale: ptBR })
                              : "Imediato"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeSequenceEmail(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        value={draft.subject}
                        onChange={(e) => {
                          const updated = [...sequenceDrafts];
                          updated[i] = { ...updated[i], subject: e.target.value };
                          setSequenceDrafts(updated);
                        }}
                        className="text-sm h-8"
                        placeholder="Assunto"
                      />
                      <div
                        className="text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-20 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(draft.body_html) }}
                      />
                    </CardContent>
                  </Card>
                ))}

                <Separator />

                <Button onClick={handleSendSequence} disabled={isSending} className="w-full">
                  {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Agendar {sequenceDrafts.length} email(s)
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
