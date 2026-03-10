import { useState, useMemo } from 'react';
import { useMentorProjects, type MentorTask } from '@/hooks/useMentorProjects';
import { TaskDetailSheet } from '../TaskDetailSheet';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
}

export function CalendarView({ projectId }: Props) {
  const { useTasks, useStatuses } = useMentorProjects();
  const { data: tasks = [] } = useTasks(projectId);
  const { data: statuses = [] } = useStatuses(projectId);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<MentorTask | null>(null);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const getTasksForDay = (day: Date) =>
    tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day));

  const getStatusColor = (statusId: string | null) =>
    statuses.find(s => s.id === statusId)?.color || '#94a3b8';

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <>
      <div className="bg-card/30 border border-border/30 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border/30">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border/30">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1.5">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayTasks = getTasksForDay(day);
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[80px] border-b border-r border-border/20 p-1",
                  !inMonth && "opacity-30"
                )}
              >
                <div className={cn(
                  "text-[11px] font-medium mb-0.5 w-5 h-5 flex items-center justify-center rounded-full",
                  today && "bg-primary text-primary-foreground"
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="w-full text-left text-[10px] px-1 py-0.5 rounded truncate hover:bg-muted/50 transition-colors"
                      style={{ borderLeft: `2px solid ${getStatusColor(task.status_id)}` }}
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[9px] text-muted-foreground px-1">+{dayTasks.length - 3} mais</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskDetailSheet task={selectedTask} projectId={projectId} onClose={() => setSelectedTask(null)} />
    </>
  );
}
