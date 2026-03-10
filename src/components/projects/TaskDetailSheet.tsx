import { useState } from 'react';
import { useMentorProjects, type MentorTask } from '@/hooks/useMentorProjects';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calendar, CheckSquare, Clock, GitBranch, Link2, MessageSquare, Plus, Trash2, Timer } from 'lucide-react';
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
  } = useMentorProjects();

  const { data: statuses = [] } = useStatuses(projectId);
  const { data: comments = [] } = useComments(task?.id);
  const { data: timeEntries = [] } = useTimeEntries(task?.id);
  const { data: deps = [] } = useDependencies(projectId);
  const { data: allTasks = [] } = useTasks(projectId);

  const [newChecklist, setNewChecklist] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [depTaskId, setDepTaskId] = useState('');

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

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">
            <Input
              defaultValue={task.title}
              onBlur={e => {
                if (e.target.value !== task.title) handleUpdate({ title: e.target.value });
              }}
              className="text-lg font-bold border-none px-0 focus-visible:ring-0"
            />
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
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

          <Separator />

          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="w-full bg-muted/30">
              <TabsTrigger value="checklist" className="text-xs gap-1 flex-1"><CheckSquare className="h-3 w-3" /> Checklist</TabsTrigger>
              <TabsTrigger value="subtasks" className="text-xs gap-1 flex-1"><GitBranch className="h-3 w-3" /> Subtarefas</TabsTrigger>
              <TabsTrigger value="time" className="text-xs gap-1 flex-1"><Timer className="h-3 w-3" /> Tempo</TabsTrigger>
              <TabsTrigger value="deps" className="text-xs gap-1 flex-1"><Link2 className="h-3 w-3" /> Deps</TabsTrigger>
              <TabsTrigger value="comments" className="text-xs gap-1 flex-1"><MessageSquare className="h-3 w-3" /> Chat</TabsTrigger>
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

          <Button
            variant="destructive"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              deleteTask.mutate({ id: task.id, project_id: projectId });
              onClose();
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Excluir Tarefa
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
