import { useState } from 'react';
import { useMentorProjects, type MentorGoal } from '@/hooks/useMentorProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function GoalsView() {
  const { useGoals, createGoal, updateGoal, deleteGoal, addKeyResult, updateKeyResult } = useMentorProjects();
  const { data: goals = [] } = useGoals();
  const [open, setOpen] = useState(false);
  const [krForm, setKrForm] = useState<{ goalId: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', description: '', target_value: '100', unit: '%', due_date: '' });

  const handleCreate = () => {
    if (!form.name) return;
    createGoal.mutate({
      name: form.name,
      description: form.description,
      target_value: parseFloat(form.target_value) || 100,
      unit: form.unit,
      due_date: form.due_date || undefined,
    });
    setOpen(false);
    setForm({ name: '', description: '', target_value: '100', unit: '%', due_date: '' });
  };

  const handleAddKR = () => {
    if (!krForm?.name) return;
    addKeyResult.mutate({ goal_id: krForm.goalId, name: krForm.name });
    setKrForm(null);
  };

  const getGoalProgress = (goal: MentorGoal) => {
    if (!goal.key_results || goal.key_results.length === 0) {
      return goal.target_value > 0 ? Math.round((goal.current_value / goal.target_value) * 100) : 0;
    }
    const krProgress = goal.key_results.map(kr =>
      kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0
    );
    return Math.round(krProgress.reduce((s, v) => s + v, 0) / krProgress.length);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Metas & OKRs</h3>
          <p className="text-xs text-muted-foreground">Defina objetivos e acompanhe resultados-chave</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Nova Meta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Meta / OKR</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Objetivo</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Aumentar receita em 30%" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes..." className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Meta</Label>
                  <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Unidade</Label>
                  <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="%, R$, un" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Prazo</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">Criar Meta</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma meta definida</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const progress = getGoalProgress(goal);
            return (
              <Card key={goal.id} className="bg-card/50 border-border/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      {goal.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px]",
                        progress >= 100 ? "bg-emerald-500/10 text-emerald-400" :
                        progress >= 70 ? "bg-primary/10 text-primary" :
                        "bg-orange-500/10 text-orange-400"
                      )}>
                        {progress}%
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteGoal.mutate(goal.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {goal.description && <p className="text-xs text-muted-foreground">{goal.description}</p>}
                  <Progress value={Math.min(progress, 100)} className="h-2" />

                  {/* Key Results */}
                  <div className="space-y-2">
                    {(goal.key_results || []).map(kr => {
                      const krPct = kr.target_value > 0 ? Math.round((kr.current_value / kr.target_value) * 100) : 0;
                      return (
                        <div key={kr.id} className="bg-muted/20 rounded-lg p-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{kr.name}</span>
                            <span className="text-[10px] text-muted-foreground">{kr.current_value}/{kr.target_value} {kr.unit}</span>
                          </div>
                          <Slider
                            value={[kr.current_value]}
                            max={kr.target_value}
                            step={1}
                            onValueChange={([v]) => updateKeyResult.mutate({ id: kr.id, current_value: v })}
                            className="py-1"
                          />
                        </div>
                      );
                    })}

                    {krForm?.goalId === goal.id ? (
                      <form onSubmit={e => { e.preventDefault(); handleAddKR(); }} className="flex gap-1">
                        <Input value={krForm.name} onChange={e => setKrForm(f => f ? { ...f, name: e.target.value } : null)} placeholder="Resultado-chave..." className="h-7 text-xs" autoFocus />
                        <Button type="submit" size="icon" className="h-7 w-7 shrink-0"><Plus className="h-3 w-3" /></Button>
                      </form>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground" onClick={() => setKrForm({ goalId: goal.id, name: '' })}>
                        <Plus className="h-3 w-3 mr-1" /> Key Result
                      </Button>
                    )}
                  </div>

                  {goal.due_date && (
                    <span className="text-[10px] text-muted-foreground">Prazo: {format(new Date(goal.due_date), 'dd/MM/yyyy')}</span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
