import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Loader2,
  Trash2,
  Edit3,
  Eye,
  Copy,
  Link2,
  ExternalLink,
  CheckCircle,
  Type,
  ListChecks,
  ToggleLeft,
  Hash,
  MessageSquare,
  Image,
  LinkIcon,
  Asterisk,
  ArrowLeft,
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  order_index: number;
  is_active: boolean;
  is_required: boolean;
}

interface FormulariosProps {
  mentorId: string;
  onBack?: () => void;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Texto Curto', icon: Type, description: 'Resposta em uma linha' },
  { value: 'textarea', label: 'Texto Longo', icon: MessageSquare, description: 'Texto com várias linhas' },
  { value: 'multiple_choice', label: 'Múltipla Escolha', icon: ListChecks, description: 'Selecionar uma opção' },
  { value: 'yes_no', label: 'Sim/Não', icon: ToggleLeft, description: 'Resposta binária' },
  { value: 'scale', label: 'Escala 1-10', icon: Hash, description: 'Avaliação numérica' },
  { value: 'image', label: 'Upload de Imagem', icon: Image, description: 'Envio de foto/imagem' },
  { value: 'link', label: 'Link/URL', icon: LinkIcon, description: 'URL de site, perfil, etc.' },
];

const Formularios = ({ mentorId, onBack }: FormulariosProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'text',
    options: [] as string[],
    is_required: true,
  });
  const [optionInput, setOptionInput] = useState('');

  const { toast } = useToast();

  const fetchQuestions = async () => {
    if (!mentorId) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('behavioral_questions')
        .select('*')
        .eq('owner_membership_id', mentorId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as perguntas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [mentorId]);

  const handleAddQuestion = async () => {
    if (!mentorId || !newQuestion.question_text.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite o texto da pergunta.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const nextOrder = questions.length;
      
      const { error } = await supabase
        .from('behavioral_questions')
        .insert({
          mentor_id: mentorId,
          question_text: newQuestion.question_text,
          question_type: newQuestion.question_type,
          options: newQuestion.question_type === 'multiple_choice' ? newQuestion.options : [],
          order_index: nextOrder,
          is_active: true,
          is_required: newQuestion.is_required,
        });
      
      if (error) throw error;
      
      toast({ title: "Pergunta adicionada!" });
      setIsAddDialogOpen(false);
      setNewQuestion({ question_text: '', question_type: 'text', options: [], is_required: true });
      await fetchQuestions();
    } catch (error: any) {
      console.error('Error adding question:', error);
      toast({
        title: "Erro ao adicionar",
        description: error.message || "Não foi possível adicionar a pergunta.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('behavioral_questions')
        .update({
          question_text: editingQuestion.question_text,
          question_type: editingQuestion.question_type,
          options: editingQuestion.question_type === 'multiple_choice' ? editingQuestion.options : [],
          is_required: editingQuestion.is_required,
        })
        .eq('id', editingQuestion.id);
      
      if (error) throw error;
      
      toast({ title: "Pergunta atualizada!" });
      setIsEditDialogOpen(false);
      setEditingQuestion(null);
      await fetchQuestions();
    } catch (error: any) {
      console.error('Error updating question:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar a pergunta.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('behavioral_questions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Pergunta removida!" });
      await fetchQuestions();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('behavioral_questions')
        .update({ is_active: !currentState })
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchQuestions();
    } catch (error: any) {
      console.error('Error toggling question:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, optionInput.trim()]
    });
    setOptionInput('');
  };

  const removeOption = (index: number) => {
    setNewQuestion({
      ...newQuestion,
      options: newQuestion.options.filter((_, i) => i !== index)
    });
  };

  const addEditOption = () => {
    if (!optionInput.trim() || !editingQuestion) return;
    const currentOptions = Array.isArray(editingQuestion.options) ? editingQuestion.options : [];
    setEditingQuestion({
      ...editingQuestion,
      options: [...currentOptions, optionInput.trim()]
    });
    setOptionInput('');
  };

  const removeEditOption = (index: number) => {
    if (!editingQuestion) return;
    const currentOptions = Array.isArray(editingQuestion.options) ? editingQuestion.options : [];
    setEditingQuestion({
      ...editingQuestion,
      options: currentOptions.filter((_: string, i: number) => i !== index)
    });
  };

  const copyOnboardingLink = () => {
    const link = `${window.location.origin}/onboarding?mentor=${mentorId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "Envie para seus mentorados" });
  };

  const getQuestionTypeIcon = (type: string) => {
    const questionType = QUESTION_TYPES.find(t => t.value === type);
    return questionType?.icon || Type;
  };

  const getQuestionTypeLabel = (type: string) => {
    const questionType = QUESTION_TYPES.find(t => t.value === type);
    return questionType?.label || type;
  };

  const activeQuestions = questions.filter(q => q.is_active);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Formulário de Onboarding</h2>
            <p className="text-muted-foreground text-sm">Configure as perguntas do formulário de entrada</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-gold text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Nova Pergunta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Pergunta</DialogTitle>
                <DialogDescription>
                  Configure uma nova pergunta para o formulário de onboarding
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="question_text">Pergunta *</Label>
                  <Textarea
                    id="question_text"
                    value={newQuestion.question_text}
                    onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})}
                    placeholder="Ex: Qual é o maior desafio do seu negócio hoje?"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Resposta</Label>
                    <Select
                      value={newQuestion.question_type}
                      onValueChange={(value) => setNewQuestion({...newQuestion, question_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Obrigatória?</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={newQuestion.is_required}
                        onCheckedChange={(checked) => setNewQuestion({...newQuestion, is_required: checked})}
                      />
                      <span className="text-sm text-muted-foreground">
                        {newQuestion.is_required ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {newQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Opções de Resposta</Label>
                    <div className="flex gap-2">
                      <Input
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        placeholder="Digite uma opção"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                      />
                      <Button type="button" variant="secondary" onClick={addOption}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newQuestion.options.map((opt, idx) => (
                        <Badge key={idx} variant="secondary" className="pr-1">
                          {opt}
                          <button
                            onClick={() => removeOption(idx)}
                            className="ml-2 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {newQuestion.question_type === 'image' && (
                  <div className="p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                    <Image className="h-4 w-4 inline mr-2" />
                    O mentorado poderá fazer upload de uma imagem (ex: logo, foto de perfil, print de resultado)
                  </div>
                )}

                {newQuestion.question_type === 'link' && (
                  <div className="p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                    <LinkIcon className="h-4 w-4 inline mr-2" />
                    O mentorado poderá inserir um link (ex: perfil do Instagram, site, LinkedIn)
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddQuestion} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Onboarding Link Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Link de Onboarding</h3>
                <p className="text-xs text-muted-foreground">
                  Envie para novos mentorados
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/onboarding?mentor=${mentorId}`}
                className="max-w-[280px] bg-background text-sm h-9"
              />
              <Button variant="secondary" size="sm" onClick={copyOnboardingLink}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/onboarding?mentor=${mentorId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-secondary/30 text-center">
          <p className="text-xl font-bold">{questions.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10 text-center">
          <p className="text-xl font-bold text-green-500">{activeQuestions.length}</p>
          <p className="text-xs text-muted-foreground">Ativas</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 text-center">
          <p className="text-xl font-bold text-amber-500">{questions.filter(q => q.is_required).length}</p>
          <p className="text-xs text-muted-foreground">Obrigatórias</p>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma pergunta cadastrada</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Adicione perguntas para personalizar o onboarding dos seus mentorados
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira pergunta
              </Button>
            </CardContent>
          </Card>
        ) : (
          questions.map((question, index) => {
            const IconComponent = getQuestionTypeIcon(question.question_type);
            return (
              <Card 
                key={question.id} 
                className={`transition-all ${!question.is_active ? 'opacity-50' : ''}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground min-w-[40px]">
                      <span className="text-lg font-bold">{index + 1}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <p className="font-medium text-foreground">{question.question_text}</p>
                        {question.is_required && (
                          <Asterisk className="h-3 w-3 text-destructive flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          <IconComponent className="h-3 w-3 mr-1" />
                          {getQuestionTypeLabel(question.question_type)}
                        </Badge>
                        {question.question_type === 'multiple_choice' && Array.isArray(question.options) && (
                          <span className="text-xs text-muted-foreground">
                            {question.options.length} opções
                          </span>
                        )}
                        {!question.is_required && (
                          <Badge variant="outline" className="text-xs">
                            Opcional
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={question.is_active}
                        onCheckedChange={() => handleToggleActive(question.id, question.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingQuestion(question);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. As respostas existentes serão mantidas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteQuestion(question.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Pergunta</DialogTitle>
          </DialogHeader>
          
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pergunta *</Label>
                <Textarea
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({...editingQuestion, question_text: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Resposta</Label>
                  <Select
                    value={editingQuestion.question_type}
                    onValueChange={(value) => setEditingQuestion({...editingQuestion, question_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Obrigatória?</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={editingQuestion.is_required}
                      onCheckedChange={(checked) => setEditingQuestion({...editingQuestion, is_required: checked})}
                    />
                    <span className="text-sm text-muted-foreground">
                      {editingQuestion.is_required ? 'Sim' : 'Não'}
                    </span>
                  </div>
                </div>
              </div>
              
              {editingQuestion.question_type === 'multiple_choice' && (
                <div className="space-y-2">
                  <Label>Opções de Resposta</Label>
                  <div className="flex gap-2">
                    <Input
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      placeholder="Digite uma opção"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEditOption())}
                    />
                    <Button type="button" variant="secondary" onClick={addEditOption}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.isArray(editingQuestion.options) && editingQuestion.options.map((opt: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="pr-1">
                        {opt}
                        <button
                          onClick={() => removeEditOption(idx)}
                          className="ml-2 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateQuestion} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview do Formulário</DialogTitle>
            <DialogDescription>
              Assim será exibido para os mentorados ({activeQuestions.length} perguntas)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {activeQuestions.map((question, index) => {
              const IconComponent = getQuestionTypeIcon(question.question_type);
              return (
                <div key={question.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">
                        {question.question_text}
                        {question.is_required && <span className="text-destructive ml-1">*</span>}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        <IconComponent className="h-3 w-3 mr-1" />
                        {getQuestionTypeLabel(question.question_type)}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Preview of input type */}
                  <div className="mt-3 ml-10">
                    {question.question_type === 'text' && (
                      <Input disabled placeholder="Resposta curta..." />
                    )}
                    {question.question_type === 'textarea' && (
                      <Textarea disabled placeholder="Resposta longa..." rows={2} />
                    )}
                    {question.question_type === 'yes_no' && (
                      <div className="flex gap-3">
                        <Button variant="outline" size="sm" disabled>Sim</Button>
                        <Button variant="outline" size="sm" disabled>Não</Button>
                      </div>
                    )}
                    {question.question_type === 'scale' && (
                      <div className="flex gap-1">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <Button key={n} variant="outline" size="sm" className="w-8 h-8 p-0" disabled>{n}</Button>
                        ))}
                      </div>
                    )}
                    {question.question_type === 'multiple_choice' && Array.isArray(question.options) && (
                      <div className="space-y-2">
                        {question.options.map((opt: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                            <span className="text-sm">{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {question.question_type === 'image' && (
                      <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground text-sm">
                        <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Clique ou arraste para enviar imagem
                      </div>
                    )}
                    {question.question_type === 'link' && (
                      <Input disabled placeholder="https://..." />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Formularios;
