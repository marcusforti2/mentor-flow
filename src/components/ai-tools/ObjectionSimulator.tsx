import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageSquare, Send, RefreshCw, ClipboardCheck, User, Bot, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ObjectionSimulatorProps {
  mentoradoId: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  correction?: string; // Correção em tempo real quando o usuário erra
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const fetchLeads = async () => {
      if (!mentoradoId) return;
      setIsLoadingLeads(true);
      
      try {
        const { data } = await supabase
          .from('crm_prospections')
          .select('id, contact_name, company, contact_email, temperature, status, ai_insights, notes')
          .eq('mentorado_id', mentoradoId)
          .order('updated_at', { ascending: false })
          .limit(50);
        
        if (data) setLeads(data);
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    
    fetchLeads();
  }, [mentoradoId]);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    
    if (leadId === 'random') {
      setSelectedLead(null);
      return;
    }
    
    const lead = leads.find(l => l.id === leadId);
    setSelectedLead(lead || null);
    
    if (lead) {
      toast.success(`Lead "${lead.contact_name}" selecionado para simulação`);
    }
  };

  const buildLeadContext = (): string => {
    if (!selectedLead) return '';
    
    const parts: string[] = [];
    parts.push(`Nome do lead: ${selectedLead.contact_name}`);
    if (selectedLead.company) parts.push(`Empresa: ${selectedLead.company}`);
    
    if (selectedLead.temperature) {
      const tempMap: Record<string, string> = {
        hot: 'Quente (interessado, pronto para comprar)',
        warm: 'Morno (curioso mas com ressalvas)',
        cold: 'Frio (cético, muitas objeções)'
      };
      parts.push(`Temperatura: ${tempMap[selectedLead.temperature] || selectedLead.temperature}`);
    }
    
    if (selectedLead.ai_insights) {
      const insights = selectedLead.ai_insights;
      if (insights.pain_points?.length) {
        parts.push(`Dores conhecidas: ${insights.pain_points.join(', ')}`);
      }
      if (insights.objections?.length) {
        parts.push(`Objeções prováveis: ${insights.objections.join(', ')}`);
      }
      if (insights.personality_traits?.length) {
        parts.push(`Perfil comportamental: ${insights.personality_traits.join(', ')}`);
      }
    }
    
    if (selectedLead.notes) parts.push(`Contexto adicional: ${selectedLead.notes}`);
    
    return parts.join('\n');
  };

  const startSimulation = async () => {
    setIsLoading(true);
    setMessages([]);
    setFeedback('');
    setShowFeedback(false);

    const leadContext = buildLeadContext();

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'objection_simulator',
          mentorado_id: mentoradoId,
          data: { 
            action: 'start',
            lead_context: leadContext,
            lead_name: selectedLead?.contact_name || null
          },
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setMessages([{ role: 'assistant', content: data?.result || '' }]);
      toast.success(selectedLead 
        ? `Simulando conversa com ${selectedLead.contact_name}...` 
        : 'Simulação iniciada com prospect genérico!');
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

    const leadContext = buildLeadContext();

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'objection_simulator',
          mentorado_id: mentoradoId,
          data: {
            action: 'continue',
            messages: [...messages, { role: 'user', content: userMessage }],
            lead_context: leadContext,
            lead_name: selectedLead?.contact_name || null,
            with_correction: true // Pedir correção em tempo real
          },
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Se a IA retornou correção junto com a resposta
      const newMessage: Message = { 
        role: 'assistant', 
        content: data?.result || '',
        correction: data?.correction || undefined
      };
      
      setMessages((prev) => [...prev, newMessage]);
      
      // Se teve correção, mostrar toast
      if (data?.correction) {
        toast.info('💡 Dica de melhoria disponível', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  const getFeedback = async () => {
    if (messages.length < 4) {
      toast.error('Continue a conversa mais um pouco para receber feedback');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'objection_simulator',
          mentorado_id: mentoradoId,
          data: {
            action: 'feedback',
            messages,
            lead_context: buildLeadContext(),
            lead_name: selectedLead?.contact_name || null
          },
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setFeedback(data?.result || '');
      setShowFeedback(true);
      toast.success('Feedback completo gerado!');
    } catch (error) {
      console.error('Error getting feedback:', error);
      toast.error('Erro ao gerar feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
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
              {messages.length > 0 && (
                <Button variant="outline" size="sm" onClick={getFeedback} disabled={isLoading}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Feedback
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={startSimulation} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                {messages.length > 0 ? 'Reiniciar' : 'Iniciar'}
              </Button>
            </div>
          </div>
          <CardDescription>
            Pratique suas vendas com um lead real simulado por IA
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* Lead Selector - always visible at top */}
          <div className="space-y-2 mb-4">
            <Label className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              Selecione um lead para simular
            </Label>
            <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingLeads ? "Carregando..." : "Escolha um lead do CRM"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">🎲 Prospect genérico (aleatório)</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{lead.contact_name}</span>
                      {lead.company && <span className="text-muted-foreground">• {lead.company}</span>}
                      {lead.temperature && (
                        <Badge variant="outline" className="text-xs">
                          {lead.temperature === 'hot' ? '🔥' : lead.temperature === 'warm' ? '☀️' : '❄️'}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedLead && (
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                <p className="font-medium text-foreground">Simulando: {selectedLead.contact_name}</p>
                {selectedLead.temperature && (
                  <p className="text-muted-foreground">
                    {selectedLead.temperature === 'hot' ? 'Lead quente - mais receptivo' : 
                     selectedLead.temperature === 'warm' ? 'Lead morno - tem interesse mas com dúvidas' : 
                     'Lead frio - muitas objeções esperadas'}
                  </p>
                )}
              </div>
            )}
          </div>

          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p>Selecione um lead e clique em "Iniciar"</p>
              <p className="text-sm">A IA vai simular esse lead específico</p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={index} className="space-y-2">
                      <div
                        className={cn(
                          "flex gap-3",
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.role === 'assistant' && (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2",
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        {message.role === 'user' && (
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                      
                      {/* Correção em tempo real */}
                      {message.correction && message.role === 'assistant' && (
                        <div className="ml-11 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-warning mb-1">💡 Dica do Coach</p>
                              <p className="text-muted-foreground text-xs">{message.correction}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
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
                <Input
                  placeholder="Digite sua resposta de vendas..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
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
          <CardDescription>
            Análise completa do seu desempenho na simulação
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {showFeedback && feedback ? (
            <div className="prose-ai-content max-h-[500px] overflow-y-auto pr-2">
              <ReactMarkdown>{feedback}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mb-4 opacity-50" />
              <p>O feedback completo aparecerá aqui</p>
              <p className="text-sm">Converse um pouco e clique em "Feedback"</p>
              <p className="text-xs mt-2 text-primary">💡 Dicas em tempo real aparecem durante a conversa</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
