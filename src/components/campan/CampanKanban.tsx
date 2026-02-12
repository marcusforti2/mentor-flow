import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, GripVertical, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CampanTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  tags: string[];
  status_column: string;
  created_at: string;
}

interface CampanKanbanProps {
  mentoradoMembershipId: string;
  readOnly?: boolean;
  refreshKey?: number;
}

const COLUMNS = [
  { key: 'a_fazer', label: 'A Fazer', color: 'bg-blue-500' },
  { key: 'fazendo', label: 'Fazendo', color: 'bg-amber-500' },
  { key: 'feito', label: 'Feito', color: 'bg-green-500' },
];

const priorityColors: Record<string, string> = {
  low: 'border-l-blue-400',
  medium: 'border-l-amber-400',
  high: 'border-l-red-400',
};

export function CampanKanban({ mentoradoMembershipId, readOnly = false, refreshKey = 0 }: CampanKanbanProps) {
  const [tasks, setTasks] = useState<CampanTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('campan_tasks')
      .select('*')
      .eq('mentorado_membership_id', mentoradoMembershipId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks((data || []) as CampanTask[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (mentoradoMembershipId) fetchTasks();
  }, [mentoradoMembershipId, refreshKey]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (readOnly) return;
    e.dataTransfer.setData('taskId', taskId);
    setDraggedId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newColumn: string) => {
    if (readOnly) return;
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setDraggedId(null);

    if (!taskId) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_column: newColumn } : t));

    const { error } = await supabase
      .from('campan_tasks')
      .update({ status_column: newColumn })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
      toast.error('Erro ao mover tarefa');
      fetchTasks(); // Revert
    }
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
        <p className="text-xs mt-1">Tarefas criadas pelo mentor aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const columnTasks = tasks.filter(t => t.status_column === col.key);
        return (
          <div
            key={col.key}
            className="flex flex-col min-w-[260px] flex-1 bg-muted/20 rounded-xl"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 p-3 border-b border-border/50">
              <div className={cn('w-3 h-3 rounded-full', col.color)} />
              <span className="font-medium text-sm">{col.label}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {columnTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-320px)]">
              {columnTasks.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Arraste tarefas aqui
                </div>
              ) : (
                columnTasks.map(task => (
                  <Card
                    key={task.id}
                    draggable={!readOnly}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className={cn(
                      'cursor-grab active:cursor-grabbing border-l-4 transition-all hover:shadow-md',
                      priorityColors[task.priority] || 'border-l-border',
                      draggedId === task.id && 'opacity-50'
                    )}
                  >
                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-1 flex-wrap">
                        {task.due_date && (
                          <Badge variant="outline" className="text-xs h-5 gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(task.due_date).toLocaleDateString('pt-BR')}
                          </Badge>
                        )}
                        {(task.tags || []).slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs h-5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
