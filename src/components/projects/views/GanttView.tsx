import { useMemo } from 'react';
import { useMentorProjects, type MentorTask } from '@/hooks/useMentorProjects';
import { format, differenceInDays, startOfDay, addDays, min as minDate, max as maxDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
}

const priorityColors: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

export function GanttView({ projectId }: Props) {
  const { useTasks, useStatuses, useDependencies } = useMentorProjects();
  const { data: tasks = [] } = useTasks(projectId);
  const { data: statuses = [] } = useStatuses(projectId);
  const { data: deps = [] } = useDependencies(projectId);

  const doneIds = statuses.filter(s => s.is_done).map(s => s.id);

  // Filter tasks with dates
  const dated = useMemo(() => {
    return tasks
      .filter(t => t.start_date || t.due_date)
      .map(t => ({
        ...t,
        startDay: t.start_date ? new Date(t.start_date) : new Date(t.due_date!),
        endDay: t.due_date ? new Date(t.due_date) : new Date(t.start_date!),
      }))
      .sort((a, b) => a.startDay.getTime() - b.startDay.getTime());
  }, [tasks]);

  if (dated.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Adicione datas de início e prazo nas tarefas para ver o Gantt
      </div>
    );
  }

  const timelineStart = startOfDay(minDate(dated.map(t => t.startDay)));
  const timelineEnd = startOfDay(addDays(maxDate(dated.map(t => t.endDay)), 1));
  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1;
  const dayWidth = 36;

  const days = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));

  const getStatusColor = (statusId: string | null) =>
    statuses.find(s => s.id === statusId)?.color || '#94a3b8';

  return (
    <div className="bg-card/30 border border-border/30 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${250 + totalDays * dayWidth}px` }}>
          {/* Header - days */}
          <div className="flex border-b border-border/30">
            <div className="w-[250px] shrink-0 p-2 text-xs font-semibold text-muted-foreground border-r border-border/30">
              Tarefa
            </div>
            <div className="flex">
              {days.map((day, i) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <div
                    key={i}
                    className={cn(
                      "text-center text-[9px] border-r border-border/20 py-1",
                      isWeekend && "bg-muted/20",
                      isToday && "bg-primary/10"
                    )}
                    style={{ width: dayWidth }}
                  >
                    <div className="font-medium">{format(day, 'dd')}</div>
                    <div className="text-muted-foreground">{format(day, 'EEE', { locale: ptBR })}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows */}
          {dated.map(task => {
            const offset = differenceInDays(task.startDay, timelineStart);
            const duration = Math.max(differenceInDays(task.endDay, task.startDay) + 1, 1);
            const isDone = doneIds.includes(task.status_id || '');
            const color = getStatusColor(task.status_id);
            const hasDep = deps.some(d => d.task_id === task.id);

            return (
              <div key={task.id} className="flex border-b border-border/20 hover:bg-muted/10">
                <div className="w-[250px] shrink-0 p-2 text-xs truncate border-r border-border/30 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColors[task.priority] || '#eab308' }} />
                  <span className={cn(isDone && "line-through text-muted-foreground")}>{task.title}</span>
                  {hasDep && <span className="text-[9px] text-muted-foreground">🔗</span>}
                </div>
                <div className="relative flex-1" style={{ height: 32 }}>
                  {/* Bar */}
                  <div
                    className="absolute top-1 h-5 rounded-md transition-all flex items-center px-1.5 text-[10px] font-medium text-white truncate"
                    style={{
                      left: offset * dayWidth,
                      width: duration * dayWidth - 2,
                      backgroundColor: color,
                      opacity: isDone ? 0.5 : 0.85,
                    }}
                  >
                    {duration > 2 && task.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
