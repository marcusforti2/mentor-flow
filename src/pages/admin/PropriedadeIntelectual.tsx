import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Shield, Clock, Hash, Building2, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Fingerprint {
  id: string;
  sha256_hash: string;
  content_summary: string | null;
  full_content: string | null;
  version: string | null;
  author: string | null;
  system_name: string | null;
  created_at: string | null;
  metadata: {
    files_count?: number;
    concept_length?: number;
    generated_at?: string;
    purpose?: string;
    titular?: {
      razao_social: string;
      cnpj: string;
      endereco: string;
      representante: string;
      rg: string;
      cpf: string;
    };
  } | null;
}

export default function PropriedadeIntelectual() {
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchFingerprints();
  }, []);

  const fetchFingerprints = async () => {
    try {
      // Note: system_fingerprints is a global/admin table, no tenant_id filter needed
      const { data, error } = await supabase
        .from("system_fingerprints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFingerprints((data as Fingerprint[]) || []);
    } catch (error) {
      console.error("Error fetching fingerprints:", error);
      toast.error("Erro ao carregar registros");
    } finally {
      setLoading(false);
    }
  };

  const generateNewFingerprint = async () => {
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke("system-fingerprint", {
        method: "POST",
      });

      if (response.error) throw response.error;

      toast.success("Novo fingerprint gerado com sucesso!");
      fetchFingerprints();
    } catch (error) {
      console.error("Error generating fingerprint:", error);
      toast.error("Erro ao gerar fingerprint");
    } finally {
      setGenerating(false);
    }
  };

  const generatePDF = (fp: Fingerprint) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      
      lines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += fontSize * 0.5;
      });
      y += 3;
    };

    const addSection = (title: string) => {
      y += 5;
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
      addText(title, 12, true);
      y += 2;
    };

    // Header
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("REGISTRO DE PROPRIEDADE INTELECTUAL", margin, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Documento para Ata Notarial", margin, 30);
    
    doc.setTextColor(0, 0, 0);
    y = 55;

    // Sistema
    addText(`Sistema: ${fp.system_name || "Vértice Hub Forti"}`, 14, true);
    addText(`Versão: ${fp.version || "1.0.0"}`, 11);
    addText(`Data de Registro: ${fp.created_at ? new Date(fp.created_at).toLocaleString("pt-BR") : "N/A"}`, 11);
    
    // Hash
    addSection("IDENTIFICADOR CRIPTOGRÁFICO (SHA-256)");
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 3, maxWidth, 12, "F");
    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    doc.text(fp.sha256_hash, margin + 2, y + 5);
    doc.setFont("helvetica", "normal");
    y += 18;

    // Titular
    if (fp.metadata?.titular) {
      addSection("TITULAR DOS DIREITOS");
      const t = fp.metadata.titular;
      addText(`Razão Social: ${t.razao_social}`, 10, true);
      addText(`CNPJ: ${t.cnpj}`);
      addText(`Endereço: ${t.endereco}`);
      addText(`Representante Legal: ${t.representante}`);
      addText(`RG: ${t.rg}`);
      addText(`CPF: ${t.cpf}`);
    }

    // Propósito
    addSection("PROPÓSITO DO REGISTRO");
    addText(fp.metadata?.purpose || "Registro de anterioridade para ata notarial");
    addText(`Arquivos do Sistema: ${fp.metadata?.files_count || 0} arquivos principais`);

    // Conceito Completo
    if (fp.full_content) {
      addSection("DOCUMENTO CONCEITUAL COMPLETO");
      
      const lines = fp.full_content.split("\n");
      lines.forEach((line) => {
        if (line.startsWith("===")) {
          y += 3;
          addText(line, 10, true);
        } else if (line.trim()) {
          addText(line, 9);
        } else {
          y += 2;
        }
      });
    }

    // Footer em todas as páginas
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${totalPages} | Hash: ${fp.sha256_hash.substring(0, 16)}...`,
        margin,
        doc.internal.pageSize.getHeight() - 10
      );
      doc.text(
        `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
        pageWidth - margin - 50,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    // Download
    const fileName = `VHF_Propriedade_Intelectual_${fp.version}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF gerado com sucesso!");
  };

  const latestFp = fingerprints[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Propriedade Intelectual
            </h1>
            <p className="text-muted-foreground">
              Registros criptográficos para proteção do sistema
            </p>
          </div>
          <Button onClick={generateNewFingerprint} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            Gerar Novo Registro
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Carregando registros...
            </CardContent>
          </Card>
        ) : fingerprints.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum registro encontrado. Gere o primeiro fingerprint.
              </p>
              <Button onClick={generateNewFingerprint} disabled={generating}>
                Gerar Primeiro Registro
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Registro Principal */}
            {latestFp && (
              <Card className="border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Registro Atual - {latestFp.system_name}
                      </CardTitle>
                      <CardDescription>
                        Versão {latestFp.version} • {latestFp.created_at ? new Date(latestFp.created_at).toLocaleString("pt-BR") : ""}
                      </CardDescription>
                    </div>
                    <Badge variant="default">Mais Recente</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Hash */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Hash className="h-4 w-4" />
                      Hash SHA-256
                    </div>
                    <code className="block bg-muted p-3 rounded-md text-xs font-mono break-all">
                      {latestFp.sha256_hash}
                    </code>
                  </div>

                  <Separator />

                  {/* Titular */}
                  {latestFp.metadata?.titular && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Building2 className="h-4 w-4" />
                          Pessoa Jurídica
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="font-medium">{latestFp.metadata.titular.razao_social}</p>
                          <p className="text-muted-foreground">CNPJ: {latestFp.metadata.titular.cnpj}</p>
                          <p className="text-muted-foreground text-xs">{latestFp.metadata.titular.endereco}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <User className="h-4 w-4" />
                          Representante Legal
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="font-medium">{latestFp.metadata.titular.representante}</p>
                          <p className="text-muted-foreground">RG: {latestFp.metadata.titular.rg}</p>
                          <p className="text-muted-foreground">CPF: {latestFp.metadata.titular.cpf}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Metadados */}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {latestFp.metadata?.files_count || 0} arquivos registrados
                    </div>
                    <div>
                      Propósito: {latestFp.metadata?.purpose || "Ata Notarial"}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3">
                    <Button onClick={() => generatePDF(latestFp)} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF para Ata Notarial
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Histórico */}
            {fingerprints.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Histórico de Registros</CardTitle>
                  <CardDescription>
                    Todos os fingerprints gerados anteriormente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {fingerprints.slice(1).map((fp) => (
                        <div
                          key={fp.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              Versão {fp.version} • {fp.system_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {fp.sha256_hash.substring(0, 32)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fp.created_at ? new Date(fp.created_at).toLocaleString("pt-BR") : ""}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generatePDF(fp)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
}
