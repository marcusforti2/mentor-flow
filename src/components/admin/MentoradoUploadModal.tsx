import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Instagram,
  Linkedin,
  Globe,
  Building2,
  StickyNote,
} from "lucide-react";

interface ParsedRow {
  full_name: string;
  email: string;
  phone?: string;
  business_name?: string;
  joined_at?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
  notes?: string;
  selected?: boolean;
}

interface MentoradoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  mentorMembershipId: string;
  mentorName: string;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'complete';

interface CreatedMentee {
  full_name: string;
  email: string;
  phone?: string;
}

export function MentoradoUploadModal({
  open,
  onOpenChange,
  tenantId,
  mentorMembershipId,
  mentorName,
  onSuccess,
}: MentoradoUploadModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [createdCount, setCreatedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [createdMentees, setCreatedMentees] = useState<CreatedMentee[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setMapping({});
    setErrors([]);
    setCreatedCount(0);
    setFailedCount(0);
    setCreatedMentees([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['.csv', '.txt'];
    const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
    if (!validTypes.includes(ext)) {
      toast.error('Formato inválido', { description: 'Use arquivos CSV ou TXT' });
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const base64 = btoa(content);

        const { data, error } = await supabase.functions.invoke('parse-mentorado-spreadsheet', {
          body: { fileContent: base64, fileName: selectedFile.name },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        const dataWithSelection = data.data.map((row: ParsedRow) => ({
          ...row,
          selected: true,
        }));

        setParsedData(dataWithSelection);
        setMapping(data.mapping);
        setErrors(data.errors || []);
        setStep('preview');
        setIsLoading(false);
      };
      reader.readAsText(selectedFile);
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast.error('Erro ao processar arquivo', { description: error.message });
      setIsLoading(false);
    }
  };

  const toggleRowSelection = (index: number) => {
    setParsedData(prev =>
      prev.map((row, i) =>
        i === index ? { ...row, selected: !row.selected } : row
      )
    );
  };

  const toggleAllSelection = (selected: boolean) => {
    setParsedData(prev => prev.map(row => ({ ...row, selected })));
  };

  const handleCreateMentees = async () => {
    const selectedRows = parsedData.filter(row => row.selected);
    if (selectedRows.length === 0) {
      toast.error('Selecione pelo menos um mentorado');
      return;
    }

    setIsLoading(true);

    let created = 0;
    let failed = 0;
    const successList: CreatedMentee[] = [];
    const creationErrors: string[] = [];

    for (const row of selectedRows) {
      if (!row.email) {
        creationErrors.push(`${row.full_name}: Email obrigatório`);
        failed++;
        continue;
      }

      try {
        const { data, error } = await supabase.functions.invoke('create-membership', {
          body: {
            tenant_id: tenantId,
            email: row.email.trim(),
            full_name: row.full_name.trim(),
            phone: row.phone?.trim() || undefined,
            role: 'mentee',
            mentor_membership_id: mentorMembershipId,
            joined_at: row.joined_at || undefined,
            business_name: row.business_name?.trim() || undefined,
            instagram: row.instagram?.trim() || undefined,
            linkedin: row.linkedin?.trim() || undefined,
            website: row.website?.trim() || undefined,
            notes: row.notes?.trim() || undefined,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        created++;
        successList.push({
          full_name: row.full_name,
          email: row.email,
          phone: row.phone,
        });
      } catch (err: any) {
        failed++;
        const msg = err.message || 'Erro desconhecido';
        creationErrors.push(`${row.full_name} (${row.email}): ${msg}`);
        console.error(`Error creating mentee ${row.email}:`, err);
      }
    }

    setCreatedCount(created);
    setFailedCount(failed);
    setCreatedMentees(successList);
    setErrors(creationErrors);
    setStep('complete');

    if (created > 0) {
      toast.success(`${created} mentorado(s) criado(s)!`);
      onSuccess();
    }
    if (failed > 0) {
      toast.error(`${failed} falha(s) na criação`);
    }

    setIsLoading(false);
  };

  const selectedCount = parsedData.filter(r => r.selected).length;

  // Mapping badges for display
  const mappingBadges = [
    { key: 'full_name', label: 'Nome', icon: null },
    { key: 'email', label: 'Email', icon: null },
    { key: 'phone', label: 'Telefone', icon: null },
    { key: 'business_name', label: 'Empresa', icon: Building2 },
    { key: 'joined_at', label: 'Data Entrada', icon: Calendar },
    { key: 'instagram', label: 'Instagram', icon: Instagram },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { key: 'website', label: 'Site', icon: Globe },
    { key: 'notes', label: 'Observações', icon: StickyNote },
  ];

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return null;
    try {
      return new Date(isoStr).toLocaleDateString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetState();
        onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Importar Planilha'}
            {step === 'preview' && 'Revisar Dados'}
            {step === 'complete' && 'Importação Concluída'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de um arquivo CSV com os dados dos mentorados'}
            {step === 'preview' && 'Revise os dados identificados antes de criar os mentorados'}
            {step === 'complete' && `${createdCount} mentorado(s) criado(s) com sucesso`}
          </DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              {isLoading ? (
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              ) : (
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              )}
              <p className="text-lg font-medium mb-1">
                {isLoading ? 'Processando...' : 'Arraste ou clique para selecionar'}
              </p>
              <p className="text-sm text-muted-foreground">
                Arquivos CSV com colunas: Nome, Email, Telefone, Empresa, Data Entrada, Redes Sociais...
              </p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">💡 Importação Inteligente:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>A primeira linha deve ser o cabeçalho</li>
                <li>A IA detecta automaticamente as colunas disponíveis</li>
                <li>Colunas reconhecidas: Nome, Email, Telefone, Empresa, Data de Entrada, Instagram, LinkedIn, Site, Observações</li>
                <li>Cada mentorado será criado com acesso via OTP (código por email)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div className="flex-1 min-h-0 space-y-4">
            {/* Mapping Badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              {mappingBadges.map(({ key, label, icon: Icon }) => {
                const detected = mapping[key];
                if (!detected) return null;
                return (
                  <span key={key} className="bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-1 rounded flex items-center gap-1">
                    {Icon && <Icon className="h-3 w-3" />}
                    {label}: {detected}
                  </span>
                );
              })}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.length} aviso(s)
                </div>
                <ul className="list-disc list-inside text-xs max-h-20 overflow-y-auto">
                  {errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {errors.length > 5 && <li>...e mais {errors.length - 5}</li>}
                </ul>
              </div>
            )}

            {/* Selection Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCount === parsedData.length}
                  onCheckedChange={(checked) => toggleAllSelection(!!checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedCount} de {parsedData.length} selecionados
                </span>
              </div>
            </div>

            {/* Data Cards */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-4 space-y-2">
                {parsedData.map((row, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      row.selected ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-transparent'
                    }`}
                  >
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={() => toggleRowSelection(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{row.full_name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                        {row.email && <span>{row.email}</span>}
                        {!row.email && <span className="text-destructive">⚠ Sem email</span>}
                        {row.phone && <span>📱 {row.phone}</span>}
                        {row.business_name && <span>🏢 {row.business_name}</span>}
                        {row.joined_at && <span>📅 {formatDate(row.joined_at)}</span>}
                        {row.instagram && <span>📸 {row.instagram}</span>}
                        {row.linkedin && <span>💼 {row.linkedin}</span>}
                        {row.website && <span>🌐 {row.website}</span>}
                        {row.notes && <span className="truncate max-w-[200px]">📝 {row.notes}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleCreateMentees}
                disabled={selectedCount === 0 || isLoading}
                className="gradient-gold text-primary-foreground"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Criar {selectedCount} Mentorado(s)
              </Button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="py-4 space-y-4">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {createdCount} mentorado(s) criado(s)!
                </p>
                {failedCount > 0 && (
                  <p className="text-sm text-destructive mt-1">
                    {failedCount} falha(s)
                  </p>
                )}
                <p className="text-muted-foreground text-sm mt-2">
                  Cada mentorado receberá um email de boas-vindas com instruções de acesso via OTP.
                </p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Erros na criação:
                </div>
                <ScrollArea className="max-h-32">
                  <ul className="list-disc list-inside text-xs space-y-1">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <Button onClick={() => onOpenChange(false)} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
