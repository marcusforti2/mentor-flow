import { useState } from 'react';
import { useMentorProjects, type MentorTask } from '@/hooks/useMentorProjects';
import { TaskDetailSheet } from '../TaskDetailSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ChevronRight, Clock, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  projectId: string;
}

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-blue-500/20 text-blue-400',
};

export function ListView({ projectId }: Props) {
  const { useStatuses, useTasks, createTask, updateTask } = useMentorProjects();
  const { data: statuses = [] } = useStatuses(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const [selectedTask, setSelectedTask] = useState<MentorTask | null>(null);
  const [sortBy, setSortBy] = useState<'position' | 'priority' | 'due_date'>('position');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const doneStatusIds = statuses.filter(s => s.is_done).map(s => s.id);

  let filtered = tasks;
  if (filterStatus !== 'all') filtered = filtered.filter(t => t.status_id === filterStatus);
  if (filterPriority !== 'all') filtered = filtered.filter(t => t.priority === filterPriority);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    if (sortBy === 'due_date') return (a.due_date || '9999').localeCompare(b.due_date || '9999');
    return a.position - b.position;
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const firstStatus = statuses[0];
    createTask.mutate({ project_id: projectId, title: newTitle.trim(), status_id: firstStatus?.id });
    setNewTitle('');
    setAdding(false);
  };

  const handleToggleDone = (task: MentorTask) => {
    const isDone = doneStatusIds.includes(task.status_id || '');
    const targetStatus = isDone ? statuses[0] : statuses.find(s => s.is_done);
    if (targetStatus) {
      updateTask.mutate({ id: task.id, project_id: projectId, updates: { status_id: targetStatus.id } });
    }
  };

  const getStatusName = (statusId: string | null) => {
    const s = statuses.find(st => st.id === statusId);
    return s ? s.name : '—';
  };

  const getStatusColor = (statusId: string | null) => {
    const s = statuses.find(st => st.id === statusId);
    return s?.color || '#94a3b8';
  };

  return (
    <>
      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={() => setSortBy(s => s === 'priority' ? 'due_date' : s === 'due_date' ? 'position' : 'priority')}>
          <ArrowUpDown className="h-3 w-3" /> {sortBy === 'priority' ? 'Prioridade' : sortBy === 'due_date' ? 'Prazo' : 'Posição'}
        </Button>
      </div>

      <div className="bg-card/30 border border-border/30 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30">
              <TableHead className="w-8" />
              <TableHead className="text-xs">Tarefa</TableHead>
              <TableHead className="text-xs w-28">Status</TableHead>
              <TableHead className="text-xs w-24">Prioridade</TableHead>
              <TableHead className="text-xs w-24">Prazo</TableHead>
              <TableHead className="text-xs w-20">Tempo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(task => {
              const isDone = doneStatusIds.includes(task.status_id || '');
              return (
                <TableRow key={task.id} className="border-border/20 cursor-pointer hover:bg-muted/20" onClick={() => setSelectedTask(task)}>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isDone} onCheckedChange={() => handleToggleDone(task)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm", isDone && "line-through text-muted-foreground")}>{task.title}</span>
                      {(task.subtasks?.length || 0) > 0 && (
                        <span className="text-[10px] text-muted-foreground">{task.subtasks?.length} sub</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(task.status_id) }} />
                      <span className="text-xs">{getStatusName(task.status_id)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", priorityColors[task.priority])}>
                      {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {task.due_date ? format(new Date(task.due_date), 'dd/MM/yy') : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {task.estimated_minutes ? `${Math.floor(task.estimated_minutes / 60)}h${task.estimated_minutes % 60 > 0 ? `${task.estimated_minutes % 60}m` : ''}` : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {adding ? (
          <form onSubmit={e => { e.preventDefault(); handleAdd(); }} className="p-2 border-t border-border/30">
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Nome da tarefa..." className="h-8 text-xs" autoFocus onBlur={() => { if (!newTitle.trim()) setAdding(false); }} />
          </form>
        ) : (
          <div className="p-2 border-t border-border/30">
            <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={() => setAdding(true)}>
              <Plus className="h-3 w-3 mr-1" /> Nova tarefa
            </Button>
          </div>
        )}
      </div>

      <TaskDetailSheet task={selectedTask} projectId={projectId} onClose={() => setSelectedTask(null)} />
    </>
  );
}
