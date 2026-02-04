import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  Loader2,
  GripVertical,
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
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  order_index: number;
  is_active: boolean;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Texto', icon: Type, description: 'Resposta aberta' },
  { value: 'textarea', label: 'Texto Longo', icon: MessageSquare, description: 'Texto com várias linhas' },
  { value: 'multiple_choice', label: 'Múltipla Escolha', icon: ListChecks, description: 'Selecionar uma opção' },
  { value: 'yes_no', label: 'Sim/Não', icon: ToggleLeft, description: 'Resposta binária' },
  { value: 'scale', label: 'Escala 1-10', icon: Hash, description: 'Avaliação numérica' },
];

const Formularios = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mentorId, setMentorId] = useState<string | null>(null);
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
  });
  const [optionInput, setOptionInput] = useState('');

  const { user } = useAuth();
  const { toast } = useToast();

  const fetchQuestions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Get mentor ID
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!mentorData) {
        toast({
          title: "Erro",
          description: "Perfil de mentor não encontrado.",
          variant: "destructive",
        });
        return;
      }
      
      setMentorId(mentorData.id);
      
      // Fetch questions
      const { data, error } = await supabase
        .from('behavioral_questions')
        .select('*')
        .eq('mentor_id', mentorData.id)
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
  }, [user]);

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
        });
      
      if (error) throw error;
      
      toast({ title: "Pergunta adicionada!" });
      setIsAddDialogOpen(false);
      setNewQuestion({ question_text: '', question_type: 'text', options: [] });
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

  const activeQuestions = questions.filter(q => q.is_active);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Formulários de Onboarding</h1>
          <p className="text-muted-foreground">Configure as perguntas do formulário de entrada dos mentorados</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Nova Pergunta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
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
                
                {newQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Opções</Label>
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
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Link de Onboarding</h3>
                <p className="text-sm text-muted-foreground">
                  Envie este link para novos mentorados preencherem o formulário
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/onboarding?mentor=${mentorId || 'ID'}`}
                className="max-w-xs bg-background"
              />
              <Button variant="secondary" onClick={copyOnboardingLink}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`/onboarding?mentor=${mentorId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{questions.length}</p>
                <p className="text-sm text-muted-foreground">Total de Perguntas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeQuestions.length}</p>
                <p className="text-sm text-muted-foreground">Perguntas Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <ListChecks className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {questions.filter(q => q.question_type === 'multiple_choice').length}
                </p>
                <p className="text-sm text-muted-foreground">Múltipla Escolha</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Type className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {questions.filter(q => q.question_type === 'text' || q.question_type === 'textarea').length}
                </p>
                <p className="text-sm text-muted-foreground">Perguntas Abertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Perguntas do Formulário</CardTitle>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma pergunta cadastrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Adicione perguntas para personalizar o onboarding dos seus mentorados
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Pergunta
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question, index) => {
                const TypeIcon = getQuestionTypeIcon(question.question_type);
                return (
                  <div
                    key={question.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      question.is_active 
                        ? 'bg-card border-border' 
                        : 'bg-muted/30 border-border/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-5 w-5 cursor-move" />
                      <span className="text-sm font-medium w-6">{index + 1}</span>
                    </div>
                    
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {question.question_text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {QUESTION_TYPES.find(t => t.value === question.question_type)?.label || question.question_type}
                        </Badge>
                        {question.question_type === 'multiple_choice' && Array.isArray(question.options) && (
                          <span className="text-xs text-muted-foreground">
                            {question.options.length} opções
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={question.is_active}
                        onCheckedChange={() => handleToggleActive(question.id, question.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingQuestion(question);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Pergunta</DialogTitle>
          </DialogHeader>
          
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_question_text">Pergunta *</Label>
                <Textarea
                  id="edit_question_text"
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({...editingQuestion, question_text: e.target.value})}
                  rows={3}
                />
              </div>
              
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
              
              {editingQuestion.question_type === 'multiple_choice' && (
                <div className="space-y-2">
                  <Label>Opções</Label>
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
                    {(Array.isArray(editingQuestion.options) ? editingQuestion.options : []).map((opt: string, idx: number) => (
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
              Visualize como seus mentorados verão o formulário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {activeQuestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma pergunta ativa para visualizar
              </p>
            ) : (
              activeQuestions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <p className="text-lg font-medium text-foreground pt-1">
                      {question.question_text}
                    </p>
                  </div>
                  
                  <div className="ml-11">
                    {question.question_type === 'text' && (
                      <Input placeholder="Digite sua resposta..." disabled />
                    )}
                    {question.question_type === 'textarea' && (
                      <Textarea placeholder="Digite sua resposta..." disabled rows={3} />
                    )}
                    {question.question_type === 'multiple_choice' && Array.isArray(question.options) && (
                      <div className="space-y-2">
                        {question.options.map((opt: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:border-primary/50 cursor-pointer transition-colors"
                          >
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {question.question_type === 'yes_no' && (
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1">Sim</Button>
                        <Button variant="outline" className="flex-1">Não</Button>
                      </div>
                    )}
                    {question.question_type === 'scale' && (
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <Button
                            key={num}
                            variant="outline"
                            className="h-10 w-10 p-0"
                          >
                            {num}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Formularios;
