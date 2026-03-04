import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Upload, Sparkles, Save, Trash2, GripVertical, Plus,
  FileText, X, Copy, ExternalLink, Eye,
} from 'lucide-react';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  select: 'Múltipla escolha',
  multiple_choice: 'Múltipla escolha',
  yes_no: 'Sim / Não',
  scale: 'Escala (1-10)',
  link: 'Link / URL',
  image: 'Upload de Imagem',
  disc: 'DISC',
  system_field: 'Campo do sistema',
};

interface FormQuestion {
  id: string;
  question_text: string;
  question_type: string;
  system_field_key?: string;
  options: any[];
  is_required: boolean;
  order_index: number;
  section: string;
}

interface GeneratedForm {
  form_title: string;
  form_description: string;
  questions: FormQuestion[];
}

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

const SECTION_LABELS: Record<string, string> = {
  basic: '👤 Dados Pessoais',
  business: '💼 Negócio',
  custom: '📋 Perguntas do Mentor',
  behavioral: '🧠 Perfil Comportamental (DISC)',
};

const SECTION_COLORS: Record<string, string> = {
  basic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  business: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  custom: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  behavioral: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function OnboardingBuilder() {
  const { activeMembership, tenant } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [freeText, setFreeText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedForm, setGeneratedForm] = useState<GeneratedForm | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      try {
        const text = await readFileContent(file);
        newFiles.push({ name: file.name, content: text, size: file.size });
      } catch (err) {
        toast.error(`Erro ao ler ${file.name}: formato não suportado`);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.type === 'text/plain') {
          resolve(result);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // For Excel we read as base64 and let AI parse tabular data
          resolve(`[Planilha: ${file.name}]\n${result}`);
        } else {
          resolve(result);
        }
      };
      reader.onerror = reject;

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('pdf') || file.type.includes('word')) {
        // Read as text - the AI can still extract meaning from CSV-like data
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const generateForm = async () => {
    if (!freeText.trim() && uploadedFiles.length === 0) {
      toast.error('Envie pelo menos um documento ou cole um texto');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-onboarding-form', {
        body: {
          freeText,
          documents: uploadedFiles.map(f => ({ name: f.name, content: f.content })),
          mentorContext: tenant?.name || '',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.form) {
        // Add IDs to questions
        const questions = data.form.questions.map((q: any, i: number) => ({
          ...q,
          id: `gen-${i}-${Date.now()}`,
          order_index: i,
        }));
        setGeneratedForm({ ...data.form, questions });
        toast.success('Formulário gerado com sucesso!');
      }
    } catch (err: any) {
      console.error('Error generating form:', err);
      toast.error(err.message || 'Erro ao gerar formulário');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    if (!generatedForm) return;
    setGeneratedForm({
      ...generatedForm,
      questions: generatedForm.questions.map(q =>
        q.id === id ? { ...q, [field]: value } : q
      ),
    });
  };

  const updateOption = (questionId: string, optIndex: number, text: string) => {
    if (!generatedForm) return;
    setGeneratedForm({
      ...generatedForm,
      questions: generatedForm.questions.map(q => {
        if (q.id !== questionId) return q;
        const opts = [...q.options];
        opts[optIndex] = { ...opts[optIndex], text };
        return { ...q, options: opts };
      }),
    });
  };

  const removeQuestion = (id: string) => {
    if (!generatedForm) return;
    setGeneratedForm({
      ...generatedForm,
      questions: generatedForm.questions.filter(q => q.id !== id),
    });
  };

  const addCustomQuestion = () => {
    if (!generatedForm) return;
    const newQ: FormQuestion = {
      id: `custom-${Date.now()}`,
      question_text: '',
      question_type: 'text',
      options: [],
      is_required: false,
      order_index: generatedForm.questions.length,
      section: 'custom',
    };
    setGeneratedForm({
      ...generatedForm,
      questions: [...generatedForm.questions, newQ],
    });
  };

  const saveFormToDatabase = async () => {
    if (!generatedForm || !activeMembership || !tenant) return;

    setIsSaving(true);
    try {
      // Filter out system fields - those are handled by the onboarding page itself
      const behavioralAndCustom = generatedForm.questions.filter(
        q => q.section === 'custom' || q.section === 'behavioral'
      );

      // Delete existing questions for this tenant
      await supabase
        .from('behavioral_questions')
        .delete()
        .eq('tenant_id', tenant.id);

      // Insert new questions
      for (const q of behavioralAndCustom) {
        if (!q.question_text.trim()) continue;
        await supabase.from('behavioral_questions').insert({
          owner_membership_id: activeMembership.id,
          tenant_id: tenant.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || [],
          order_index: q.order_index,
          is_active: true,
          is_required: q.is_required,
        });
      }

      toast.success('Formulário salvo com sucesso!');
    } catch (err: any) {
      console.error('Error saving form:', err);
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const onboardingLink = activeMembership
    ? `${window.location.origin}/onboarding?mentor=${activeMembership.id}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(onboardingLink);
    toast.success('Link copiado!');
  };

  const groupedQuestions = generatedForm?.questions.reduce((acc, q) => {
    const section = q.section || 'custom';
    if (!acc[section]) acc[section] = [];
    acc[section].push(q);
    return acc;
  }, {} as Record<string, FormQuestion[]>);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Gerador de Onboarding com IA
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Envie seus documentos e textos — a IA cria o formulário completo automaticamente
          </p>
        </div>
        {generatedForm && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4 mr-1" /> {showPreview ? 'Editar' : 'Preview'}
            </Button>
            <Button size="sm" onClick={saveFormToDatabase} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar & Publicar
            </Button>
          </div>
        )}
      </div>

      {/* Link do Onboarding */}
      {activeMembership && (
        <Card className="glass-card border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ExternalLink className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Link público do seu onboarding</p>
                <code className="text-xs text-foreground/80 break-all">{onboardingLink}</code>
              </div>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Area */}
      {!generatedForm && (
        <div className="space-y-4">
          {/* File Upload */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Enviar Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Excel, PDF, Word, TXT, CSV — envie quantos quiser. A IA vai ler todos e extrair as perguntas.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full h-24 border-dashed border-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para enviar arquivos
                  </span>
                </div>
              </Button>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)}KB
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Free Text */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Colar Texto / Perguntas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                placeholder="Cole aqui suas perguntas, textos de formulários antigos, ou descreva o que quer perguntar no onboarding..."
                className="min-h-[150px]"
              />
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full gradient-gold text-primary-foreground"
            onClick={generateForm}
            disabled={isGenerating || (!freeText.trim() && uploadedFiles.length === 0)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Gerando formulário com IA...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Gerar Formulário com IA
              </>
            )}
          </Button>
        </div>
      )}

      {/* Generated Form Editor */}
      {generatedForm && !showPreview && (
        <div className="space-y-4">
          {/* Form Title */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Título do Formulário</Label>
                <Input
                  value={generatedForm.form_title}
                  onChange={e => setGeneratedForm({ ...generatedForm, form_title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Textarea
                  value={generatedForm.form_description}
                  onChange={e => setGeneratedForm({ ...generatedForm, form_description: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Questions by Section */}
          {groupedQuestions && ['basic', 'business', 'custom', 'behavioral'].map(section => {
            const sectionQuestions = groupedQuestions[section];
            if (!sectionQuestions || sectionQuestions.length === 0) return null;

            return (
              <div key={section} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={SECTION_COLORS[section]}>
                    {SECTION_LABELS[section] || section}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {sectionQuestions.length} pergunta{sectionQuestions.length > 1 ? 's' : ''}
                  </span>
                </div>

                {sectionQuestions.map((q, qi) => (
                  <Card key={q.id} className="glass-card">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Textarea
                              value={q.question_text}
                              onChange={e => updateQuestion(q.id, 'question_text', e.target.value)}
                              placeholder="Texto da pergunta"
                              className="text-sm"
                              rows={1}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {q.section !== 'basic' && q.question_type !== 'system_field' && (
                            <Select
                              value={q.question_type}
                              onValueChange={v => updateQuestion(q.id, 'question_type', v)}
                            >
                              <SelectTrigger className="h-8 w-[130px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(QUESTION_TYPE_LABELS)
                                  .filter(([k]) => k !== 'system_field' && k !== 'disc')
                                  .map(([k, label]) => (
                                    <SelectItem key={k} value={k}>{label}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-muted-foreground">Obrig.</Label>
                            <Switch
                              checked={q.is_required}
                              onCheckedChange={v => updateQuestion(q.id, 'is_required', v)}
                            />
                          </div>
                          {q.section !== 'basic' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(q.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Options for select/disc/multiple_choice */}
                      {(q.question_type === 'disc' || q.question_type === 'select' || q.question_type === 'multiple_choice') && (
                        <div className="pl-6 space-y-1.5">
                          {(q.options || []).map((opt: any, oi: number) => (
                            <div key={oi} className="flex items-center gap-2">
                              {q.question_type === 'disc' && (
                                <span className="text-xs font-mono text-muted-foreground w-5">{opt.value}</span>
                              )}
                              <Input
                                value={typeof opt === 'string' ? opt : opt.text}
                                onChange={e => updateOption(q.id, oi, e.target.value)}
                                placeholder={`Opção ${oi + 1}`}
                                className="h-8 text-xs flex-1"
                              />
                              {q.question_type !== 'disc' && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                  if (!generatedForm) return;
                                  setGeneratedForm({
                                    ...generatedForm,
                                    questions: generatedForm.questions.map(qq => {
                                      if (qq.id !== q.id) return qq;
                                      return { ...qq, options: qq.options.filter((_: any, ii: number) => ii !== oi) };
                                    }),
                                  });
                                }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {q.question_type !== 'disc' && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                              if (!generatedForm) return;
                              setGeneratedForm({
                                ...generatedForm,
                                questions: generatedForm.questions.map(qq => {
                                  if (qq.id !== q.id) return qq;
                                  return { ...qq, options: [...(qq.options || []), { text: '', value: '' }] };
                                }),
                              });
                            }}>
                              <Plus className="h-3 w-3 mr-1" /> Opção
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Type badge for non-editable types */}
                      {['image', 'link', 'scale', 'yes_no'].includes(q.question_type) && (
                        <Badge variant="secondary" className="text-xs ml-6">
                          {QUESTION_TYPE_LABELS[q.question_type]}
                        </Badge>
                      )}

                      {q.system_field_key && (
                        <Badge variant="secondary" className="text-xs">
                          Campo: {q.system_field_key}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}

          {/* Add custom question */}
          <Button variant="outline" className="w-full" onClick={addCustomQuestion}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Pergunta
          </Button>

          {/* Regenerate */}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setGeneratedForm(null)}
          >
            <Sparkles className="h-4 w-4 mr-1" /> Gerar novamente do zero
          </Button>
        </div>
      )}

      {/* Preview Mode */}
      {generatedForm && showPreview && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">{generatedForm.form_title}</CardTitle>
            <p className="text-sm text-muted-foreground">{generatedForm.form_description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {generatedForm.questions.map((q, i) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  {q.question_text}
                  {q.is_required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {q.question_type === 'text' || q.question_type === 'system_field' ? (
                  <Input placeholder="Resposta..." disabled className="bg-secondary/30" />
                ) : q.question_type === 'textarea' ? (
                  <Textarea placeholder="Resposta..." disabled className="bg-secondary/30" rows={2} />
                ) : (q.question_type === 'select' || q.question_type === 'disc') && q.options?.length > 0 ? (
                  <div className="space-y-1.5">
                    {q.options.map((opt: any, oi: number) => (
                      <div key={oi} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-secondary/20">
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
                        <span className="text-sm text-muted-foreground">{opt.text}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
