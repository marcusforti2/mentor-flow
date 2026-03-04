import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Save, Trash2, Plus, X, Copy, ExternalLink, Eye,
  ListChecks, MessageSquare, ClipboardList, User, ChevronDown,
  ChevronRight, Sparkles, Upload, FileText, ArrowLeft, MoreVertical,
  Link as LinkIcon, Globe,
} from 'lucide-react';

/* ── types ── */
const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  select: 'Lista de opções',
  multiple_choice: 'Múltipla escolha',
  yes_no: 'Sim / Não',
  scale: 'Escala (1-10)',
  link: 'Link / URL',
  image: 'Upload de Imagem',
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

interface FormRecord {
  id: string;
  title: string;
  description: string | null;
  form_type: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  settings: any;
  journey_stage_id: string | null;
}

interface FormSubmission {
  id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: Record<string, any>;
  created_at: string;
  membership_id: string | null;
}

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

type View = 'list' | 'editor';

export default function OnboardingBuilder() {
  const { activeMembership, tenant } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View state
  const [view, setView] = useState<View>('list');
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(true);

  // Editor state
  const [activeForm, setActiveForm] = useState<FormRecord | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  // AI state
  const [aiSuggestText, setAiSuggestText] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<FormQuestion[]>([]);
  const [freeText, setFreeText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Responses state
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  /* ── load forms list ── */
  useEffect(() => {
    if (tenant?.id) loadForms();
  }, [tenant?.id]);

  const loadForms = async () => {
    if (!tenant) return;
    setIsLoadingForms(true);
    const { data } = await supabase
      .from('tenant_forms')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    setForms((data || []) as FormRecord[]);
    setIsLoadingForms(false);
  };

  /* ── open form editor ── */
  const openForm = async (form: FormRecord) => {
    setActiveForm(form);
    setFormTitle(form.title);
    setFormDescription(form.description || '');
    setIsActive(form.is_active);
    setActiveTab('editor');
    setSuggestions([]);

    const { data } = await supabase
      .from('form_questions')
      .select('*')
      .eq('form_id', form.id)
      .order('order_index', { ascending: true });

    setQuestions((data || []).map((q: any) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      system_field_key: q.system_field_key,
      options: q.options || [],
      is_required: q.is_required,
      order_index: q.order_index,
      section: q.section || 'custom',
    })));
    setView('editor');
  };

  /* ── create new form ── */
  const createForm = async (formType: 'onboarding' | 'custom') => {
    if (!activeMembership || !tenant) return;

    // Check if onboarding form already exists
    if (formType === 'onboarding') {
      const existing = forms.find(f => f.form_type === 'onboarding');
      if (existing) {
        openForm(existing);
        return;
      }
    }

    const slug = formType === 'onboarding'
      ? `onboarding-${tenant.slug || tenant.id.slice(0, 8)}`
      : `form-${Date.now().toString(36)}`;

    const { data, error } = await supabase.from('tenant_forms').insert({
      tenant_id: tenant.id,
      owner_membership_id: activeMembership.id,
      title: formType === 'onboarding' ? 'Formulário de Onboarding' : 'Novo Formulário',
      form_type: formType,
      slug,
      is_active: true,
    }).select().single();

    if (error) {
      toast.error('Erro ao criar formulário');
      console.error(error);
      return;
    }

    if (data) {
      await loadForms();
      openForm(data as FormRecord);
      toast.success('Formulário criado!');
    }
  };

  const deleteForm = async (formId: string) => {
    if (!confirm('Tem certeza que deseja excluir este formulário? Todas as perguntas e respostas serão perdidas.')) return;
    await supabase.from('tenant_forms').delete().eq('id', formId);
    setForms(prev => prev.filter(f => f.id !== formId));
    toast.success('Formulário excluído');
  };

  const toggleFormActive = async (formId: string, currentActive: boolean) => {
    const { error } = await supabase.from('tenant_forms').update({ is_active: !currentActive }).eq('id', formId);
    if (error) {
      toast.error('Erro ao alterar status');
      return;
    }
    setForms(prev => prev.map(f => f.id === formId ? { ...f, is_active: !currentActive } : f));
    toast.success(!currentActive ? 'Formulário ativado' : 'Formulário desativado');
  };

  /* ── question CRUD ── */
  const addManualQuestion = () => {
    setQuestions(prev => [...prev, {
      id: `new-${Date.now()}`,
      question_text: '',
      question_type: 'text',
      options: [],
      is_required: false,
      order_index: prev.length,
      section: 'custom',
    }]);
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (questionId: string, optIndex: number, text: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      const opts = [...q.options];
      opts[optIndex] = { text, value: text };
      return { ...q, options: opts };
    }));
  };

  const removeOption = (questionId: string, optIndex: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      return { ...q, options: q.options.filter((_: any, i: number) => i !== optIndex) };
    }));
  };

  const addOption = (questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      return { ...q, options: [...(q.options || []), { text: '', value: '' }] };
    }));
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const moveQuestion = (id: string, dir: 'up' | 'down') => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id);
      if (idx < 0) return prev;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((q, i) => ({ ...q, order_index: i }));
    });
  };

  /* ── save form ── */
  const saveForm = async () => {
    if (!activeForm || !activeMembership || !tenant) return;
    setIsSaving(true);
    try {
      // Update form metadata
      const { error: formError } = await supabase.from('tenant_forms')
        .update({ title: formTitle, description: formDescription, is_active: isActive })
        .eq('id', activeForm.id);
      if (formError) throw formError;

      // Delete existing questions
      await supabase.from('form_questions').delete().eq('form_id', activeForm.id);

      // Insert new questions
      const validQuestions = questions.filter(q => q.question_text.trim());
      if (validQuestions.length > 0) {
        const { error: qError } = await supabase.from('form_questions').insert(
          validQuestions.map((q, i) => ({
            form_id: activeForm.id,
            question_text: q.question_text,
            question_type: q.question_type,
            system_field_key: q.system_field_key || null,
            options: q.options || [],
            is_required: q.is_required,
            order_index: i,
            section: q.section || 'custom',
          }))
        );
        if (qError) throw qError;
      }

      // Reload questions to get real IDs
      const { data: savedQs } = await supabase
        .from('form_questions')
        .select('*')
        .eq('form_id', activeForm.id)
        .order('order_index');

      if (savedQs) {
        setQuestions(savedQs.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          system_field_key: q.system_field_key,
          options: q.options || [],
          is_required: q.is_required,
          order_index: q.order_index,
          section: q.section || 'custom',
        })));
      }

      toast.success('Formulário salvo com sucesso!');
      await loadForms();
      setView('list');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  /* ── AI suggest ── */
  const suggestFields = async () => {
    if (!aiSuggestText.trim()) return;
    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-onboarding-form', {
        body: { freeText: aiSuggestText, mentorContext: tenant?.name || '', mode: 'suggest' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.suggestions) {
        setSuggestions(data.suggestions.map((s: any, i: number) => ({
          ...s, id: `sug-${i}-${Date.now()}`, order_index: i, section: 'custom', options: s.options || [],
        })));
        toast.success(`${data.suggestions.length} sugestões geradas!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    } finally {
      setIsSuggesting(false);
    }
  };

  const addSuggestion = (s: FormQuestion) => {
    setQuestions(prev => [...prev, { ...s, id: `added-${Date.now()}-${Math.random()}`, order_index: prev.length }]);
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
    toast.success('Pergunta adicionada!');
  };

  /* ── AI full generation ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        setUploadedFiles(prev => [...prev, { name: file.name, content: text, size: file.size }]);
      } catch { toast.error(`Erro ao ler ${file.name}`); }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateForm = async () => {
    if (!freeText.trim() && uploadedFiles.length === 0) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-onboarding-form', {
        body: {
          freeText, documents: uploadedFiles.map(f => ({ name: f.name, content: f.content })),
          mentorContext: tenant?.name || '', mode: 'full',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.form) {
        const customQs = (data.form.questions || [])
          .filter((q: any) => q.section === 'custom')
          .map((q: any, i: number) => ({
            ...q, id: `gen-${i}-${Date.now()}`, order_index: questions.length + i, section: 'custom',
          }));
        setQuestions(prev => [...prev, ...customQs]);
        toast.success(`${customQs.length} perguntas geradas!`);
        setFreeText('');
        setUploadedFiles([]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── load submissions ── */
  const loadSubmissions = async () => {
    if (!activeForm) return;
    setIsLoadingSubmissions(true);
    const { data } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('form_id', activeForm.id)
      .order('created_at', { ascending: false });
    setSubmissions((data || []) as FormSubmission[]);
    setIsLoadingSubmissions(false);
  };

  useEffect(() => {
    if (activeTab === 'responses' && activeForm) loadSubmissions();
  }, [activeTab, activeForm?.id]);

  /* ── helpers ── */
  const getFormLink = (form: FormRecord) => `${window.location.origin}/f/${form.slug}`;

  const copyLink = (form: FormRecord) => {
    navigator.clipboard.writeText(getFormLink(form));
    toast.success('Link copiado!');
  };

  const questionLabel = (qId: string) => {
    const q = questions.find(x => x.id === qId);
    return q?.question_text || qId;
  };

  const hasOnboarding = forms.some(f => f.form_type === 'onboarding');

  /* ════════════ RENDER ════════════ */

  // ── LIST VIEW ──
  if (view === 'list') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Formulários</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Crie formulários estilo Typeform para onboarding e pesquisas
            </p>
          </div>
          <div className="flex gap-2">
            {!hasOnboarding && (
              <Button onClick={() => createForm('onboarding')} variant="outline" size="sm">
                <ClipboardList className="h-4 w-4 mr-1.5" /> Criar Onboarding
              </Button>
            )}
            <Button onClick={() => createForm('custom')} size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Novo Formulário
            </Button>
          </div>
        </div>

        {isLoadingForms && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoadingForms && forms.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-12 text-center space-y-4">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <div>
                <p className="text-lg font-medium text-foreground">Nenhum formulário ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie seu primeiro formulário de onboarding ou pesquisa personalizada
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => createForm('onboarding')} variant="outline">
                  <ClipboardList className="h-4 w-4 mr-2" /> Formulário de Onboarding
                </Button>
                <Button onClick={() => createForm('custom')}>
                  <Plus className="h-4 w-4 mr-2" /> Formulário Customizado
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          {forms.map(form => (
            <Card
              key={form.id}
              className="glass-card hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => openForm(form)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    form.form_type === 'onboarding' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {form.form_type === 'onboarding' ? <ClipboardList className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{form.title}</p>
                      <Badge variant={form.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {form.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {form.form_type === 'onboarding' && (
                        <Badge variant="outline" className="text-[10px] shrink-0">Onboarding</Badge>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{form.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={() => toggleFormActive(form.id, form.is_active)}
                    />
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); copyLink(form); }}
                    title="Copiar link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); window.open(getFormLink(form), '_blank'); }}
                    title="Abrir formulário"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  {form.form_type !== 'onboarding' && (
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteForm(form.id); }}
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── EDITOR VIEW ──
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setView('list'); loadForms(); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="text-xl font-display font-bold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
              placeholder="Título do formulário"
            />
            <Input
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              className="text-sm text-muted-foreground border-none p-0 h-auto focus-visible:ring-0 bg-transparent mt-0.5"
              placeholder="Descrição (opcional)"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Ativo</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button onClick={saveForm} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Link */}
      {activeForm && (
        <Card className="glass-card border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <code className="text-xs text-foreground/80 break-all flex-1">{getFormLink(activeForm)}</code>
              <Button variant="outline" size="sm" onClick={() => copyLink(activeForm)}>
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(getFormLink(activeForm), '_blank')}>
                <Eye className="h-3 w-3 mr-1" /> Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="editor" className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" /> Editor
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> IA
          </TabsTrigger>
          <TabsTrigger value="responses" className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" /> Respostas
          </TabsTrigger>
        </TabsList>

        {/* ═══ EDITOR TAB ═══ */}
        <TabsContent value="editor" className="space-y-4 mt-4">
          {questions.length === 0 && (
            <Card className="glass-card">
              <CardContent className="p-8 text-center space-y-3">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhuma pergunta ainda</p>
                <p className="text-sm text-muted-foreground/60">
                  Adicione perguntas manualmente ou use a aba IA para gerar sugestões
                </p>
              </CardContent>
            </Card>
          )}

          {questions.map((q, qi) => (
            <Card key={q.id} className="glass-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveQuestion(q.id, 'up')} disabled={qi === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                        <ChevronDown className="h-3 w-3 rotate-180" />
                      </button>
                      <button onClick={() => moveQuestion(q.id, 'down')} disabled={qi === questions.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{qi + 1}</span>
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
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Select value={q.question_type} onValueChange={v => updateQuestion(q.id, 'question_type', v)}>
                      <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUESTION_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">Obrig.</Label>
                      <Switch checked={q.is_required} onCheckedChange={v => updateQuestion(q.id, 'is_required', v)} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(q.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {(q.question_type === 'select' || q.question_type === 'multiple_choice') && (
                  <div className="pl-8 space-y-1.5">
                    {(q.options || []).map((opt: any, oi: number) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Input
                          value={typeof opt === 'string' ? opt : opt.text}
                          onChange={e => updateOption(q.id, oi, e.target.value)}
                          placeholder={`Opção ${oi + 1}`}
                          className="h-8 text-xs flex-1"
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeOption(q.id, oi)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => addOption(q.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Opção
                    </Button>
                  </div>
                )}

                {['image', 'link', 'scale', 'yes_no'].includes(q.question_type) && (
                  <Badge variant="secondary" className="text-xs ml-8">
                    {QUESTION_TYPE_LABELS[q.question_type]}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full" onClick={addManualQuestion}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Pergunta
          </Button>
        </TabsContent>

        {/* ═══ AI TAB ═══ */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Peça sugestões à IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Descreva o que quer saber e a IA sugere perguntas prontas
              </p>
              <Textarea
                value={aiSuggestText}
                onChange={e => setAiSuggestText(e.target.value)}
                placeholder="Ex: Quero saber o nível de experiência em vendas, os canais de aquisição que usam..."
                className="min-h-[100px]"
              />
              <Button onClick={suggestFields} disabled={isSuggesting || !aiSuggestText.trim()} className="w-full">
                {isSuggesting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Sugerir Perguntas</>}
              </Button>
              {suggestions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-muted-foreground font-medium">Sugestões — clique para adicionar:</p>
                  {suggestions.map(s => (
                    <button key={s.id} onClick={() => addSuggestion(s)}
                      className="w-full text-left p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{s.question_text}</span>
                        <Badge variant="outline" className="text-[10px]">{QUESTION_TYPE_LABELS[s.question_type] || s.question_type}</Badge>
                      </div>
                      {s.options?.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Opções: {s.options.map((o: any) => typeof o === 'string' ? o : o.text).join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-primary">+ Clique para adicionar</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" /> Gerar de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input ref={fileInputRef} type="file" multiple accept=".xlsx,.xls,.csv,.txt,.pdf,.doc,.docx"
                onChange={handleFileUpload} className="hidden" />
              <Button variant="outline" className="w-full h-20 border-dashed border-2"
                onClick={() => fileInputRef.current?.click()}>
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Enviar arquivos</span>
                </div>
              </Button>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => setUploadedFiles(prev => prev.filter((_, ii) => ii !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Textarea value={freeText} onChange={e => setFreeText(e.target.value)}
                placeholder="Ou cole um texto aqui..." className="min-h-[80px]" />
              <Button onClick={generateForm} disabled={isGenerating || (!freeText.trim() && uploadedFiles.length === 0)} className="w-full">
                {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Gerar e Adicionar Perguntas</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ RESPONSES TAB ═══ */}
        <TabsContent value="responses" className="space-y-4 mt-4">
          {isLoadingSubmissions && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!isLoadingSubmissions && submissions.length === 0 && (
            <Card className="glass-card">
              <CardContent className="p-8 text-center space-y-3">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhuma resposta recebida ainda</p>
                <p className="text-sm text-muted-foreground/60">
                  Compartilhe o link do formulário para receber respostas
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoadingSubmissions && submissions.map(sub => (
            <Card key={sub.id} className="glass-card">
              <CardContent className="p-4">
                <button
                  onClick={() => setExpandedSubmission(expandedSubmission === sub.id ? null : sub.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {sub.respondent_name || 'Respondente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.respondent_email || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSubmission === sub.id ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {expandedSubmission === sub.id && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                    {Object.entries(sub.answers).map(([qId, answer]) => (
                      <div key={qId} className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{questionLabel(qId)}</p>
                        <p className="text-sm text-foreground bg-secondary/30 rounded-lg p-2">
                          {typeof answer === 'object' && answer !== null
                            ? (answer as any).text || (answer as any).fileName || JSON.stringify(answer)
                            : String(answer)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {!isLoadingSubmissions && submissions.length > 0 && (
            <Button variant="outline" size="sm" onClick={loadSubmissions}>
              <Loader2 className="h-3 w-3 mr-1" /> Atualizar
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
