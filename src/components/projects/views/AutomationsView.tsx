import { useState } from 'react';
import { useMentorProjects } from '@/hooks/useMentorProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Zap, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  projectId: string;
}

const TRIGGERS = [
  { key: 'status_change', label: 'Status muda para...', icon: '🔄' },
  { key: 'task_created', label: 'Tarefa criada', icon: '✨' },
  { key: 'due_date_reached', label: 'Prazo atingido', icon: '⏰' },
  { key: 'priority_change', label: 'Prioridade muda para...', icon: '🎯' },
  { key: 'checklist_complete', label: 'Checklist completa', icon: '✅' },
];

const ACTIONS = [
  { key: 'change_status', label: 'Mudar status para...' },
  { key: 'change_priority', label: 'Mudar prioridade para...' },
  { key: 'add_tag', label: 'Adicionar tag' },
  { key: 'notify', label: 'Enviar notificação' },
];

export function AutomationsView({ projectId }: Props) {
  const { useAutomations, useStatuses, createAutomation, toggleAutomation, deleteAutomation } = useMentorProjects();
  const { data: automations = [] } = useAutomations(projectId);
  const { data: statuses = [] } = useStatuses(projectId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    trigger_type: '',
    trigger_value: '',
    action_type: '',
    action_value: '',
  });

  const handleCreate = () => {
    if (!form.name || !form.trigger_type || !form.action_type) {
      toast.error('Preencha todos os campos');
      return;
    }
    createAutomation.mutate({
      project_id: projectId,
      name: form.name,
      trigger_type: form.trigger_type,
      trigger_config: { value: form.trigger_value },
      action_type: form.action_type,
      action_config: { value: form.action_value },
      is_active: true,
    });
    setOpen(false);
    setForm({ name: '', trigger_type: '', trigger_value: '', action_type: '', action_value: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Automações do Projeto</h3>
          <p className="text-xs text-muted-foreground">Quando X acontecer, faça Y automaticamente</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Nova Automação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Automação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Mover para revisão quando checklist completa" className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Quando... (Trigger)</Label>
                  <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {TRIGGERS.map(t => (
                        <SelectItem key={t.key} value={t.key}>{t.icon} {t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(form.trigger_type === 'status_change' || form.trigger_type === 'priority_change') && (
                    <Select value={form.trigger_value} onValueChange={v => setForm(f => ({ ...f, trigger_value: v }))}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Valor" /></SelectTrigger>
                      <SelectContent>
                        {form.trigger_type === 'status_change'
                          ? statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                          : ['urgent', 'high', 'medium', 'low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Então... (Ação)</Label>
                  <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map(a => (
                        <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(form.action_type === 'change_status') && (
                    <Select value={form.action_value} onValueChange={v => setForm(f => ({ ...f, action_value: v }))}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Valor" /></SelectTrigger>
                      <SelectContent>
                        {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {form.action_type === 'add_tag' && (
                    <Input value={form.action_value} onChange={e => setForm(f => ({ ...f, action_value: e.target.value }))} placeholder="Nome da tag" className="mt-2" />
                  )}
                </div>
              </div>

              <Button onClick={handleCreate} className="w-full">Criar Automação</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {automations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma automação configurada</p>
          <p className="text-xs">Crie regras para automatizar fluxos de trabalho</p>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map(auto => {
            const trigger = TRIGGERS.find(t => t.key === auto.trigger_type);
            const action = ACTIONS.find(a => a.key === auto.action_type);
            return (
              <Card key={auto.id} className="bg-card/50 border-border/30">
                <CardContent className="p-3 flex items-center gap-3">
                  <Switch
                    checked={auto.is_active}
                    onCheckedChange={checked => toggleAutomation.mutate({ id: auto.id, is_active: checked, project_id: projectId })}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{auto.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{trigger?.icon} {trigger?.label || auto.trigger_type}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-[10px]">{action?.label || auto.action_type}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAutomation.mutate({ id: auto.id, project_id: projectId })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
