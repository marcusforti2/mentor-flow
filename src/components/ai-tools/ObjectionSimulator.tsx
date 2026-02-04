import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageSquare, Send, RefreshCw, ClipboardCheck, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ObjectionSimulatorProps {
  mentoradoId: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ObjectionSimulator({ mentoradoId }: ObjectionSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startSimulation = async () => {
    setIsLoading(true);
    setMessages([]);
    setFeedback('');
    setShowFeedback(false);

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'objection_simulator',
          mentorado_id: mentoradoId,
          data: { action: 'start' },
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setMessages([{ role: 'assistant', content: data?.result || '' }]);
      toast.success('Simulação iniciada! O prospect está esperando...');
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
          },
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data?.result || '' }]);
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
      toast.success('Feedback gerado!');
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
      <Card className="glass-card flex flex-col h-[600px]">
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
            Pratique suas respostas com um prospect difícil simulado por IA
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p>Clique em "Iniciar" para começar</p>
              <p className="text-sm">A IA vai simular um prospect difícil</p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
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
                  placeholder="Digite sua resposta..."
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
      <Card className="glass-card h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Feedback do Coach</CardTitle>
          <CardDescription>
            Análise detalhada do seu desempenho na simulação
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {showFeedback && feedback ? (
            <div className="prose-ai-content max-h-[450px] overflow-y-auto pr-2">
              <ReactMarkdown>{feedback}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mb-4 opacity-50" />
              <p>O feedback aparecerá aqui</p>
              <p className="text-sm">Converse um pouco e clique em "Feedback"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
