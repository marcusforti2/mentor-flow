import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Send, RefreshCw, User, Lightbulb, Users, ChevronDown, ChevronUp, Plus, MessageSquare, Trash2, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { buildQualificationContext } from '@/hooks/useLeadsWithQualification';
import type { LeadQualificationReport } from '@/lib/api/firecrawl';

interface VirtualMentorProps {
  mentoradoId: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SavedLead {
  id: string;
  contact_name: string;
  company: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  temperature: string | null;
  status: string | null;
  ai_insights: any;
  notes: string | null;
  updated_at: string | null;
}

const quickQuestions = [
  "Como lidar com a objeção 'está caro'?",
  "Qual a melhor abordagem para follow-up?",
  "Como qualificar um lead rapidamente?",
  "Dicas para fechar mais vendas este mês",
];

export function VirtualMentor({ mentoradoId }: VirtualMentorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Lead selection
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedLead, setSelectedLead] = useState<SavedLead | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [showLeadContext, setShowLeadContext] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!mentoradoId) return;
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, title, created_at, updated_at')
        .eq('membership_id', mentoradoId)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setConversations(data || []);
    } catch (e) {
      console.error('Error fetching conversations:', e);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [mentoradoId]);

  // Load conversations on mount
  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) { setMessages([]); return; }
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        setMessages((data || []).filter(m => m.role !== 'system') as Message[]);
      } catch (e) {
        console.error('Error loading messages:', e);
      }
    };
    loadMessages();
  }, [activeConversationId]);

  // Fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      if (!mentoradoId) return;
      setIsLoadingLeads(true);
      try {
        const { data, error } = await supabase
          .from('crm_prospections')
          .select('id, contact_name, company, contact_email, contact_phone, temperature, status, ai_insights, notes, updated_at')
          .eq('membership_id', mentoradoId)
          .order('updated_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setLeads(data || []);
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    fetchLeads();
  }, [mentoradoId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (leadId === 'none') { setSelectedLead(null); return; }
    const lead = leads.find((l) => l.id === leadId);
    setSelectedLead(lead || null);
    if (lead) {
      const hasQualification = !!(lead.ai_insights as any)?.behavioral_profile;
      toast.success(`Lead "${lead.contact_name}" selecionado${hasQualification ? ' (com qualificação)' : ''}`);
    }
  };

  const buildLeadContextString = (): string => {
    if (!selectedLead) return '';
    const enrichedLead = {
      ...selectedLead,
      ai_insights: selectedLead.ai_insights as LeadQualificationReport | null,
      hasQualification: !!(selectedLead.ai_insights as any)?.behavioral_profile,
    };
    return buildQualificationContext(enrichedLead);
  };

  const startNewConversation = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('chat_conversations').delete().eq('id', convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) startNewConversation();
      toast.success('Conversa excluída');
    } catch {
      toast.error('Erro ao excluir conversa');
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();
    const leadContext = buildLeadContextString();

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contextual-chat`;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          membership_id: mentoradoId,
          conversation_id: activeConversationId,
          message: text,
          lead_context: leadContext || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Limite de requisições excedido. Tente novamente em alguns segundos.');
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        if (response.status === 402) {
          toast.error('Créditos esgotados. Adicione créditos para continuar.');
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        throw new Error('Failed to start stream');
      }

      // Get conversation ID from header (for new conversations)
      const newConvId = response.headers.get('X-Conversation-Id');
      if (newConvId && !activeConversationId) {
        setActiveConversationId(newConvId);
        fetchConversations(); // Refresh sidebar
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (newMessages[lastIndex]?.role === 'assistant') {
                  newMessages[lastIndex] = { role: 'assistant', content: assistantContent };
                }
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (newMessages[lastIndex]?.role === 'assistant') {
                  newMessages[lastIndex] = { role: 'assistant', content: assistantContent };
                }
                return newMessages;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Error in chat:', error);
      toast.error('Erro ao enviar mensagem');
      setMessages((prev) => prev.filter((m) => m.content !== ''));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const hasQualification = !!(selectedLead?.ai_insights as any)?.behavioral_profile;

  return (
    <div className="flex gap-4 h-[700px] lg:h-[750px]">
      {/* Sidebar - Conversation History */}
      {showSidebar && (
        <Card className="glass-card w-64 shrink-0 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border/50">
            <Button onClick={startNewConversation} className="w-full gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Nova Conversa
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.length === 0 && !isLoadingConversations && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma conversa salva
                </p>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors text-sm",
                    activeConversationId === conv.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-foreground text-xs font-medium">{conv.title}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(conv.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => deleteConversation(conv.id, e)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Main Chat */}
      <Card className="glass-card flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:hidden"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">Mentor Virtual 24/7</CardTitle>
                <CardDescription className="text-xs">
                  Contextual • Conhece seu histórico completo
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Lead Selector — compact */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                <Users className="h-3 w-3" />
                Lead:
              </Label>
              <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder={isLoadingLeads ? "..." : "Sem lead específico"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem lead específico</SelectItem>
                  {leads.map((lead) => {
                    const hasQual = !!(lead.ai_insights as any)?.behavioral_profile;
                    return (
                      <SelectItem key={lead.id} value={lead.id}>
                        <div className="flex items-center gap-2">
                          {lead.temperature === 'hot' ? '🔥' : lead.temperature === 'warm' ? '☀️' : '❄️'}
                          <span>{lead.contact_name}</span>
                          {hasQual && <span className="text-primary text-[10px]">✓IA</span>}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedLead && (
              <div className="mt-2 p-2 rounded-lg bg-muted/30 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedLead.contact_name}</span>
                  {hasQualification && (
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => setShowLeadContext(!showLeadContext)}>
                      {showLeadContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
                {showLeadContext && hasQualification && (
                  <div className="mt-1 pt-1 border-t border-border/30 space-y-0.5 max-h-20 overflow-y-auto">
                    {selectedLead.ai_insights?.score && <p><span className="text-muted-foreground">Score:</span> {selectedLead.ai_insights.score}/100</p>}
                    {selectedLead.ai_insights?.summary && <p className="text-muted-foreground">{selectedLead.ai_insights.summary}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0 p-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2">Olá! Sou seu Mentor Virtual</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md leading-relaxed">
                Conheço seu perfil, progresso, CRM e histórico completo. Pergunte qualquer coisa!
              </p>

              <div className="w-full max-w-lg space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                  <Lightbulb className="h-3 w-3 text-primary" />
                  Perguntas rápidas:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedLead ? [
                    `Como abordar ${selectedLead.contact_name}?`,
                    `Objeções esperadas de ${selectedLead.contact_name}?`,
                    `Estratégia de follow-up para esse lead`,
                    `Como fechar com esse perfil?`,
                  ] : quickQuestions).map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 px-3 text-left justify-start hover:bg-primary/10 hover:border-primary/50"
                      onClick={() => sendMessage(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollRef}>
              <div className="space-y-4 pb-4">
                {messages.map((message, index) => (
                  <div key={index} className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-md">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[85%] rounded-2xl',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground px-4 py-2.5'
                        : 'bg-muted/80 px-4 py-3'
                    )}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none prose-invert prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-3 prose-li:text-foreground prose-headings:text-foreground prose-headings:font-display prose-strong:text-primary">
                          <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.content === '' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-11">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>Pensando...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite sua dúvida..."
              className="flex-1 h-10"
              disabled={isLoading}
            />
            <Button onClick={() => sendMessage()} disabled={isLoading || !input.trim()} size="icon" className="h-10 w-10 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
