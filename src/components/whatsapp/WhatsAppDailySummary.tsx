import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Loader2, Calendar, CheckCircle2, AlertTriangle,
  ArrowRight, RefreshCw, MessageCircle, Send, Brain,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DailySummary {
  id: string;
  summary_date: string;
  total_messages_received: number;
  total_messages_sent: number;
  total_auto_replies: number;
  highlights: string[];
  pending_items: string[];
  next_steps: string[];
  full_summary: string;
  generated_at: string;
}

export function WhatsAppDailySummary() {
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const handleGenerate = async () => {
    if (!activeMembership) return;
    setIsLoading(true);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-daily-summary", {
        body: {
          tenant_id: activeMembership.tenant_id,
          date: selectedDate,
        },
      });

      if (error) throw error;
      if (data?.summary) {
        setSummary(data.summary);
        toast({ title: "Resumo gerado! 📊" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar resumo", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Resumo Diário de Conversas
          </CardTitle>
          <CardDescription className="text-xs">
            A IA analisa todas as conversas do dia e gera um resumo executivo com destaques, pendências e próximos passos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-xs font-medium">Data</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Gerar Resumo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Result */}
      {summary && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{summary.total_messages_received}</p>
                  <p className="text-[10px] text-muted-foreground">Recebidas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Send className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{summary.total_messages_sent}</p>
                  <p className="text-[10px] text-muted-foreground">Enviadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">{summary.total_auto_replies}</p>
                  <p className="text-[10px] text-muted-foreground">Auto-respostas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Highlights, Pending, Next Steps */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Highlights */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Destaques
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(summary.highlights as string[])?.length > 0 ? (
                  <ul className="space-y-2">
                    {(summary.highlights as string[]).map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-emerald-500 shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem destaques</p>
                )}
              </CardContent>
            </Card>

            {/* Pending */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Pendências
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(summary.pending_items as string[])?.length > 0 ? (
                  <ul className="space-y-2">
                    {(summary.pending_items as string[]).map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-amber-500 shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem pendências</p>
                )}
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Próximos Passos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(summary.next_steps as string[])?.length > 0 ? (
                  <ul className="space-y-2">
                    {(summary.next_steps as string[]).map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-primary shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem próximos passos</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Full Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Resumo Executivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground">
                <ReactMarkdown>{summary.full_summary}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!summary && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Selecione uma data e clique em "Gerar Resumo".</p>
          <p className="text-xs mt-1">A IA analisará todas as conversas do dia selecionado.</p>
        </div>
      )}
    </div>
  );
}
