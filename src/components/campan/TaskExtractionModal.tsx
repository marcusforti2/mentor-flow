import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sparkles, Loader2, Save, RefreshCw, Trash2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { notifyMenteeAction } from '@/lib/notifyMenteeAction';

interface ExtractedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  tags: string[];
  confidence: number;
  selected: boolean;
}

interface TaskExtractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcriptId: string;
  rawText: string;
  meetingTitle: string;
  mentoradoMembershipId: string;
  mentorMembershipId: string;
  tenantId: string;
  onTasksSaved?: () => void;
}

type ExtractionState = 'idle' | 'extracting' | 'done' | 'error';

export function TaskExtractionModal({
  open,
  onOpenChange,
  transcriptId,
  rawText,
  meetingTitle,
  mentoradoMembershipId,
  mentorMembershipId,
  tenantId,
  onTasksSaved,
}: TaskExtractionModalProps) {
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [state, setState] = useState<ExtractionState>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleExtract = async () => {
    setState('extracting');
    setErrorMsg('');
    setTasks([]);

    try {
      const { data, error } = await supabase.functions.invoke('extract-tasks', {
        body: { transcription: rawText },
      });

      if (error) throw new Error(`Erro na IA: ${error.message}`);
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
        toast.info('Nenhuma tarefa encontrada na transcrição.');
      }

      setTasks(extracted);

      // Save draft
      await supabase.from('extracted_task_drafts').insert([{
        transcript_id: transcriptId,
        mentorado_membership_id: mentoradoMembershipId,
        mentor_membership_id: mentorMembershipId,
        tenant_id: tenantId,
        tasks_json: extracted as any,
        status: 'draft',
      }]);

      setState('done');
    } catch (err: any) {
      console.error('[TaskExtraction] Error:', err);
      setErrorMsg(err.message || 'Erro ao processar transcrição');
      toast.error(err.message || 'Erro ao processar');
      setState('error');
    }
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

      if (error) {
        // Fallback: insert individually
        let successCount = 0;
        for (const insert of inserts) {
          const { error: indError } = await supabase.from('campan_tasks').insert(insert);
          if (!indError) successCount++;
        }
        if (successCount === 0) throw new Error('Falha ao salvar tarefas.');
        toast.success(`${successCount} tarefa(s) salva(s).`);
      } else {
        toast.success(`${selected.length} tarefa(s) salva(s) no Campan!`);
      }

      // Notify mentee via branded email
      notifyMenteeAction({
        mentorado_membership_id: mentoradoMembershipId,
        mentor_membership_id: mentorMembershipId,
        tenant_id: tenantId,
        action_type: 'tasks_created',
        action_details: {
          count: selected.length,
          titles: selected.map(t => t.title).slice(0, 5),
        },
      });

      // Update draft status
      await supabase
        .from('extracted_task_drafts')
        .update({ status: 'saved' })
        .eq('transcript_id', transcriptId);

      onTasksSaved?.();
      onOpenChange(false);
      // Reset
      setTasks([]);
      setState('idle');
    } catch (err: any) {
      console.error('[TaskExtraction] Save error:', err);
      toast.error(err.message || 'Erro ao salvar tarefas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setTasks([]);
      setState('idle');
      setErrorMsg('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Gerar Tarefas — {meetingTitle || 'Reunião'}
          </DialogTitle>
        </DialogHeader>

        {/* Idle state - show extract button */}
        {state === 'idle' && (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              A IA vai analisar a transcrição e sugerir tarefas acionáveis para o mentorado.
            </p>
            <Button onClick={handleExtract} className="gradient-gold text-primary-foreground">
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Tarefas com IA
            </Button>
          </div>
        )}

        {/* Extracting state */}
        {state === 'extracting' && (
          <div className="py-8 text-center space-y-3">
            <Sparkles className="h-8 w-8 text-primary animate-pulse mx-auto" />
            <p className="text-sm text-muted-foreground">Extraindo tarefas com IA...</p>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="py-4 space-y-3">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errorMsg}
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleExtract}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {/* Done state - task review */}
        {state === 'done' && (
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhuma tarefa encontrada nesta transcrição.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {tasks.length} tarefa(s) encontrada(s) — revise antes de salvar
                  </p>
                  <Button variant="ghost" size="sm" onClick={handleExtract}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Regerar
                  </Button>
                </div>

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
                            <Badge key={ti} variant="outline" className="text-xs h-6">{tag}</Badge>
                          ))}
                          <Badge variant="outline" className="text-xs h-6 ml-auto">
                            {Math.round(task.confidence * 100)}%
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
              </>
            )}
          </div>
        )}

        {/* Footer with save */}
        {state === 'done' && tasks.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || tasks.filter(t => t.selected).length === 0}
              className="gradient-gold text-primary-foreground"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar tarefas ({tasks.filter(t => t.selected).length})
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
