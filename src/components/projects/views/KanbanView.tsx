import { useState } from 'react';
import { useMentorProjects, type MentorTask, type TaskStatus } from '@/hooks/useMentorProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskDetailSheet } from '../TaskDetailSheet';
import { Plus, GripVertical, CheckSquare, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Props {
  projectId: string;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-blue-500/20 text-blue-400',
};

const priorityLabels: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export function KanbanView({ projectId }: Props) {
  const { useStatuses, useTasks, createTask, updateTask } = useMentorProjects();
  const { data: statuses = [] } = useStatuses(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const [selectedTask, setSelectedTask] = useState<MentorTask | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const getTasksForStatus = (statusId: string) =>
    tasks.filter(t => t.status_id === statusId);

  const unassignedTasks = tasks.filter(t => !t.status_id);

  const handleAdd = (statusId: string) => {
    if (!newTitle.trim()) return;
    createTask.mutate({
      project_id: projectId,
      title: newTitle.trim(),
      status_id: statusId,
    });
    setNewTitle('');
    setAddingTo(null);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      updateTask.mutate({ id: taskId, project_id: projectId, updates: { status_id: statusId } });
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 h-full">
        {statuses.map(status => {
          const statusTasks = getTasksForStatus(status.id);
          return (
            <div
              key={status.id}
              className="flex flex-col min-w-[280px] max-w-[320px] bg-card/30 rounded-xl border border-border/30"
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={e => handleDrop(e, status.id)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 p-3 border-b border-border/30">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="font-medium text-sm text-foreground">{status.name}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                  {statusTasks.length}
                </span>
              </div>

              {/* Cards */}
              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1.5 p-2">
                  {statusTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onDragStart={handleDragStart}
                    />
                  ))}

                  {addingTo === status.id ? (
                    <form onSubmit={e => { e.preventDefault(); handleAdd(status.id); }} className="p-1">
                      <Input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Nome da tarefa..."
                        className="h-8 text-xs"
                        autoFocus
                        onBlur={() => { if (!newTitle.trim()) setAddingTo(null); }}
                      />
                    </form>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground text-xs h-7"
                      onClick={() => setAddingTo(status.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Nova tarefa
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      <TaskDetailSheet
        task={selectedTask}
        projectId={projectId}
        onClose={() => setSelectedTask(null)}
      />
    </>
  );
}

function TaskCard({ task, onClick, onDragStart }: {
  task: MentorTask;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const completedChecks = task.checklists?.filter(c => c.is_completed).length || 0;
  const totalChecks = task.checklists?.length || 0;
  const subtaskCount = task.subtasks?.length || 0;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onClick={onClick}
      className="bg-card/60 border border-border/30 rounded-lg p-2.5 cursor-pointer hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.priority !== 'medium' && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", priorityColors[task.priority])}>
                {priorityLabels[task.priority]}
              </Badge>
            )}
            {task.due_date && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {format(new Date(task.due_date), 'dd/MM')}
              </span>
            )}
            {totalChecks > 0 && (
              <span className={cn("text-[10px] flex items-center gap-0.5",
                completedChecks === totalChecks ? "text-emerald-400" : "text-muted-foreground"
              )}>
                <CheckSquare className="h-2.5 w-2.5" />
                {completedChecks}/{totalChecks}
              </span>
            )}
            {subtaskCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {subtaskCount} sub
              </span>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {task.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
