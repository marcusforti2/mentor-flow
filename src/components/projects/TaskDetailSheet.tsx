import { useState, useEffect, useRef, useCallback } from 'react';
import { useMentorProjects, type MentorTask } from '@/hooks/useMentorProjects';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { CheckSquare, Clock, GitBranch, Link2, MessageSquare, Plus, Trash2, Timer, Paperclip, Play, Pause, Square, RotateCcw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  task: MentorTask | null;
  projectId: string;
  onClose: () => void;
}

export function TaskDetailSheet({ task, projectId, onClose }: Props) {
  const {
    useStatuses, updateTask, deleteTask,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    createTask, useComments, addComment,
    useTimeEntries, addTimeEntry,
    useDependencies, addDependency, removeDependency, useTasks,
    useAttachments, uploadAttachment, deleteAttachment,
    useCustomFields, useFieldValues, setFieldValue,
    useTemplates, createTemplate,
  } = useMentorProjects();

  const { data: statuses = [] } = useStatuses(projectId);
  const { data: comments = [] } = useComments(task?.id);
  const { data: timeEntries = [] } = useTimeEntries(task?.id);
  const { data: deps = [] } = useDependencies(projectId);
  const { data: allTasks = [] } = useTasks(projectId);
  const { data: attachments = [] } = useAttachments(task?.id);
  const { data: customFields = [] } = useCustomFields(projectId);
  const { data: fieldValues = [] } = useFieldValues(task?.id);
  const { data: templates = [] } = useTemplates(projectId);

  const [newChecklist, setNewChecklist] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [depTaskId, setDepTaskId] = useState('');

  // Live timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStopTimer = useCallback(() => {
    if (task && timerSeconds > 0) {
      const mins = Math.max(1, Math.round(timerSeconds / 60));
      addTimeEntry.mutate({ task_id: task.id, minutes: mins, project_id: projectId });
      toast.success(`${mins} minutos registrados`);
    }
    setTimerRunning(false);
    setTimerSeconds(0);
  }, [task, timerSeconds, projectId, addTimeEntry]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!task) return null;

  const taskDeps = deps.filter(d => d.task_id === task.id);
  const completedChecks = task.checklists?.filter(c => c.is_completed).length || 0;
  const totalChecks = task.checklists?.length || 0;

  const handleUpdate = (updates: Partial<MentorTask>) => {
    updateTask.mutate({ id: task.id, project_id: projectId, updates });
  };

  const handleAddChecklist = () => {
    if (!newChecklist.trim()) return;
    addChecklistItem.mutate({ task_id: task.id, title: newChecklist.trim(), project_id: projectId });
    setNewChecklist('');
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate({ task_id: task.id, content: newComment.trim() });
    setNewComment('');
  };

  const handleAddTime = () => {
    const mins = parseInt(newTime);
    if (!mins || mins <= 0) return;
    addTimeEntry.mutate({ task_id: task.id, minutes: mins, project_id: projectId });
    setNewTime('');
    toast.success(`${mins} minutos registrados`);
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    createTask.mutate({
      project_id: projectId,
      title: newSubtask.trim(),
      parent_task_id: task.id,
      status_id: task.status_id || undefined,
    });
    setNewSubtask('');
  };

  const handleAddDep = () => {
    if (!depTaskId) return;
    addDependency.mutate({ task_id: task.id, depends_on_task_id: depTaskId, project_id: projectId });
    setDepTaskId('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAttachment.mutate({ task_id: task.id, file, project_id: projectId });
    }
    e.target.value = '';
  };

  const handleSaveAsTemplate = () => {
    createTemplate.mutate({
      project_id: projectId,
      name: task.title,
      template_data: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        tags: task.tags,
        estimated_minutes: task.estimated_minutes,
      },
    });
  };

  const getFieldValue = (fieldId: string) =>
    fieldValues.find(fv => fv.field_id === fieldId)?.value || '';

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">
            <Input
              defaultValue={task.title}
              onBlur={e => { if (e.target.value !== task.title) handleUpdate({ title: e.target.value }); }}
              className="text-lg font-bold border-none px-0 focus-visible:ring-0"
            />
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Live Timer */}
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono font-bold flex-1">{formatTimer(timerSeconds)}</span>
            {!timerRunning ? (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setTimerRunning(true)}>
                <Play className="h-3 w-3" /> Iniciar
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setTimerRunning(false)}>
                  <Pause className="h-3 w-3" /> Pausar
                </Button>
                <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={handleStopTimer}>
                  <Square className="h-3 w-3" /> Parar
                </Button>
              </>
            )}
          </div>

          {/* Status + Priority + Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={task.status_id || ''} onValueChange={v => handleUpdate({ status_id: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
              <Select value={task.priority} onValueChange={v => handleUpdate({ priority: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgente</SelectItem>
                  <SelectItem value="high">🟠 Alta</SelectItem>
                  <SelectItem value="medium">🟡 Média</SelectItem>
                  <SelectItem value="low">🔵 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Início</label>
              <Input type="date" defaultValue={task.start_date || ''} onChange={e => handleUpdate({ start_date: e.target.value || null })} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Prazo</label>
              <Input type="date" defaultValue={task.due_date || ''} onChange={e => handleUpdate({ due_date: e.target.value || null })} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Estimativa (min)</label>
              <Input type="number" defaultValue={task.estimated_minutes || ''} onBlur={e => handleUpdate({ estimated_minutes: parseInt(e.target.value) || null })} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tempo gasto</label>
              <p className="text-sm font-medium">{task.actual_minutes || 0} min</p>
            </div>
          </div>

          {/* Recurrence */}
          <div className="flex items-center gap-3 bg-muted/20 rounded-lg p-2">
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground flex-1">Recorrente</span>
            <Switch
              checked={task.is_recurring || false}
              onCheckedChange={checked => handleUpdate({ is_recurring: checked } as any)}
            />
            {task.is_recurring && (
              <Select value={task.recurrence_rule || ''} onValueChange={v => handleUpdate({ recurrence_rule: v } as any)}>
                <SelectTrigger className="h-7 w-28 text-[10px]"><SelectValue placeholder="Frequência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
            <Textarea
              defaultValue={task.description || ''}
              onBlur={e => handleUpdate({ description: e.target.value || null })}
              placeholder="Descreva a tarefa..."
              className="text-sm min-h-[60px]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tags</label>
            <Input
              defaultValue={(task.tags || []).join(', ')}
              onBlur={e => {
                const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                handleUpdate({ tags });
              }}
              placeholder="tag1, tag2, tag3"
              className="h-8 text-xs"
            />
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-semibold">Campos Personalizados</label>
              {customFields.map(field => (
                <div key={field.id} className="flex items-center gap-2">
                  <span className="text-xs w-24 truncate text-muted-foreground">{field.name}</span>
                  <Input
                    type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                    defaultValue={getFieldValue(field.id)}
                    onBlur={e => setFieldValue.mutate({ task_id: task.id, field_id: field.id, value: e.target.value })}
                    className="h-7 text-xs flex-1"
                    placeholder={field.name}
                  />
                </div>
              ))}
            </div>
          )}

          <Separator />

          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="w-full bg-muted/30 flex-wrap h-auto gap-0.5 p-0.5">
              <TabsTrigger value="checklist" className="text-[10px] gap-0.5 flex-1 h-6"><CheckSquare className="h-2.5 w-2.5" /> Check</TabsTrigger>
              <TabsTrigger value="subtasks" className="text-[10px] gap-0.5 flex-1 h-6"><GitBranch className="h-2.5 w-2.5" /> Sub</TabsTrigger>
              <TabsTrigger value="files" className="text-[10px] gap-0.5 flex-1 h-6"><Paperclip className="h-2.5 w-2.5" /> Anexos</TabsTrigger>
              <TabsTrigger value="time" className="text-[10px] gap-0.5 flex-1 h-6"><Timer className="h-2.5 w-2.5" /> Tempo</TabsTrigger>
              <TabsTrigger value="deps" className="text-[10px] gap-0.5 flex-1 h-6"><Link2 className="h-2.5 w-2.5" /> Deps</TabsTrigger>
              <TabsTrigger value="comments" className="text-[10px] gap-0.5 flex-1 h-6"><MessageSquare className="h-2.5 w-2.5" /> Chat</TabsTrigger>
            </TabsList>

            {/* Checklist */}
            <TabsContent value="checklist" className="space-y-2 mt-3">
              {totalChecks > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{completedChecks}/{totalChecks}</span>
                  <div className="flex-1 h-1 bg-muted rounded-full">
                    <div className="h-1 bg-primary rounded-full transition-all" style={{ width: `${(completedChecks / totalChecks) * 100}%` }} />
                  </div>
                </div>
              )}
              {(task.checklists || []).map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={item.is_completed}
                    onCheckedChange={checked => toggleChecklistItem.mutate({ id: item.id, is_completed: !!checked, project_id: projectId })}
                  />
                  <span className={cn("text-sm flex-1", item.is_completed && "line-through text-muted-foreground")}>{item.title}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => deleteChecklistItem.mutate({ id: item.id, project_id: projectId })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <form onSubmit={e => { e.preventDefault(); handleAddChecklist(); }} className="flex gap-1">
                <Input value={newChecklist} onChange={e => setNewChecklist(e.target.value)} placeholder="Novo item..." className="h-7 text-xs" />
                <Button type="submit" size="icon" className="h-7 w-7 shrink-0"><Plus className="h-3 w-3" /></Button>
              </form>
            </TabsContent>

            {/* Subtasks */}
            <TabsContent value="subtasks" className="space-y-2 mt-3">
              {(task.subtasks || []).map(sub => (
                <div key={sub.id} className="flex items-center gap-2 text-sm bg-muted/20 rounded-lg px-2 py-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.status?.color || '#94a3b8' }} />
                  <span className="flex-1 truncate">{sub.title}</span>
                  <Badge variant="outline" className="text-[10px]">{sub.status?.name || '—'}</Badge>
                </div>
              ))}
              <form onSubmit={e => { e.preventDefault(); handleAddSubtask(); }} className="flex gap-1">
                <Input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Nova subtarefa..." className="h-7 text-xs" />
                <Button type="submit" size="icon" className="h-7 w-7 shrink-0"><Plus className="h-3 w-3" /></Button>
              </form>
            </TabsContent>

            {/* Attachments */}
            <TabsContent value="files" className="space-y-2 mt-3">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1 w-full" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-3 w-3" /> Anexar arquivo
              </Button>
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 text-xs bg-muted/20 rounded-lg px-2 py-1.5 group">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{att.file_name}</span>
                  <span className="text-[10px] text-muted-foreground">{att.file_size ? `${Math.round(att.file_size / 1024)}KB` : ''}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => deleteAttachment.mutate({ id: att.id, file_url: att.file_url, task_id: task.id })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </TabsContent>

            {/* Time Tracking */}
            <TabsContent value="time" className="space-y-2 mt-3">
              <form onSubmit={e => { e.preventDefault(); handleAddTime(); }} className="flex gap-1">
                <Input type="number" value={newTime} onChange={e => setNewTime(e.target.value)} placeholder="Minutos trabalhados" className="h-7 text-xs" />
                <Button type="submit" size="sm" className="h-7 text-xs shrink-0">Registrar</Button>
              </form>
              {timeEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-2 py-1.5">
                  <span className="text-muted-foreground">{format(new Date(entry.created_at), 'dd/MM HH:mm')}</span>
                  <span className="font-medium">{entry.minutes} min</span>
                </div>
              ))}
            </TabsContent>

            {/* Dependencies */}
            <TabsContent value="deps" className="space-y-2 mt-3">
              {taskDeps.map(dep => {
                const depTask = allTasks.find(t => t.id === dep.depends_on_task_id);
                return (
                  <div key={dep.id} className="flex items-center gap-2 text-sm bg-muted/20 rounded-lg px-2 py-1.5">
                    <Link2 className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 truncate">{depTask?.title || 'Tarefa removida'}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeDependency.mutate({ id: dep.id, project_id: projectId })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              <div className="flex gap-1">
                <Select value={depTaskId} onValueChange={setDepTaskId}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Depende de..." /></SelectTrigger>
                  <SelectContent>
                    {allTasks.filter(t => t.id !== task.id).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleAddDep}><Plus className="h-3 w-3" /></Button>
              </div>
            </TabsContent>

            {/* Comments */}
            <TabsContent value="comments" className="space-y-2 mt-3">
              {comments.map(c => (
                <div key={c.id} className="bg-muted/20 rounded-lg px-3 py-2">
                  <p className="text-sm">{c.content}</p>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), 'dd/MM HH:mm')}</span>
                </div>
              ))}
              <form onSubmit={e => { e.preventDefault(); handleAddComment(); }} className="flex gap-1">
                <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Comentar..." className="h-7 text-xs" />
                <Button type="submit" size="icon" className="h-7 w-7 shrink-0"><Plus className="h-3 w-3" /></Button>
              </form>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Template + Delete actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={handleSaveAsTemplate}>
              <FileText className="h-3 w-3" /> Salvar como Template
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 text-xs gap-1"
              onClick={() => {
                deleteTask.mutate({ id: task.id, project_id: projectId });
                onClose();
              }}
            >
              <Trash2 className="h-3 w-3" /> Excluir
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
