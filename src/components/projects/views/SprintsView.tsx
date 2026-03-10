import { useState } from 'react';
import { useMentorProjects, type MentorSprint } from '@/hooks/useMentorProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Play, CheckCircle2, Clock, Target } from 'lucide-react';
import { format, differenceInDays, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
}

export function SprintsView({ projectId }: Props) {
  const { useSprints, createSprint, updateSprint, useTasks, useStatuses, updateTask } = useMentorProjects();
  const { data: sprints = [] } = useSprints(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const { data: statuses = [] } = useStatuses(projectId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', goal: '' });

  const doneIds = statuses.filter(s => s.is_done).map(s => s.id);

  const handleCreate = () => {
    if (!form.name || !form.start_date || !form.end_date) return;
    createSprint.mutate({ project_id: projectId, ...form });
    setOpen(false);
    setForm({ name: '', start_date: '', end_date: '', goal: '' });
  };

  const getSprintTasks = (sprintId: string) => tasks.filter(t => t.sprint_id === sprintId);
  const backlogTasks = tasks.filter(t => !t.sprint_id);

  const handleAssignToSprint = (taskId: string, sprintId: string) => {
    updateTask.mutate({ id: taskId, project_id: projectId, updates: { sprint_id: sprintId } as any });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sprints</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Nova Sprint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Sprint</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sprint 1" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Objetivo</Label>
                <Input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} placeholder="Objetivo da sprint..." className="mt-1" />
              </div>
              <Button onClick={handleCreate} className="w-full">Criar Sprint</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sprint cards */}
      {sprints.map(sprint => {
        const sprintTasks = getSprintTasks(sprint.id);
        const done = sprintTasks.filter(t => doneIds.includes(t.status_id || '')).length;
        const pct = sprintTasks.length > 0 ? Math.round((done / sprintTasks.length) * 100) : 0;
        const totalDays = differenceInDays(new Date(sprint.end_date), new Date(sprint.start_date));
        const elapsed = Math.max(0, differenceInDays(new Date(), new Date(sprint.start_date)));
        const isActive = sprint.status === 'active';

        return (
          <Card key={sprint.id} className={cn("bg-card/50 border-border/30", isActive && "border-primary/30")}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {sprint.name}
                  <Badge variant="outline" className={cn("text-[10px]",
                    sprint.status === 'active' ? 'bg-primary/10 text-primary' :
                    sprint.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    'bg-muted/50 text-muted-foreground'
                  )}>
                    {sprint.status === 'active' ? 'Ativa' : sprint.status === 'completed' ? 'Concluída' : 'Planejando'}
                  </Badge>
                </CardTitle>
                {sprint.status === 'planning' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => updateSprint.mutate({ id: sprint.id, project_id: projectId, updates: { status: 'active' } })}>
                    <Play className="h-3 w-3" /> Iniciar
                  </Button>
                )}
                {sprint.status === 'active' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => updateSprint.mutate({ id: sprint.id, project_id: projectId, updates: { status: 'completed' } })}>
                    <CheckCircle2 className="h-3 w-3" /> Concluir
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(new Date(sprint.start_date), 'dd/MM')} → {format(new Date(sprint.end_date), 'dd/MM')}</span>
                <span>{done}/{sprintTasks.length} tarefas</span>
              </div>
              <Progress value={pct} className="h-1.5" />
              {sprint.goal && <p className="text-xs text-muted-foreground italic">🎯 {sprint.goal}</p>}

              {/* Sprint tasks */}
              <div className="space-y-1 mt-2">
                {sprintTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs bg-muted/20 rounded px-2 py-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statuses.find(s => s.id === t.status_id)?.color || '#94a3b8' }} />
                    <span className={cn("flex-1 truncate", doneIds.includes(t.status_id || '') && "line-through text-muted-foreground")}>{t.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Backlog */}
      {backlogTasks.length > 0 && (
        <Card className="bg-card/30 border-border/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Backlog ({backlogTasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {backlogTasks.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs bg-muted/10 rounded px-2 py-1">
                <span className="flex-1 truncate">{t.title}</span>
                {sprints.filter(s => s.status !== 'completed').length > 0 && (
                  <Select onValueChange={v => handleAssignToSprint(t.id, v)}>
                    <SelectTrigger className="h-5 w-24 text-[10px]"><SelectValue placeholder="Sprint..." /></SelectTrigger>
                    <SelectContent>
                      {sprints.filter(s => s.status !== 'completed').map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
