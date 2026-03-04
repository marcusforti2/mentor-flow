import { useState, useRef, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Upload, Sparkles, Save, Trash2, GripVertical, Plus,
  FileText, X, Copy, ExternalLink, Eye, ListChecks, MessageSquare,
  ClipboardList, User, Calendar, ChevronDown, ChevronRight,
} from 'lucide-react';

/* ── types ── */
const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  select: 'Múltipla escolha',
  multiple_choice: 'Múltipla escolha',
  yes_no: 'Sim / Não',
  scale: 'Escala (1-10)',
  link: 'Link / URL',
  image: 'Upload de Imagem',
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

interface OnboardingResponse {
  id: string;
  membership_id: string;
  created_at: string;
  profile?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
  responses: Record<string, any>;
}

export default function OnboardingBuilder() {
  const { activeMembership, tenant } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── state ── */
  const [activeTab, setActiveTab] = useState<string>('editor');
  const [freeText, setFreeText] = useState('');
  const [aiSuggestText, setAiSuggestText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [formTitle, setFormTitle] = useState('Formulário de Onboarding');
  const [formDescription, setFormDescription] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<FormQuestion[]>([]);

  // Responses tab
  const [responses, setResponses] = useState<OnboardingResponse[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  /* ── load existing questions ── */
  useEffect(() => {
    if (!tenant?.id || hasLoaded) return;
    loadExistingQuestions();
  }, [tenant?.id]);

  const loadExistingQuestions = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('behavioral_questions')
      .select('id, question_text, question_type, options, order_index, is_required, is_active')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (data && data.length > 0) {
      setQuestions(data.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type || 'text',
        options: (q.options as any[]) || [],
        is_required: q.is_required ?? false,
        order_index: q.order_index ?? 0,
        section: 'custom',
      })));
    }
    setHasLoaded(true);
  };

  /* ── file handling ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      try {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        newFiles.push({ name: file.name, content: text, size: file.size });
      } catch {
        toast.error(`Erro ao ler ${file.name}`);
      }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── AI: full generation ── */
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
          mode: 'full',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.form) {
        const customQs = (data.form.questions || [])
          .filter((q: any) => q.section === 'custom')
          .map((q: any, i: number) => ({
            ...q,
            id: `gen-${i}-${Date.now()}`,
            order_index: questions.length + i,
            section: 'custom',
          }));
        setQuestions(prev => [...prev, ...customQs]);
        setFormTitle(data.form.form_title || formTitle);
        setFormDescription(data.form.form_description || formDescription);
        toast.success(`${customQs.length} perguntas geradas e adicionadas!`);
        setFreeText('');
        setUploadedFiles([]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar formulário');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── AI: suggest fields ── */
  const suggestFields = async () => {
    if (!aiSuggestText.trim()) {
      toast.error('Descreva o que quer perguntar');
      return;
    }
    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-onboarding-form', {
        body: {
          freeText: aiSuggestText,
          mentorContext: tenant?.name || '',
          mode: 'suggest',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.suggestions) {
        setSuggestions(data.suggestions.map((s: any, i: number) => ({
          ...s,
          id: `sug-${i}-${Date.now()}`,
          order_index: i,
          section: 'custom',
          options: s.options || [],
        })));
        toast.success(`${data.suggestions.length} sugestões geradas!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar sugestões');
    } finally {
      setIsSuggesting(false);
    }
  };

  const addSuggestion = (s: FormQuestion) => {
    setQuestions(prev => [...prev, { ...s, id: `added-${Date.now()}-${Math.random()}`, order_index: prev.length }]);
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
    toast.success('Pergunta adicionada!');
  };

  /* ── question CRUD ── */
  const addManualQuestion = () => {
    setQuestions(prev => [...prev, {
      id: `manual-${Date.now()}`,
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
      opts[optIndex] = { ...opts[optIndex], text };
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

  /* ── save ── */
  const saveFormToDatabase = async () => {
    if (!activeMembership || !tenant) return;
    setIsSaving(true);
    try {
      await supabase.from('behavioral_questions').delete().eq('tenant_id', tenant.id);

      for (const q of questions) {
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
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── load responses ── */
  const loadResponses = async () => {
    if (!tenant) return;
    setIsLoadingResponses(true);
    try {
      const { data } = await supabase
        .from('behavioral_responses')
        .select('id, membership_id, created_at, question_id, selected_option')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        setResponses([]);
        setIsLoadingResponses(false);
        return;
      }

      // Group by membership_id
      const grouped: Record<string, { id: string; membership_id: string; created_at: string; responses: Record<string, any> }> = {};
      for (const r of data) {
        const mId = r.membership_id || 'unknown';
        if (!grouped[mId]) {
          grouped[mId] = { id: r.id, membership_id: mId, created_at: r.created_at || '', responses: {} };
        }
        grouped[mId].responses[r.question_id] = r.selected_option;
        // Use latest created_at
        if (r.created_at && r.created_at > grouped[mId].created_at) {
          grouped[mId].created_at = r.created_at;
        }
      }

      // Fetch profiles for these memberships
      const membershipIds = Object.keys(grouped);
      const { data: memberships } = await supabase
        .from('memberships')
        .select('id, user_id')
        .in('id', membershipIds);

      const userIds = (memberships || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const membershipUserMap = new Map((memberships || []).map(m => [m.id, m.user_id]));

      const result: OnboardingResponse[] = Object.values(grouped).map(g => ({
        ...g,
        profile: (() => {
          const userId = membershipUserMap.get(g.membership_id);
          return userId ? profileMap.get(userId) || null : null;
        })(),
      }));

      setResponses(result);
    } catch (err) {
      console.error('Error loading responses:', err);
    } finally {
      setIsLoadingResponses(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'responses' && tenant) {
      loadResponses();
    }
  }, [activeTab, tenant?.id]);

  /* ── helpers ── */
  const onboardingLink = activeMembership
    ? `${window.location.origin}/onboarding?mentor=${activeMembership.id}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(onboardingLink);
    toast.success('Link copiado!');
  };

  const questionLabel = (qId: string) => {
    const q = questions.find(x => x.id === qId);
    return q?.question_text || qId;
  };

  /* ── render ── */
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Formulário de Onboarding
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monte seu formulário manualmente ou peça à IA para sugerir perguntas
          </p>
        </div>
        <Button size="sm" onClick={saveFormToDatabase} disabled={isSaving || questions.length === 0}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar & Publicar
        </Button>
      </div>

      {/* Link */}
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
          {/* Question list */}
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
                      <button
                        onClick={() => moveQuestion(q.id, 'up')}
                        disabled={qi === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown className="h-3 w-3 rotate-180" />
                      </button>
                      <button
                        onClick={() => moveQuestion(q.id, 'down')}
                        disabled={qi === questions.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                      >
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
                    <Select
                      value={q.question_type}
                      onValueChange={v => updateQuestion(q.id, 'question_type', v)}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUESTION_TYPE_LABELS)
                          .filter(([k]) => k !== 'system_field')
                          .map(([k, label]) => (
                            <SelectItem key={k} value={k}>{label}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">Obrig.</Label>
                      <Switch
                        checked={q.is_required}
                        onCheckedChange={v => updateQuestion(q.id, 'is_required', v)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(q.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Options for select/multiple_choice */}
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

                {/* Type badge for special types */}
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
          {/* AI Suggest */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Peça sugestões à IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Descreva o que quer saber dos seus mentorados e a IA sugere perguntas prontas
              </p>
              <Textarea
                value={aiSuggestText}
                onChange={e => setAiSuggestText(e.target.value)}
                placeholder="Ex: Quero saber o nível de experiência em vendas, os canais de aquisição que usam, e os maiores desafios..."
                className="min-h-[100px]"
              />
              <Button
                onClick={suggestFields}
                disabled={isSuggesting || !aiSuggestText.trim()}
                className="w-full"
              >
                {isSuggesting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando sugestões...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Sugerir Perguntas</>
                )}
              </Button>

              {/* Suggestions list */}
              {suggestions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-muted-foreground font-medium">Sugestões da IA — clique para adicionar:</p>
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => addSuggestion(s)}
                      className="w-full text-left p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{s.question_text}</span>
                        <Badge variant="outline" className="text-[10px]">{QUESTION_TYPE_LABELS[s.question_type] || s.question_type}</Badge>
                      </div>
                      {s.options && s.options.length > 0 && (
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

          {/* Full AI generation from docs */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Gerar de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Envie documentos e textos — a IA extrai perguntas e adiciona ao seu formulário
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
                className="w-full h-20 border-dashed border-2"
                onClick={() => fileInputRef.current?.click()}
              >
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
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setUploadedFiles(prev => prev.filter((_, ii) => ii !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                placeholder="Ou cole um texto aqui..."
                className="min-h-[80px]"
              />
              <Button
                onClick={generateForm}
                disabled={isGenerating || (!freeText.trim() && uploadedFiles.length === 0)}
                className="w-full gradient-gold text-primary-foreground"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Gerar e Adicionar Perguntas</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ RESPONSES TAB ═══ */}
        <TabsContent value="responses" className="space-y-4 mt-4">
          {isLoadingResponses && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!isLoadingResponses && responses.length === 0 && (
            <Card className="glass-card">
              <CardContent className="p-8 text-center space-y-3">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhuma resposta recebida ainda</p>
                <p className="text-sm text-muted-foreground/60">
                  Compartilhe o link do onboarding para receber respostas
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoadingResponses && responses.map(r => (
            <Card key={r.id} className="glass-card">
              <CardContent className="p-4">
                <button
                  onClick={() => setExpandedResponse(expandedResponse === r.id ? null : r.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {r.profile?.full_name || 'Mentorado'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.profile?.email || r.membership_id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedResponse === r.id ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {expandedResponse === r.id && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                    {Object.entries(r.responses).map(([qId, answer]) => (
                      <div key={qId} className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{questionLabel(qId)}</p>
                        <p className="text-sm text-foreground bg-secondary/30 rounded-lg p-2">
                          {typeof answer === 'object' && answer !== null
                            ? (answer as any).text || (answer as any).fileName || JSON.stringify(answer)
                            : String(answer)}
                        </p>
                      </div>
                    ))}
                    {Object.keys(r.responses).length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Nenhuma resposta personalizada registrada</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {!isLoadingResponses && responses.length > 0 && (
            <Button variant="outline" size="sm" onClick={loadResponses}>
              <Loader2 className="h-3 w-3 mr-1" /> Atualizar
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
