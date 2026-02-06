import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, FileText, Loader2, Upload, CheckCircle2 } from "lucide-react";

interface ParsedProfile {
  business_name?: string | null;
  business_type?: string | null;
  target_audience?: string | null;
  main_offer?: string | null;
  price_range?: string | null;
  unique_value_proposition?: string | null;
  pain_points_solved?: string[];
  ideal_client_profile?: string | null;
  daily_prospection_goal?: number | null;
  monthly_revenue?: string | null;
  team_size?: string | null;
  time_in_market?: string | null;
  maturity_level?: string | null;
  main_chaos_points?: string[];
  has_commercial_process?: boolean | null;
  sales_predictability?: string | null;
  main_bottleneck?: string | null;
  owner_dependency_level?: string | null;
  current_sales_channels?: string[];
  average_ticket?: string | null;
  sales_cycle_days?: number | null;
  monthly_leads_volume?: string | null;
  conversion_rate?: string | null;
}

interface AIBusinessProfileParserProps {
  onProfileParsed: (profile: ParsedProfile) => void;
}

export function AIBusinessProfileParser({ onProfileParsed }: AIBusinessProfileParserProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ fields_filled: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      toast.info("Extraindo texto do PDF...");
      try {
        const arrayBuffer = await file.arrayBuffer();
        // Extract text from PDF using a simple approach
        const uint8Array = new Uint8Array(arrayBuffer);
        const textContent = extractTextFromPDF(uint8Array);
        if (textContent && textContent.trim().length > 20) {
          setText(textContent);
          toast.success("Texto extraído do PDF!");
        } else {
          toast.error("Não foi possível extrair texto do PDF. Cole o texto manualmente.");
        }
      } catch {
        toast.error("Erro ao ler PDF. Cole o texto manualmente.");
      }
    } else if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const content = await file.text();
      setText(content);
      toast.success("Arquivo carregado!");
    } else {
      toast.error("Formato não suportado. Use PDF ou texto.");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Simple PDF text extraction (handles basic PDFs)
  const extractTextFromPDF = (data: Uint8Array): string => {
    try {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(data);
      // Extract text between stream markers (simplified)
      const textParts: string[] = [];
      const streamRegex = /stream\s*([\s\S]*?)endstream/gi;
      let match;
      while ((match = streamRegex.exec(text)) !== null) {
        const content = match[1];
        // Extract text from PDF text operators
        const tjRegex = /\((.*?)\)\s*Tj/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(content)) !== null) {
          textParts.push(tjMatch[1]);
        }
      }
      
      if (textParts.length > 0) {
        return textParts.join(" ");
      }

      // Fallback: try to extract readable text
      const readable = text.replace(/[^\x20-\x7E\xC0-\xFF\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Filter out PDF structure noise
      const cleanParts = readable.split(/\s+/).filter(word => 
        word.length > 2 && !/^[0-9]+$/.test(word) && !word.includes("obj") && !word.includes("endobj")
      );
      return cleanParts.join(" ");
    } catch {
      return "";
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim() || text.trim().length < 20) {
      toast.error("Cole pelo menos um parágrafo sobre o negócio.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("parse-business-profile", {
        body: { text: text.trim() },
      });

      if (error) {
        throw new Error(error.message || "Erro ao processar");
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.profile) {
        // Clean nulls before passing
        const cleaned: ParsedProfile = {};
        for (const [key, value] of Object.entries(data.profile)) {
          if (value !== null && value !== undefined) {
            if (Array.isArray(value) && value.length === 0) continue;
            if (typeof value === "string" && value.trim() === "") continue;
            (cleaned as any)[key] = value;
          }
        }

        onProfileParsed(cleaned);
        setResult({ fields_filled: data.fields_filled || 0 });
        toast.success(`IA preencheu ${data.fields_filled || 0} campos automaticamente!`);
        
        // Auto-close after success
        setTimeout(() => {
          setOpen(false);
          setText("");
          setResult(null);
        }, 2000);
      }
    } catch (err: any) {
      console.error("AI parse error:", err);
      toast.error(err.message || "Erro ao analisar com IA");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setText(""); setResult(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Sparkles className="w-4 h-4" />
          Preencher com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Preencher Perfil com IA
          </DialogTitle>
          <DialogDescription>
            Cole um texto descrevendo o negócio ou faça upload de um arquivo. A IA vai extrair e preencher automaticamente todos os campos do diagnóstico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,text/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload PDF / Texto
            </Button>
            <span className="text-xs text-muted-foreground">ou cole abaixo</span>
          </div>

          {/* Text Input */}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Cole aqui informações sobre o negócio. Exemplos:\n\n"Tenho uma consultoria de vendas B2B chamada SalesForce Pro. Faturo cerca de 40 mil por mês, tenho 3 pessoas no time. Atendo empresas de tecnologia que querem estruturar processo comercial. Meu ticket médio é 8 mil e vendo principalmente pelo LinkedIn e indicações. Estou no mercado há 4 anos, mas ainda dependo muito de mim para fechar..."  `}
            className="min-h-[200px] text-sm"
            disabled={isProcessing}
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {text.length > 0 ? `${text.length} caracteres` : "Quanto mais detalhes, melhor o preenchimento"}
            </p>

            {result ? (
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
                {result.fields_filled} campos preenchidos!
              </div>
            ) : (
              <Button
                onClick={handleAnalyze}
                disabled={isProcessing || text.trim().length < 20}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Analisar e Preencher
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
