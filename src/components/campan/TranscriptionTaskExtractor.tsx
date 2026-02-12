import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, Sparkles, Loader2, Trash2, Save, RefreshCw, 
  Calendar, Tag, AlertCircle, CheckCircle2, Upload
} from 'lucide-react';

interface ExtractedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  tags: string[];
  confidence: number;
  selected: boolean;
}

interface TranscriptionTaskExtractorProps {
  mentoradoMembershipId: string;
  mentorMembershipId: string;
  tenantId: string;
  onTasksSaved?: () => void;
}

type ExtractionState = 'idle' | 'reading' | 'extracting' | 'done' | 'error';

export function TranscriptionTaskExtractor({
  mentoradoMembershipId,
  mentorMembershipId,
  tenantId,
  onTasksSaved,
}: TranscriptionTaskExtractorProps) {
  const [transcription, setTranscription] = useState('');
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [state, setState] = useState<ExtractionState>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleExtract = async () => {
    if (!transcription.trim() || transcription.trim().length < 20) {
      toast.error('Cole uma transcrição com pelo menos 20 caracteres.');
      return;
    }

    setState('reading');
    setErrorMsg('');

    try {
      // Save transcript
      const { data: transcript, error: txError } = await supabase
        .from('meeting_transcripts')
        .insert({
          mentorado_membership_id: mentoradoMembershipId,
          mentor_membership_id: mentorMembershipId,
          tenant_id: tenantId,
          input_type: 'text',
          raw_text: transcription.trim(),
        })
        .select('id')
        .single();

      if (txError) throw txError;
      setTranscriptId(transcript.id);

      setState('extracting');

      // Call AI
      const { data, error } = await supabase.functions.invoke('extract-tasks', {
        body: { transcription: transcription.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extracted: ExtractedTask[] = (data?.tasks || []).map((t: any) => ({
        title: t.title || '',
        description: t.description || '',
        priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
        due_date: t.due_date || null,
        tags: Array.isArray(t.tags) ? t.tags : [],
        confidence: typeof t.confidence === 'number' ? t.confidence : 0.5,
        selected: true,
      }));

      if (extracted.length === 0) {
        toast.info('Nenhuma tarefa acionável encontrada na transcrição.');
      }

      setTasks(extracted);

      // Save draft
      await supabase.from('extracted_task_drafts').insert([{
        transcript_id: transcript.id,
        mentorado_membership_id: mentoradoMembershipId,
        mentor_membership_id: mentorMembershipId,
        tenant_id: tenantId,
        tasks_json: extracted as any,
        status: 'draft',
      }]);

      setState('done');
    } catch (err: any) {
      console.error('Error extracting tasks:', err);
      setErrorMsg(err.message || 'Erro ao processar transcrição');
      setState('error');
    }
  };

  const handleRegenerate = () => {
    setTasks([]);
    setState('idle');
    handleExtract();
  };

  const updateTask = (index: number, updates: Partial<ExtractedTask>) => {
    setTasks(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const removeTask = (index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const selected = tasks.filter(t => t.selected);
    if (selected.length === 0) {
      toast.error('Selecione pelo menos uma tarefa.');
      return;
    }

    setIsSaving(true);
    try {
      const inserts = selected.map(t => ({
        mentorado_membership_id: mentoradoMembershipId,
        created_by_membership_id: mentorMembershipId,
        tenant_id: tenantId,
        title: t.title,
        description: t.description || null,
        priority: t.priority,
        due_date: t.due_date || null,
        tags: t.tags,
        status_column: 'a_fazer',
        source_transcript_id: transcriptId,
        task_hash: `${mentoradoMembershipId}_${transcriptId}_${t.title.toLowerCase().replace(/\s+/g, '_').slice(0, 50)}`,
      }));

      const { error } = await supabase.from('campan_tasks').insert(inserts);
      if (error) throw error;

      // Update draft status
      if (transcriptId) {
        await supabase
          .from('extracted_task_drafts')
          .update({ status: 'saved' })
          .eq('transcript_id', transcriptId);
      }

      toast.success(`${selected.length} tarefa(s) salva(s) no Campan!`);
      setTasks([]);
      setTranscription('');
      setState('idle');
      setTranscriptId(null);
      onTasksSaved?.();
    } catch (err: any) {
      console.error('Error saving tasks:', err);
      toast.error(err.message || 'Erro ao salvar tarefas');
    } finally {
      setIsSaving(false);
    }
  };

  const priorityColors = {
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    high: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const priorityLabels = { low: 'Baixa', medium: 'Média', high: 'Alta' };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Transcrição → Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input area */}
          <div className="space-y-2">
            <Label>Cole a transcrição da reunião</Label>
            <Textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              placeholder="Cole aqui a transcrição da reunião com o mentorado..."
              className="min-h-[120px] bg-secondary/30"
              disabled={state === 'reading' || state === 'extracting'}
            />
          </div>

          {/* Status indicators */}
          {state === 'reading' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lendo transcrição...
            </div>
          )}
          {state === 'extracting' && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Extraindo tarefas com IA...
            </div>
          )}
          {state === 'error' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {errorMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
          {(state === 'idle' || state === 'error') && (
              <Button 
                onClick={handleExtract} 
                disabled={!transcription.trim()}
                className="gradient-gold text-primary-foreground"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar tarefas com IA
              </Button>
            )}
            {state === 'error' && (
              <Button variant="outline" onClick={handleRegenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task review */}
      {state === 'done' && tasks.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {tasks.length} tarefa(s) encontrada(s) — Revise antes de salvar
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRegenerate}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regerar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  disabled={isSaving || tasks.filter(t => t.selected).length === 0}
                  className="gradient-gold text-primary-foreground"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  Salvar tarefas ({tasks.filter(t => t.selected).length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border transition-all ${
                  task.selected 
                    ? 'bg-secondary/30 border-border' 
                    : 'bg-muted/20 border-transparent opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.selected}
                    onCheckedChange={(checked) => updateTask(idx, { selected: !!checked })}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(idx, { title: e.target.value })}
                      className="font-medium bg-transparent border-none p-0 h-auto text-sm focus-visible:ring-0"
                      placeholder="Título da tarefa"
                    />
                    <Textarea
                      value={task.description}
                      onChange={(e) => updateTask(idx, { description: e.target.value })}
                      className="bg-transparent border-none p-0 min-h-0 h-auto text-xs text-muted-foreground resize-none focus-visible:ring-0"
                      placeholder="Descrição (opcional)"
                      rows={1}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={task.priority}
                        onValueChange={(v) => updateTask(idx, { priority: v as any })}
                      >
                        <SelectTrigger className="w-[100px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">🟢 Baixa</SelectItem>
                          <SelectItem value="medium">🟡 Média</SelectItem>
                          <SelectItem value="high">🔴 Alta</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="date"
                        value={task.due_date || ''}
                        onChange={(e) => updateTask(idx, { due_date: e.target.value || null })}
                        className="w-[140px] h-7 text-xs"
                      />

                      {task.tags.map((tag, ti) => (
                        <Badge key={ti} variant="outline" className="text-xs h-6">
                          {tag}
                        </Badge>
                      ))}

                      <Badge variant="outline" className="text-xs h-6 ml-auto">
                        {Math.round(task.confidence * 100)}% confiança
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTask(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
