import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, Loader2, CheckCircle2, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  onProjectCreated?: (projectId: string) => void;
  compact?: boolean;
}

export function ProjectAgentDialog({ onProjectCreated }: Props) {
  const { activeMembership } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: 'Olá! 👋 Estou pronta pra te ajudar a montar seu projeto. Me conta: **qual é o objetivo principal?** O que você quer alcançar com esse projeto?',
        }]);
      }
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !activeMembership?.id) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            membership_id: activeMembership.id,
            tenant_id: activeMembership.tenant_id,
          }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error('Limite de requisições excedido.'); return; }
        if (resp.status === 402) { toast.error('Créditos de IA esgotados.'); return; }
        throw new Error('Request failed');
      }

      const data = await resp.json();

      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);

      if (data.created) {
        setCreated(true);
        qc.invalidateQueries({ queryKey: ['mentor-projects'] });
        qc.invalidateQueries({ queryKey: ['mentor-goals'] });
        if (data.project_id) {
          onProjectCreated?.(data.project_id);
        }
      }
    } catch (err) {
      console.error('Project agent error:', err);
      toast.error('Erro ao comunicar com a Elo');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Desculpe, houve um erro. Tente novamente.',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, activeMembership, qc, onProjectCreated]);

  const handleClose = () => {
    setOpen(false);
    if (created) {
      setMessages([]);
      setCreated(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => v ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 shadow-lg shadow-primary/20">
          <Sparkles className="h-4 w-4" />
          Criar com a Elo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh]">
        <DialogHeader className="p-4 pb-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-violet-500/5">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            Elo — Criação de Projeto
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 max-h-[50vh] min-h-[250px]" ref={scrollRef as any}>
          <div className="p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === 'user' && "flex-row-reverse")}>
                <div className={cn(
                  "w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px]",
                  msg.role === 'assistant'
                    ? "bg-gradient-to-br from-primary to-violet-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}>
                  {msg.role === 'assistant' ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                </div>
                <div className={cn(
                  "rounded-xl px-3 py-2 text-sm max-w-[85%]",
                  msg.role === 'assistant'
                    ? "bg-muted/50 text-foreground"
                    : "bg-primary text-primary-foreground"
                )}>
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 text-white animate-spin" />
                </div>
                <div className="bg-muted/50 rounded-xl px-3 py-2 text-sm text-muted-foreground">
                  Pensando...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-border/50 bg-card/50">
          {created ? (
            <Button onClick={handleClose} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Ir para o projeto
            </Button>
          ) : (
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Descreva seu projeto..."
                className="flex-1 text-sm"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
