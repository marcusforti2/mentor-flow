import { useState } from 'react';
import { useMentorProjects } from '@/hooks/useMentorProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Zap, Trash2, ArrowRight, Bot, Sparkles, Send, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface Props {
  projectId: string;
}

const TRIGGERS = [
  { key: 'status_change', label: 'Status muda para...', icon: '🔄', desc: 'Disparado quando uma tarefa muda de coluna/status.' },
  { key: 'task_created', label: 'Tarefa criada', icon: '✨', desc: 'Disparado quando uma nova tarefa é adicionada ao projeto.' },
  { key: 'due_date_reached', label: 'Prazo atingido', icon: '⏰', desc: 'Disparado quando o prazo de uma tarefa chega.' },
  { key: 'priority_change', label: 'Prioridade muda para...', icon: '🎯', desc: 'Disparado quando a prioridade de uma tarefa é alterada.' },
  { key: 'checklist_complete', label: 'Checklist completa', icon: '✅', desc: 'Disparado quando todos os itens de uma checklist são marcados.' },
];

const ACTIONS = [
  { key: 'change_status', label: 'Mudar status para...', desc: 'Move a tarefa para outra coluna automaticamente.' },
  { key: 'change_priority', label: 'Mudar prioridade para...', desc: 'Altera a prioridade da tarefa.' },
  { key: 'add_tag', label: 'Adicionar tag', desc: 'Aplica uma tag/etiqueta à tarefa.' },
  { key: 'notify', label: 'Enviar notificação', desc: 'Envia um alerta sobre a tarefa.' },
];

const EXAMPLES = [
  { icon: '🔄', text: 'Quando checklist completa → mover para "Em Revisão"' },
  { icon: '⏰', text: 'Quando prazo chega → mudar prioridade para urgente' },
  { icon: '✨', text: 'Quando tarefa criada → adicionar tag "novo"' },
  { icon: '🎯', text: 'Quando prioridade vira urgente → enviar notificação' },
];

