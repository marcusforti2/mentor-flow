import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, FileText, CheckCircle2, Target, Zap } from "lucide-react";

interface PitchContextEditorProps {
  value: string;
  onChange: (value: string) => void;
  mentoradoId: string | null;
}

export function PitchContextEditor({ value, onChange, mentoradoId }: PitchContextEditorProps) {
  const [rawInput, setRawInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState(false);

  const handleProcessWithAI = async () => {
    if (!rawInput.trim() || rawInput.trim().length < 30) {
      toast.error("Cole pelo menos um parágrafo descrevendo seu produto/serviço.");
      return;
    }

    setIsProcessing(true);
    setLastProcessed(false);

    try {
      const { data, error } = await supabase.functions.invoke("parse-business-profile", {
        body: {
          text: rawInput.trim(),
          mode: "pitch_context",
        },
      });

      if (error) throw new Error(error.message || "Erro ao processar");
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const processedContext = data?.pitch_context || data?.result;

      if (processedContext) {
        // Merge with existing context if present
        const finalContext = value
          ? `${value}\n\n---\n\n${processedContext}`
          : processedContext;
        onChange(finalContext);
        setLastProcessed(true);
        setRawInput("");
        toast.success("Contexto processado e salvo pela IA!");
      } else {
        toast.error("A IA não conseguiu processar o texto. Tente com mais detalhes.");
      }
    } catch (err: any) {
      console.error("Pitch context AI error:", err);
      toast.error(err.message || "Erro ao processar com IA");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Target className="w-4 h-4" />
          Contexto para Análise de Leads
        </h3>
        <p className="text-xs text-muted-foreground">
          Cole seu pitch, descrição do produto ou qualquer informação sobre seu negócio. 
          A IA vai organizar e salvar como contexto para cruzar dados ao analisar perfis do LinkedIn e Instagram.
        </p>
      </div>

      {/* Input area */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Cole seu Pitch / Descrição do Produto
          </CardTitle>
          <CardDescription>
            A IA vai estruturar essas informações para enriquecer a análise de leads automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={`Cole aqui seu pitch, proposta comercial, descrição do produto ou serviço...

Exemplo:
"Minha mentoria ajuda empresários de serviços a estruturarem processos comerciais previsíveis. O programa dura 6 meses, custa R$ 15.000 e inclui sessões semanais, acesso à comunidade VIP e ferramentas exclusivas. Meu diferencial é que eu já faturei 2M com esse modelo e ensino o passo a passo. Ideal para quem fatura entre 30-100k/mês e quer escalar sem depender de indicação."  `}
            className="min-h-[160px] text-sm resize-none"
            disabled={isProcessing}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {rawInput.length > 0 ? `${rawInput.length} caracteres` : "Quanto mais detalhes, melhor a análise de leads"}
            </p>
            <Button
              onClick={handleProcessWithAI}
              disabled={isProcessing || rawInput.trim().length < 30}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Processar com IA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved context display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Contexto Salvo
            {lastProcessed && (
              <span className="text-xs text-primary flex items-center gap-1 ml-2">
                <CheckCircle2 className="w-3 h-3" />
                Atualizado agora
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Este texto é usado automaticamente quando você analisa perfis no Qualificador de Leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nenhum contexto salvo ainda. Use o campo acima para processar seu pitch com IA ou escreva diretamente aqui."
            className="min-h-[200px] text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Você pode editar diretamente ou adicionar mais informações com o campo acima. Não esqueça de salvar o perfil!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
