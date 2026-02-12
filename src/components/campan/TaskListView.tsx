import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Calendar, CheckCircle2, Pencil, Trash2, Save, ChevronDown, ChevronRight, Video } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CampanTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  tags: string[];
  status_column: string;
  source_transcript_id: string | null;
  created_at: string;
}

interface MeetingTranscript {
  id: string;
  meeting_title: string | null;
  meeting_date: string | null;
}

interface TaskListViewProps {
  mentoradoMembershipId: string;
  mentorMembershipId?: string;
  tenantId?: string;
  refreshKey?: number;
}

const STATUS_GROUPS = [
  { key: 'a_fazer', label: 'A Fazer', color: 'bg-blue-500', textColor: 'text-blue-600' },
  { key: 'fazendo', label: 'Fazendo', color: 'bg-amber-500', textColor: 'text-amber-600' },
  { key: 'feito', label: 'Feito', color: 'bg-green-500', textColor: 'text-green-600' },
];

const priorityConfig: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }> = {
  high: { label: '🔴 Alta', variant: 'destructive' },
  medium: { label: '🟡 Média', variant: 'default' },
  low: { label: '🟢 Baixa', variant: 'secondary' },
};

export function TaskListView({ mentoradoMembershipId, mentorMembershipId, tenantId, refreshKey = 0 }: TaskListViewProps) {
  const [tasks, setTasks] = useState<CampanTask[]>([]);
  const [meetings, setMeetings] = useState<MeetingTranscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<CampanTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', status_column: 'a_fazer', source_transcript_id: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ a_fazer: true, fazendo: true, feito: false });

  const fetchData = async () => {
    setIsLoading(true);
    const [tasksRes, meetingsRes] = await Promise.all([
      supabase.from('campan_tasks').select('*').eq('mentorado_membership_id', mentoradoMembershipId).order('created_at', { ascending: false }),
      supabase.from('meeting_transcripts').select('id, meeting_title, meeting_date').eq('mentorado_membership_id', mentoradoMembershipId).order('created_at', { ascending: false }),
    ]);

    if (tasksRes.error) {
      console.error('Error fetching tasks:', tasksRes.error);
      toast.error('Erro ao carregar tarefas');
    } else {
      setTasks((tasksRes.data || []) as CampanTask[]);
    }
    setMeetings((meetingsRes.data || []) as MeetingTranscript[]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (mentoradoMembershipId) fetchData();
  }, [mentoradoMembershipId, refreshKey]);

  const openEdit = (task: CampanTask) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      status_column: task.status_column,
      source_transcript_id: task.source_transcript_id || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editForm.title.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('campan_tasks').update({
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        priority: editForm.priority,
        due_date: editForm.due_date || null,
        status_column: editForm.status_column,
        source_transcript_id: editForm.source_transcript_id || null,
      }).eq('id', editingTask.id);

      if (error) throw error;
      toast.success('Tarefa atualizada!');
      setEditingTask(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTaskId) return;
    try {
      const { error } = await supabase.from('campan_tasks').delete().eq('id', deletingTaskId);
      if (error) throw error;
      toast.success('Tarefa excluída');
      setDeletingTaskId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_column: newStatus } : t));
    const { error } = await supabase.from('campan_tasks').update({ status_column: newStatus }).eq('id', taskId);
    if (error) {
      toast.error('Erro ao alterar status');
      fetchData();
    }
  };

  const getMeetingLabel = (id: string | null) => {
    if (!id) return null;
    const m = meetings.find(m => m.id === id);
    if (!m) return null;
    return m.meeting_title || (m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('pt-BR') : 'Reunião');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Nenhuma tarefa ainda.</p>
        <p className="text-xs mt-1">Use a IA acima para extrair tarefas de transcrições ou crie manualmente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {STATUS_GROUPS.map(group => {
        const groupTasks = tasks.filter(t => t.status_column === group.key);
        const isOpen = openGroups[group.key] ?? true;

        return (
          <Collapsible key={group.key} open={isOpen} onOpenChange={(open) => setOpenGroups(prev => ({ ...prev, [group.key]: open }))}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <div className={cn('w-2.5 h-2.5 rounded-full', group.color)} />
              <span className="font-medium text-sm">{group.label}</span>
              <Badge variant="outline" className="ml-auto text-xs h-5">{groupTasks.length}</Badge>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-1.5 mt-1">
              {groupTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-9 py-2">Nenhuma tarefa</p>
              ) : (
                groupTasks.map(task => {
                  const prio = priorityConfig[task.priority] || priorityConfig.medium;
                  const meetingLabel = getMeetingLabel(task.source_transcript_id);

                  return (
                    <Card key={task.id} className="ml-4 border-l-4 transition-all hover:shadow-sm" style={{ borderLeftColor: task.priority === 'high' ? 'hsl(var(--destructive))' : task.priority === 'low' ? 'hsl(142 71% 45%)' : 'hsl(45 93% 47%)' }}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium leading-tight">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant={prio.variant} className="text-[10px] h-4 px-1.5">{prio.label}</Badge>
                              {task.due_date && (
                                <Badge variant="outline" className="text-[10px] h-4 gap-0.5 px-1.5">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {new Date(task.due_date).toLocaleDateString('pt-BR')}
                                </Badge>
                              )}
                              {meetingLabel && (
                                <Badge variant="outline" className="text-[10px] h-4 gap-0.5 px-1.5 bg-primary/5">
                                  <Video className="h-2.5 w-2.5" />
                                  {meetingLabel}
                                </Badge>
                              )}
                              {(task.tags || []).slice(0, 2).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] h-4 px-1.5">{tag}</Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Select value={task.status_column} onValueChange={(v) => handleStatusChange(task.id, v)}>
                              <SelectTrigger className="h-7 w-[90px] text-[10px] px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_GROUPS.map(s => (
                                  <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingTaskId(task.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Edit Modal */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Baixa</SelectItem>
                    <SelectItem value="medium">🟡 Média</SelectItem>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status_column} onValueChange={(v) => setEditForm(f => ({ ...f, status_column: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_fazer">A Fazer</SelectItem>
                    <SelectItem value="fazendo">Fazendo</SelectItem>
                    <SelectItem value="feito">Feito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            {meetings.length > 0 && (
              <div className="space-y-2">
                <Label>Reunião associada</Label>
                <Select value={editForm.source_transcript_id} onValueChange={(v) => setEditForm(f => ({ ...f, source_transcript_id: v === '_none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhuma</SelectItem>
                    {meetings.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.meeting_title || (m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('pt-BR') : m.id.slice(0, 8))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editForm.title.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingTaskId} onOpenChange={(open) => !open && setDeletingTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
