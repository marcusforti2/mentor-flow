import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineStage } from "@/hooks/usePipelineStages";
import {
  FileSpreadsheet,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";

interface SpreadsheetImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  membershipId: string;
  tenantId?: string;
  stages: PipelineStage[];
  onStagesChanged?: () => void;
}

export function SpreadsheetImportModal({
  open,
  onOpenChange,
  onImported,
  membershipId,
  tenantId,
  stages,
  onStagesChanged,
}: SpreadsheetImportModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"input" | "processing" | "done">("input");
  const [textData, setTextData] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{
    leads_count: number;
    new_stages_count: number;
    summary: string;
  } | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setTextData(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleImport = async () => {
    if (!textData.trim()) {
      toast({ title: "Cole ou envie dados da planilha", variant: "destructive" });
      return;
    }

    setStep("processing");
    try {
      const { data, error } = await supabase.functions.invoke("import-leads-spreadsheet", {
        body: {
          spreadsheet_data: textData.slice(0, 50000), // limit to ~50k chars
          membership_id: membershipId,
          tenant_id: tenantId,
          existing_stages: stages.map((s) => ({
            name: s.name,
            status_key: s.status_key,
            position: s.position,
          })),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setResult({
        leads_count: data.leads_count || 0,
        new_stages_count: data.new_stages_count || 0,
        summary: data.summary || "",
      });
      setStep("done");

      if (data.new_stages_count > 0) {
        onStagesChanged?.();
      }
      onImported();
    } catch (err) {
      console.error("Import error:", err);
      toast({
        title: "Erro na importação",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
      setStep("input");
    }
  };

  const handleClose = () => {
    setStep("input");
    setTextData("");
    setFileName("");
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Planilha com IA
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole os dados da planilha ou envie um arquivo CSV/TXT. A IA vai analisar automaticamente as colunas, criar os leads e, se necessário, criar novas etapas no pipeline.
            </p>

            {/* File upload */}
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("spreadsheet-file-input")?.click()}
            >
              <input
                id="spreadsheet-file-input"
                type="file"
                accept=".csv,.txt,.tsv,.xls,.xlsx"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Arraste ou clique para enviar arquivo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV, TXT, TSV
              </p>
            </div>

            {fileName && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="text-sm flex-1 truncate">{fileName}</span>
                <button onClick={() => { setFileName(""); setTextData(""); }}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}

            <div className="relative">
              <Textarea
                placeholder={"Cole aqui os dados da planilha...\n\nExemplo:\nNome, Telefone, Email, Empresa, Etapa\nJoão Silva, (11) 99999-0000, joao@email.com, Tech Co, Contato\nMaria Santos, (21) 88888-0000, maria@email.com, Sales Inc, Reunião"}
                value={textData}
                onChange={(e) => setTextData(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
              {textData && (
                <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">
                  {textData.split("\n").filter((l) => l.trim()).length} linhas
                </Badge>
              )}
            </div>

            {/* Current stages info */}
            <div className="p-3 rounded-lg bg-muted/30 border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Etapas atuais do pipeline:</p>
              <div className="flex flex-wrap gap-1.5">
                {stages.map((s) => (
                  <Badge key={s.status_key} variant="outline" className="text-[10px]">
                    <div className={`w-2 h-2 rounded-full mr-1 ${s.color}`} />
                    {s.name}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                💡 Se a planilha mencionar etapas que não existem, a IA pode criá-las automaticamente
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleImport} disabled={!textData.trim()}>
                <Sparkles className="w-4 h-4 mr-2" />
                Importar com IA
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Analisando planilha...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Detectando colunas, classificando leads e organizando etapas
              </p>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Importação Concluída!</h3>
                <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-2xl font-bold text-primary">{result.leads_count}</p>
                <p className="text-xs text-muted-foreground">Leads importados</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                <p className="text-2xl font-bold text-amber-500">{result.new_stages_count}</p>
                <p className="text-xs text-muted-foreground">Novas etapas criadas</p>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
