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
import { Bot, Send, RefreshCw, User, Lightbulb, Users, ChevronDown, ChevronUp } from 'lucide-react';
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
  
  // Lead selection
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedLead, setSelectedLead] = useState<SavedLead | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [showLeadContext, setShowLeadContext] = useState(false);

  // Fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      if (!mentoradoId) return;
      setIsLoadingLeads(true);
      try {
        const { data, error } = await supabase
          .from('crm_prospections')
          .select('id, contact_name, company, contact_email, contact_phone, temperature, status, ai_insights, notes, updated_at')
          .eq('mentorado_id', mentoradoId)
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
    if (leadId === 'none') {
      setSelectedLead(null);
      return;
    }
    const lead = leads.find((l) => l.id === leadId);
    setSelectedLead(lead || null);
    if (lead) {
      const hasQualification = !!(lead.ai_insights as any)?.behavioral_profile;
      toast.success(`Lead "${lead.contact_name}" selecionado${hasQualification ? ' (com qualificação)' : ''}`);
    }
  };

  const buildLeadContextString = (): string => {
    if (!selectedLead) return '';
    
    // Adapta para o formato esperado pelo buildQualificationContext
    const enrichedLead = {
      ...selectedLead,
      ai_insights: selectedLead.ai_insights as LeadQualificationReport | null,
      hasQualification: !!(selectedLead.ai_insights as any)?.behavioral_profile
    };
    
    return buildQualificationContext(enrichedLead);
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Build context with lead info if selected
    const leadContext = buildLeadContextString();

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tools`;
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          tool: 'virtual_mentor',
          mentorado_id: mentoradoId,
          stream: true,
          data: {
            messages: [...messages, userMessage],
            leadContext: leadContext || undefined,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Limite de requisições excedido. Tente novamente em alguns segundos.');
          return;
        }
        if (response.status === 402) {
          toast.error('Créditos esgotados. Adicione créditos para continuar.');
          return;
        }
        throw new Error('Failed to start stream');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      // Add empty assistant message
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
      if ((error as Error).name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Error in chat:', error);
      toast.error('Erro ao enviar mensagem');
      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((m) => m.content !== ''));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setInput('');
  };

  const hasQualification = !!(selectedLead?.ai_insights as any)?.behavioral_profile;

  return (
    <Card className="glass-card flex flex-col h-[700px] lg:h-[750px]">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl font-display">Mentor Virtual 24/7</CardTitle>
              <CardDescription className="text-sm">
                Seu coach de vendas de alto ticket
              </CardDescription>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearChat} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
        
        {/* Lead Selector */}
        <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Contexto de Lead (opcional)
              </Label>
              <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={isLoadingLeads ? "Carregando..." : "Selecione um lead para contextualizar"} />
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
                          {lead.company && <span className="text-muted-foreground text-xs">• {lead.company}</span>}
                          {hasQual && <span className="text-primary text-[10px]">✓IA</span>}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedLead && (
            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{selectedLead.contact_name}</span>
                  {hasQualification && (
                    <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                      ✓ Qualificado
                    </Badge>
                  )}
                </div>
                {hasQualification && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowLeadContext(!showLeadContext)}
                  >
                    {showLeadContext ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                    {showLeadContext ? 'Ocultar' : 'Ver dados'}
                  </Button>
                )}
              </div>
              {selectedLead.company && (
                <p className="text-xs text-muted-foreground">{selectedLead.company}</p>
              )}
              {showLeadContext && hasQualification && (
                <div className="mt-2 pt-2 border-t border-border/30 text-xs space-y-1 max-h-32 overflow-y-auto">
                  {selectedLead.ai_insights?.behavioral_profile?.primary_style && (
                    <p><span className="text-muted-foreground">DISC:</span> {selectedLead.ai_insights.behavioral_profile.primary_style.toUpperCase()}</p>
                  )}
                  {selectedLead.ai_insights?.score && (
                    <p><span className="text-muted-foreground">Score:</span> {selectedLead.ai_insights.score}/100</p>
                  )}
                  {selectedLead.ai_insights?.summary && (
                    <p><span className="text-muted-foreground">Resumo:</span> {selectedLead.ai_insights.summary}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-4 lg:p-6">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-display font-semibold mb-3">Olá! Sou seu Mentor Virtual</h3>
            <p className="text-base text-muted-foreground mb-8 max-w-lg leading-relaxed">
              {selectedLead 
                ? `Posso te ajudar com estratégias específicas para ${selectedLead.contact_name}. O que você precisa?`
                : 'Estou aqui para ajudar com estratégias de vendas, scripts, objeções e tudo sobre seu negócio. Selecione um lead para contexto ou pergunte qualquer coisa!'}
            </p>

            <div className="w-full max-w-xl space-y-3">
              <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                <Lightbulb className="h-4 w-4 text-warning" />
                Perguntas rápidas:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(selectedLead ? [
                  `Como abordar ${selectedLead.contact_name}?`,
                  `Quais objeções esperar de ${selectedLead.contact_name}?`,
                  `Estratégia de follow-up para esse lead`,
                  `Como fechar com esse perfil?`,
                ] : quickQuestions).map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="lg"
                    className="text-sm h-auto py-3 px-4 text-left justify-start hover:bg-primary/10 hover:border-primary/50 transition-colors"
                    onClick={() => sendMessage(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollRef}>
              <div className="space-y-6 pb-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex gap-4',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-md">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[85%] lg:max-w-[75%] rounded-2xl',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground px-5 py-3'
                          : 'bg-muted/80 px-5 py-4'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-base max-w-none prose-invert prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4 prose-li:text-foreground prose-li:mb-2 prose-headings:text-foreground prose-headings:font-display prose-headings:mb-3 prose-headings:mt-4 prose-ul:my-3 prose-ol:my-3 prose-strong:text-primary prose-strong:font-semibold">
                          <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-base leading-relaxed">{message.content}</p>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="bg-muted/80 rounded-2xl px-5 py-4">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 bg-foreground/50 rounded-full animate-bounce" />
                        <span className="w-2.5 h-2.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:100ms]" />
                        <span className="w-2.5 h-2.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:200ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-3 mt-4 pt-4 border-t border-border/50">
              <Input
                placeholder={selectedLead ? `Pergunte sobre ${selectedLead.contact_name}...` : "Digite sua pergunta..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="text-base h-12"
              />
              <Button 
                onClick={() => sendMessage()} 
                disabled={isLoading || !input.trim()}
                size="lg"
                className="h-12 px-5"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