export function AutomationsView({ projectId }: Props) {
  const { useAutomations, useStatuses, createAutomation, toggleAutomation, deleteAutomation } = useMentorProjects();
  const { data: automations = [] } = useAutomations(projectId);
  const { data: statuses = [] } = useStatuses(projectId);

  // Manual form
  const [manualOpen, setManualOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    trigger_type: '',
    trigger_value: '',
    action_type: '',
    action_value: '',
  });

  // AI form
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    name: string;
    trigger_type: string;
    trigger_value?: string;
    action_type: string;
    action_value?: string;
  }>>([]);

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
    setManualOpen(false);
    setForm({ name: '', trigger_type: '', trigger_value: '', action_type: '', action_value: '' });
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    setAiSuggestions([]);

    try {
      const statusNames = statuses.map(s => s.name).join(', ');
      const triggerList = TRIGGERS.map(t => `${t.key}: ${t.label}`).join('\n');
      const actionList = ACTIONS.map(a => `${a.key}: ${a.label}`).join('\n');

      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: {
          type: 'chat',
          data: {
            message: `Você é um assistente especialista em automações de projetos. O usuário quer criar automações para seu projeto.

Status disponíveis no projeto: ${statusNames || 'To Do, Em Progresso, Concluído'}

Triggers disponíveis:
${triggerList}

Ações disponíveis:
${actionList}

Com base no pedido do usuário, sugira de 1 a 3 automações práticas. Para cada uma, responda PRIMEIRO com uma explicação amigável e depois inclua um bloco JSON com as automações no formato:
\`\`\`json
[{"name": "Nome da automação", "trigger_type": "key_do_trigger", "trigger_value": "valor_opcional", "action_type": "key_da_acao", "action_value": "valor_opcional"}]
\`\`\`

Pedido do usuário: "${aiPrompt}"`
          }
        }
      });

      if (error) throw error;
      const result = data?.result || '';
      setAiResponse(result);

      // Try to extract JSON suggestions
      const jsonMatch = result.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (Array.isArray(parsed)) {
            setAiSuggestions(parsed);
          }
        } catch { /* ignore parse errors */ }
      }
    } catch (err) {
      console.error('AI automation error:', err);
      toast.error('Erro ao gerar sugestões de automação');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: typeof aiSuggestions[0]) => {
    createAutomation.mutate({
      project_id: projectId,
      name: suggestion.name,
      trigger_type: suggestion.trigger_type,
      trigger_config: { value: suggestion.trigger_value || '' },
      action_type: suggestion.action_type,
      action_config: { value: suggestion.action_value || '' },
      is_active: true,
    });
    toast.success(`Automação "${suggestion.name}" criada!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Automações do Projeto</h3>
          <p className="text-xs text-muted-foreground">Quando X acontecer, faça Y automaticamente</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setAiOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" /> Criar com IA
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setManualOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova Automação
          </Button>
        </div>
      </div>

      {/* Empty state with explanations */}
      {automations.length === 0 && (
        <div className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhuma automação configurada</p>
            <p className="text-xs mt-1">Automatize tarefas repetitivas com regras simples de "Quando → Então"</p>
          </div>

          {/* Examples / Explanation cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXAMPLES.map((ex, i) => (
              <Card key={i} className="bg-muted/30 border-border/20 hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => { setAiPrompt(ex.text); setAiOpen(true); }}>
                <CardContent className="p-3 flex items-start gap-2.5">
                  <span className="text-lg shrink-0">{ex.icon}</span>
                  <div>
                    <p className="text-xs text-foreground/80 group-hover:text-foreground transition-colors">{ex.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Clique para criar com IA</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* What can be automated */}
          <Card className="bg-muted/20 border-border/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">O que posso automatizar?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Gatilhos (Quando...)</p>
                  <div className="space-y-1">
                    {TRIGGERS.map(t => (
                      <div key={t.key} className="flex items-center gap-1.5">
                        <span className="text-xs">{t.icon}</span>
                        <p className="text-[11px] text-foreground/70">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Ações (Então...)</p>
                  <div className="space-y-1">
                    {ACTIONS.map(a => (
                      <div key={a.key} className="flex items-center gap-1.5">
                        <ArrowRight className="h-2.5 w-2.5 text-primary/60" />
                        <p className="text-[11px] text-foreground/70">{a.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Automation list */}
      {automations.length > 0 && (
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

      {/* Manual creation dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
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
                {form.action_type === 'change_status' && (
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

      {/* AI creation dialog */}
      <Dialog open={aiOpen} onOpenChange={(v) => { setAiOpen(v); if (!v) { setAiResponse(''); setAiSuggestions([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Criar Automação com IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Descreva em linguagem natural o que você quer automatizar. A IA vai sugerir a configuração ideal.
            </p>

            <div className="flex gap-2">
              <Textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Ex: Quando uma tarefa ficar com a checklist completa, mova para revisão e mude a prioridade para alta"
                className="min-h-[60px] text-sm resize-none flex-1"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiGenerate(); } }}
              />
              <Button
                size="icon"
                className="shrink-0 h-10 w-10 self-end"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
              >
                {aiLoading ? <Bot className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {/* Quick suggestion chips */}
            {!aiResponse && (
              <div className="flex flex-wrap gap-1.5">
                {['Organizar tarefas por prioridade', 'Notificar quando prazo chegar', 'Mover tarefa ao completar checklist'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setAiPrompt(s); }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* AI Response */}
            {aiResponse && (
              <div className="space-y-3">
                <Card className="bg-foreground/5 border-border/30">
                  <CardContent className="p-3">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                      <ReactMarkdown>{aiResponse.replace(/```json[\s\S]*?```/g, '')}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>

                {/* Actionable suggestions */}
                {aiSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Automações sugeridas</p>
                    {aiSuggestions.map((sug, i) => {
                      const trigger = TRIGGERS.find(t => t.key === sug.trigger_type);
                      const action = ACTIONS.find(a => a.key === sug.action_type);
                      return (
                        <Card key={i} className="bg-muted/30 border-primary/20">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{sug.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className="text-[9px]">{trigger?.icon} {trigger?.label || sug.trigger_type}</Badge>
                                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                <Badge variant="outline" className="text-[9px]">{action?.label || sug.action_type}</Badge>
                              </div>
                            </div>
                            <Button size="sm" className="text-[10px] h-7 gap-1" onClick={() => handleApplySuggestion(sug)}>
                              <Plus className="h-3 w-3" /> Criar
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
