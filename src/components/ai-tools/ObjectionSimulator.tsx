import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { 
  MessageSquare, Send, RefreshCw, ClipboardCheck, User, Bot, Users, 
  AlertTriangle, CheckCircle2, Save, History, Trash2, Calendar, Play
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ObjectionSimulatorProps {
  mentoradoId: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  correction?: string;
}

interface SavedLead {
  id: string;
  contact_name: string;
  company: string | null;
  contact_email: string | null;
  temperature: string | null;
  status: string | null;
  ai_insights: any;
  notes: string | null;
}

interface SavedSimulation {
  id: string;
  lead_name: string | null;
  negotiation_phase: string;
  messages: Message[];
  feedback: string | null;
  score: number | null;
  created_at: string;
}

type NegotiationPhase = 
  | 'cold_response' 
  | 'qualification' 
  | 'diagnostic' 
  | 'value_anchoring'
  | 'post_proposal' 
  | 'checks' 
  | 'objection_handling'
  | 'closing'
  | 'rescue';

const negotiationPhases: { id: NegotiationPhase; label: string; description: string; emoji: string }[] = [
  { id: 'cold_response', label: 'Prospecção Fria', description: 'Lead respondeu minha abordagem inicial com ceticismo', emoji: '❄️' },
  { id: 'qualification', label: 'Qualificação', description: 'Descobrir se o lead tem perfil, dor e capacidade de investir', emoji: '🔍' },
  { id: 'diagnostic', label: 'Diagnóstico', description: 'Aprofundar nas dores e mostrar consequências de não agir', emoji: '🩺' },
  { id: 'value_anchoring', label: 'Ancoragem de Valor', description: 'Antes do preço: construir percepção de valor e ROI', emoji: '💎' },
  { id: 'post_proposal', label: 'Pós-Proposta', description: 'Proposta apresentada, objeções de preço e timing virão', emoji: '📋' },
  { id: 'checks', label: 'Checagens', description: 'Testar entendimento, comprometimento e prontidão', emoji: '✅' },
  { id: 'objection_handling', label: 'Quebra de Objeções', description: 'Lead apresentou objeção específica, preciso contornar', emoji: '🛡️' },
  { id: 'closing', label: 'Fechamento', description: 'Última milha: conduzir para a decisão final', emoji: '🤝' },
  { id: 'rescue', label: 'Resgate', description: 'Lead esfriou ou sumiu, tentar reativar a conversa', emoji: '🔄' },
];

export function ObjectionSimulator({ mentoradoId }: ObjectionSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Lead selection
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedLead, setSelectedLead] = useState<SavedLead | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  
  // Negotiation phase
  const [selectedPhase, setSelectedPhase] = useState<NegotiationPhase>('cold_response');
  
  // Saved simulations
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [currentSimulationId, setCurrentSimulationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('simulator');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const fetchData = async () => {
      if (!mentoradoId) return;
      setIsLoadingLeads(true);
      
      try {
        const [leadsRes, simulationsRes] = await Promise.all([
          supabase
            .from('crm_prospections')
            .select('id, contact_name, company, contact_email, temperature, status, ai_insights, notes')
            .eq('membership_id', mentoradoId)
            .order('updated_at', { ascending: false })
            .limit(50),
          supabase
            .from('roleplay_simulations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)
        ]);
        
        if (leadsRes.data) setLeads(leadsRes.data);
        if (simulationsRes.data) {
          setSavedSimulations(simulationsRes.data.map(s => ({
            ...s,
            messages: (s.messages as unknown as Message[]) || []
          })));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    
    fetchData();
  }, [mentoradoId]);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (leadId === 'random') {
      setSelectedLead(null);
      return;
    }
    const lead = leads.find(l => l.id === leadId);
    setSelectedLead(lead || null);
    if (lead) toast.success(`Lead "${lead.contact_name}" selecionado`);
  };

  const buildLeadContext = (): string => {
    const parts: string[] = [];
    const phaseInfo = negotiationPhases.find(p => p.id === selectedPhase);
    if (phaseInfo) {
      const phaseDescriptions: Record<NegotiationPhase, string> = {
        cold_response: 'O lead acabou de responder uma prospecção fria. Ele ainda está cético e desconfiado. Quer entender quem você é antes de qualquer coisa.',
        qualification: 'Fase de qualificação. O lead quer saber se você entende o contexto dele. Precisa demonstrar autoridade e fazer perguntas estratégicas.',
        diagnostic: 'Diagnóstico profundo. O lead está aberto mas precisa sentir a DOR. Você deve aprofundar nos problemas e consequências de não agir.',
        value_anchoring: 'Ancoragem de valor ANTES do preço. O lead precisa perceber ROI e transformação. Construa o valor antes de falar número.',
        post_proposal: 'A proposta já foi apresentada. Virão objeções de preço, timing, comparação com concorrentes. O lead está calculando.',
        checks: 'Fase de checagens: testando entendimento, comprometimento e prontidão para decidir. Perguntas de temperatura.',
        objection_handling: 'O lead apresentou uma objeção específica. Você precisa entender a objeção real por trás e contornar com elegância.',
        closing: 'Última milha. O lead está quase lá mas precisa de um empurrão final. Urgência, escassez e confirmação.',
        rescue: 'Lead esfriou ou sumiu. Você precisa reativar sem parecer desesperado. Abordagem indireta com valor.'
      };
      parts.push(`FASE: ${phaseInfo.label} - ${phaseDescriptions[selectedPhase]}`);
    }
    if (!selectedLead) {
      parts.push('Lead: Prospect genérico high-ticket');
      return parts.join('\n');
    }
    
    parts.push(`Nome: ${selectedLead.contact_name}`);
    if (selectedLead.company) parts.push(`Empresa: ${selectedLead.company}`);
    if (selectedLead.temperature) {
      const tempMap: Record<string, string> = { hot: 'Quente 🔥', warm: 'Morno ☀️', cold: 'Frio ❄️' };
      parts.push(`Temperatura: ${tempMap[selectedLead.temperature] || selectedLead.temperature}`);
    }
    
    // Se tem dados de qualificação completos, usar eles
    const insights = selectedLead.ai_insights as any;
    if (insights?.behavioral_profile) {
      // Perfil comportamental
      const behavior = insights.behavioral_profile;
      parts.push(`\n--- PERFIL COMPORTAMENTAL ---`);
      parts.push(`Estilo DISC: ${behavior.primary_style?.toUpperCase() || 'N/A'}`);
      if (behavior.communication_preference) parts.push(`Comunicação: ${behavior.communication_preference}`);
      if (behavior.decision_making_style) parts.push(`Decisão: ${behavior.decision_making_style}`);
      if (behavior.what_motivates?.length) parts.push(`Motivadores: ${behavior.what_motivates.slice(0,2).join(', ')}`);
      if (behavior.what_frustrates?.length) parts.push(`Frustrações: ${behavior.what_frustrates.slice(0,2).join(', ')}`);
      
      // Perspectiva do lead
      const perspective = insights.lead_perspective;
      if (perspective) {
        parts.push(`\n--- PERSPECTIVA ---`);
        if (perspective.current_challenges?.length) parts.push(`Desafios: ${perspective.current_challenges.slice(0,2).join(', ')}`);
        if (perspective.fears_and_concerns?.length) parts.push(`Medos: ${perspective.fears_and_concerns.slice(0,2).join(', ')}`);
      }
      
      // Objeções esperadas
      if (insights.expected_objections?.length) {
        parts.push(`\n--- OBJEÇÕES ESPERADAS ---`);
        insights.expected_objections.slice(0,3).forEach((obj: any) => {
          parts.push(`• ${obj.objection} (${obj.likelihood})`);
        });
      }
      
      // O que afasta
      if (insights.what_pushes_away) {
        const pushes = insights.what_pushes_away;
        if (pushes.behaviors_to_avoid?.length) {
          parts.push(`\nEVITAR: ${pushes.behaviors_to_avoid.slice(0,2).join(', ')}`);
        }
      }
    } else if (insights) {
      // Dados básicos de ai_insights
      if (insights.summary) parts.push(`Resumo: ${insights.summary}`);
      if (insights.pain_points?.length) parts.push(`Dores: ${insights.pain_points.slice(0,2).join(', ')}`);
      if (insights.objections?.length) parts.push(`Objeções: ${insights.objections.slice(0,2).join(', ')}`);
    }
    
    return parts.join('\n');
  };

  const saveSimulation = async () => {
    if (!mentoradoId || messages.length < 2) {
      toast.error('Faça pelo menos uma troca de mensagens antes de salvar');
      return;
    }
    
    setIsSaving(true);
    try {
      const simulationData = {
        mentorado_id: mentoradoId,
        lead_id: selectedLeadId && selectedLeadId !== 'random' ? selectedLeadId : null,
        lead_name: selectedLead?.contact_name || 'Prospect Genérico',
        negotiation_phase: selectedPhase,
        messages: JSON.parse(JSON.stringify(messages)) as Json,
        feedback: feedback || null,
        score: null as number | null
      };

      if (currentSimulationId) {
        const { error } = await supabase
          .from('roleplay_simulations')
          .update(simulationData)
          .eq('id', currentSimulationId);
        if (error) throw error;
        toast.success('Simulação atualizada!');
      } else {
        const { data, error } = await supabase
          .from('roleplay_simulations')
          .insert(simulationData)
          .select()
          .single();
        if (error) throw error;
        setCurrentSimulationId(data.id);
        setSavedSimulations(prev => [{
          ...data,
          messages: data.messages as unknown as Message[]
        }, ...prev]);
        toast.success('Simulação salva! 💾');
      }
    } catch (error) {
      console.error('Error saving simulation:', error);
      toast.error('Erro ao salvar simulação');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSimulation = (simulation: SavedSimulation) => {
    setMessages(simulation.messages);
    setFeedback(simulation.feedback || '');
    setShowFeedback(!!simulation.feedback);
    setCurrentSimulationId(simulation.id);
    setSelectedPhase(simulation.negotiation_phase as NegotiationPhase);
    setActiveTab('simulator');
    toast.success('Simulação carregada!');
  };

  const deleteSimulation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('roleplay_simulations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSavedSimulations(prev => prev.filter(s => s.id !== id));
      if (currentSimulationId === id) {
        setCurrentSimulationId(null);
        setMessages([]);
        setFeedback('');
        setShowFeedback(false);
      }
      toast.success('Simulação excluída');
    } catch (error) {
      console.error('Error deleting simulation:', error);
      toast.error('Erro ao excluir');
    }
  };

  const startSimulation = async () => {
    setIsLoading(true);
    setMessages([]);
    setFeedback('');
    setShowFeedback(false);
    setCurrentSimulationId(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'objection_simulator',
          mentorado_id: mentoradoId,
          data: { 
            action: 'start',
            lead_context: buildLeadContext(),
            lead_name: selectedLead?.contact_name || null
          },
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setMessages([{ role: 'assistant', content: data?.result || '' }]);
      toast.success('Simulação iniciada!');
    } catch (error) {
      console.error('Error starting simulation:', error);
      toast.error('Erro ao iniciar simulação');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'objection_simulator',
          mentorado_id: mentoradoId,
          data: {
            action: 'continue',
            messages: [...messages, { role: 'user', content: userMessage }],
            lead_context: buildLeadContext(),
            lead_name: selectedLead?.contact_name || null,
            with_correction: true
          },
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: data?.result || '',
        correction: data?.correction || undefined
      }]);
      if (data?.correction) toast.info('💡 Dica disponível', { duration: 3000 });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  const getFeedback = async () => {
    if (messages.length < 4) {
      toast.error('Continue a conversa mais um pouco');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'objection_simulator',
          mentorado_id: mentoradoId,
          data: { action: 'feedback', messages, lead_context: buildLeadContext(), lead_name: selectedLead?.contact_name || null },
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setFeedback(data?.result || '');
      setShowFeedback(true);
      toast.success('Feedback gerado!');
    } catch (error) {
      console.error('Error getting feedback:', error);
      toast.error('Erro ao gerar feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="simulator" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Simulador
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico ({savedSimulations.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="simulator">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat Card */}
          <Card className="glass-card flex flex-col h-[650px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle>Simulador de Objeções</CardTitle>
                </div>
                <div className="flex gap-2">
                  {messages.length > 1 && (
                    <Button variant="outline" size="sm" onClick={saveSimulation} disabled={isSaving}>
                      <Save className={cn("h-4 w-4 mr-2", isSaving && "animate-pulse")} />
                      {currentSimulationId ? 'Atualizar' : 'Salvar'}
                    </Button>
                  )}
                  {messages.length > 0 && (
                    <Button variant="outline" size="sm" onClick={getFeedback} disabled={isLoading}>
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Feedback
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={startSimulation} disabled={isLoading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    {messages.length > 0 ? 'Novo' : 'Iniciar'}
                  </Button>
                </div>
              </div>
              <CardDescription>Pratique vendas com IA e salve para revisar</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col min-h-0">
              {/* Selectors */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs"><Users className="h-3 w-3 text-primary" />Lead</Label>
                    <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={isLoadingLeads ? "..." : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random">🎲 Genérico</SelectItem>
                        {leads.map((lead) => {
                          const hasQualification = !!(lead.ai_insights as any)?.behavioral_profile;
                          return (
                            <SelectItem key={lead.id} value={lead.id}>
                              <span className="flex items-center gap-1">
                                {lead.temperature === 'hot' ? '🔥' : lead.temperature === 'warm' ? '☀️' : '❄️'}
                                {lead.contact_name}
                                {hasQualification && <span className="text-primary text-[10px]">✓IA</span>}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs"><MessageSquare className="h-3 w-3 text-primary" />Fase</Label>
                    <Select value={selectedPhase} onValueChange={(v) => setSelectedPhase(v as NegotiationPhase)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {negotiationPhases.map((phase) => (
                          <SelectItem key={phase.id} value={phase.id}>
                            <span className="flex items-center gap-1">{phase.emoji} {phase.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                  <p>Selecione lead e fase, depois clique em "Iniciar"</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div key={index} className="space-y-2">
                          <div className={cn("flex gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                            {message.role === 'assistant' && (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <Bot className="h-4 w-4" />
                              </div>
                            )}
                            <div className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-2",
                              message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            )}>
                              <p className="text-sm">{message.content}</p>
                            </div>
                            {message.role === 'user' && (
                              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                            )}
                          </div>
                          {message.correction && message.role === 'assistant' && (
                            <div className="ml-11 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-warning mb-1">💡 Dica</p>
                                  <p className="text-muted-foreground text-xs">{message.correction}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><Bot className="h-4 w-4" /></div>
                          <div className="bg-muted rounded-2xl px-4 py-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
                              <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce delay-100" />
                              <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce delay-200" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Input placeholder="Sua resposta..." value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} disabled={isLoading} />
                    <Button onClick={sendMessage} disabled={isLoading || !input.trim()}><Send className="h-4 w-4" /></Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Feedback Card */}
          <Card className="glass-card h-[650px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Feedback do Coach
              </CardTitle>
              <CardDescription>Análise do seu desempenho</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {showFeedback && feedback ? (
                <div className="prose-ai-content max-h-[500px] overflow-y-auto pr-2">
                  <ReactMarkdown>{feedback}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mb-4 opacity-50" />
                  <p>Feedback aparecerá aqui</p>
                  <p className="text-sm">Converse e clique em "Feedback"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="history">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Simulações Salvas
            </CardTitle>
            <CardDescription>Reveja e continue suas práticas anteriores</CardDescription>
          </CardHeader>
          <CardContent>
            {savedSimulations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma simulação salva ainda</p>
                <p className="text-sm">Faça simulações e salve para revisitar</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {savedSimulations.map((sim) => {
                  const phase = negotiationPhases.find(p => p.id === sim.negotiation_phase);
                  return (
                    <Card key={sim.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{sim.lead_name || 'Prospect'}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(sim.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {phase?.emoji} {phase?.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {sim.messages.length} mensagens {sim.feedback ? '• Com feedback' : ''}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" className="flex-1" onClick={() => loadSimulation(sim)}>
                            <Play className="h-3 w-3 mr-1" />
                            Carregar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteSimulation(sim.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
