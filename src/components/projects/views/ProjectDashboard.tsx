import { useMemo } from 'react';
import { useMentorProjects } from '@/hooks/useMentorProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react';

interface Props {
  projectId: string;
}

export function ProjectDashboard({ projectId }: Props) {
  const { useTasks, useStatuses } = useMentorProjects();
  const { data: tasks = [] } = useTasks(projectId);
  const { data: statuses = [] } = useStatuses(projectId);

  const allTasks = useMemo(() => {
    const subs = tasks.flatMap(t => t.subtasks || []);
    return [...tasks, ...subs];
  }, [tasks]);

  const doneIds = statuses.filter(s => s.is_done).map(s => s.id);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter(t => doneIds.includes(t.status_id || '')).length;
  const overdueTasks = allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !doneIds.includes(t.status_id || '')).length;
  const totalEstimated = allTasks.reduce((s, t) => s + (t.estimated_minutes || 0), 0);
  const totalActual = allTasks.reduce((s, t) => s + (t.actual_minutes || 0), 0);
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Status distribution for pie chart
  const statusDist = statuses.map(s => ({
    name: s.name,
    value: allTasks.filter(t => t.status_id === s.id).length,
    color: s.color,
  })).filter(d => d.value > 0);

  // Priority distribution for bar chart
  const priorityDist = [
    { name: 'Urgente', count: allTasks.filter(t => t.priority === 'urgent').length, fill: '#ef4444' },
    { name: 'Alta', count: allTasks.filter(t => t.priority === 'high').length, fill: '#f97316' },
    { name: 'Média', count: allTasks.filter(t => t.priority === 'medium').length, fill: '#eab308' },
    { name: 'Baixa', count: allTasks.filter(t => t.priority === 'low').length, fill: '#3b82f6' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ListTodo className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Concluídas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{doneTasks}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Atrasadas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{overdueTasks}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Horas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {Math.floor(totalActual / 60)}h
              <span className="text-sm text-muted-foreground font-normal">
                /{Math.floor(totalEstimated / 60)}h
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm font-bold text-primary">{completionPct}%</span>
          </div>
          <Progress value={completionPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="bg-card/50 border-border/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por Status</CardTitle></CardHeader>
          <CardContent>
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por Prioridade</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityDist}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
