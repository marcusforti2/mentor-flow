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
import { Loader2, Calendar, CheckCircle2, Plus, Save } from 'lucide-react';
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
  mentorMembershipId?: string;
  tenantId?: string;
  readOnly?: boolean;
  refreshKey?: number;
  allowSelfCreate?: boolean;
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

export function CampanKanban({ mentoradoMembershipId, mentorMembershipId, tenantId, readOnly = false, refreshKey = 0, allowSelfCreate = false }: CampanKanbanProps) {
  const [tasks, setTasks] = useState<CampanTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    status_column: 'a_fazer',
  });
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [selfTenantId, setSelfTenantId] = useState<string | null>(null);

  const canCreateManual = (!!mentorMembershipId && !!tenantId) || allowSelfCreate;

  // Fetch tenant_id from membership when allowSelfCreate is true
  useEffect(() => {
    if (allowSelfCreate && !tenantId && mentoradoMembershipId) {
      supabase
        .from('memberships')
        .select('tenant_id')
        .eq('id', mentoradoMembershipId)
        .single()
        .then(({ data }) => {
          if (data) setSelfTenantId(data.tenant_id);
        });
    }
  }, [allowSelfCreate, tenantId, mentoradoMembershipId]);

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('campan_tasks')
      .select('*')
      .eq('mentorado_membership_id', mentoradoMembershipId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Erro ao carregar tarefas');
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

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_column: newColumn } : t));

    const { error } = await supabase
      .from('campan_tasks')
      .update({ status_column: newColumn })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
      toast.error('Erro ao mover tarefa');
      fetchTasks();
    }
  };

  const handleSaveManual = async () => {
    if (!manualForm.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    const effectiveTenantId = tenantId || selfTenantId;
    const effectiveCreatorId = mentorMembershipId || mentoradoMembershipId;
    if (!effectiveTenantId || !effectiveCreatorId) return;
    setIsSavingManual(true);
    try {
      const { error } = await supabase.from('campan_tasks').insert({
        mentorado_membership_id: mentoradoMembershipId,
        created_by_membership_id: effectiveCreatorId,
        tenant_id: effectiveTenantId,
        title: manualForm.title.trim(),
        description: manualForm.description.trim() || null,
        priority: manualForm.priority,
        due_date: manualForm.due_date || null,
        status_column: manualForm.status_column,
        tags: [],
      });

      if (error) throw error;

      toast.success('Tarefa criada com sucesso!');
      setShowManualModal(false);
      setManualForm({ title: '', description: '', priority: 'medium', due_date: '', status_column: 'a_fazer' });
      fetchTasks();
    } catch (err: any) {
      console.error('Error creating manual task:', err);
      toast.error(err.message || 'Erro ao criar tarefa');
    } finally {
      setIsSavingManual(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with manual add button */}
      {canCreateManual && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowManualModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar tarefa manual
          </Button>
        </div>
      )}

      {tasks.length === 0 && !canCreateManual ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma tarefa ainda.</p>
          <p className="text-xs mt-1">{allowSelfCreate ? 'Crie sua primeira tarefa!' : 'Tarefas criadas pelo mentor aparecerão aqui.'}</p>
        </div>
      ) : (
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
                <div className="flex items-center gap-2 p-3 border-b border-border/50">
                  <div className={cn('w-3 h-3 rounded-full', col.color)} />
                  <span className="font-medium text-sm">{col.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

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
      )}

      {/* Manual task creation modal */}
      <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar tarefa manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={manualForm.title}
                onChange={(e) => setManualForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Revisar proposta comercial"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={manualForm.description}
                onChange={(e) => setManualForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detalhes opcionais..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={manualForm.priority} onValueChange={(v) => setManualForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Baixa</SelectItem>
                    <SelectItem value="medium">🟡 Média</SelectItem>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Coluna</Label>
                <Select value={manualForm.status_column} onValueChange={(v) => setManualForm(f => ({ ...f, status_column: v }))}>
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
              <Input
                type="date"
                value={manualForm.due_date}
                onChange={(e) => setManualForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveManual} disabled={isSavingManual || !manualForm.title.trim()}>
              {isSavingManual ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
