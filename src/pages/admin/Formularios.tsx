import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, Save } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any[];
  order_index: number;
  is_active: boolean;
  is_required: boolean;
}

interface FormulariosProps {
  mentorId: string;
  onBack: () => void;
}

export default function Formularios({ mentorId, onBack }: FormulariosProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [mentorId]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('behavioral_questions')
      .select('*')
      .eq('owner_membership_id', mentorId)
      .order('order_index');

    if (error) {
      console.error('Error fetching questions:', error);
      toast.error('Erro ao carregar perguntas');
    } else {
      setQuestions((data || []) as Question[]);
    }
    setIsLoading(false);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `new-${Date.now()}`,
      question_text: '',
      question_type: 'disc',
      options: [
        { text: '', value: 'D' },
        { text: '', value: 'I' },
        { text: '', value: 'S' },
        { text: '', value: 'C' },
      ],
      order_index: questions.length,
      is_active: true,
      is_required: true,
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const removeQuestion = async (id: string) => {
    if (id.startsWith('new-')) {
      setQuestions(prev => prev.filter(q => q.id !== id));
      return;
    }
    const { error } = await supabase.from('behavioral_questions').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover pergunta');
    } else {
      setQuestions(prev => prev.filter(q => q.id !== id));
      toast.success('Pergunta removida');
    }
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (questionId: string, optionIndex: number, text: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      const newOptions = [...q.options];
      newOptions[optionIndex] = { ...newOptions[optionIndex], text };
      return { ...q, options: newOptions };
    }));
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      for (const q of questions) {
        if (!q.question_text.trim()) continue;
        
        if (q.id.startsWith('new-')) {
          await supabase.from('behavioral_questions').insert({
            owner_membership_id: mentorId,
            question_text: q.question_text,
            options: q.options,
            question_type: q.question_type,
            order_index: q.order_index,
            is_active: q.is_active,
            is_required: q.is_required,
          });
        } else {
          await supabase.from('behavioral_questions').update({
            question_text: q.question_text,
            options: q.options,
            order_index: q.order_index,
            is_active: q.is_active,
            is_required: q.is_required,
          }).eq('id', q.id);
        }
      }
      toast.success('Formulário salvo com sucesso!');
      fetchQuestions();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Formulário de Onboarding</h2>
            <p className="text-sm text-muted-foreground">Perguntas comportamentais para novos mentorados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="h-4 w-4 mr-1" /> Pergunta
          </Button>
          <Button size="sm" onClick={saveAll} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma pergunta cadastrada</p>
            <Button variant="outline" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar primeira pergunta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <Card key={q.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm text-foreground">Pergunta {qi + 1}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Ativa</Label>
                      <Switch checked={q.is_active} onCheckedChange={(v) => updateQuestion(q.id, 'is_active', v)} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Pergunta</Label>
                  <Textarea
                    value={q.question_text}
                    onChange={(e) => updateQuestion(q.id, 'question_text', e.target.value)}
                    placeholder="Ex: Quando você precisa vender algo, sua primeira ação é..."
                    className="mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Opções (DISC)</Label>
                  {q.options.map((opt: any, oi: number) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-6">{opt.value}</span>
                      <Input
                        value={opt.text}
                        onChange={(e) => updateOption(q.id, oi, e.target.value)}
                        placeholder={`Opção ${opt.value}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
