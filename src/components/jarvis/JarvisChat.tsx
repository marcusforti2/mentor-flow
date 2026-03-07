import { useState, useRef, useEffect } from 'react';
import { Send, Square, Trash2, Bot, User, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { type JarvisMessage } from '@/hooks/useJarvis';
import ReactMarkdown from 'react-markdown';

interface Props {
  messages: JarvisMessage[];
  isLoading: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  onClear: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  toggle_automation: '⚡ Automação alterada',
  send_whatsapp: '📱 WhatsApp enviado',
  create_email_campaign: '📧 Campanha criada',
  create_calendar_event: '📅 Evento criado',
  run_automation: '🚀 Automação executada',
};

function getActionLabel(action: string) {
  const key = action.split(':')[0];
  const detail = action.split(':').slice(1).join(':');
  return `${ACTION_LABELS[key] || key}${detail ? `: ${detail}` : ''}`;
}

export function JarvisChat({ messages, isLoading, onSend, onStop, onClear }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              Olá, sou o Jarvis 🤖
            </h2>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Seu centro de comando inteligente. Posso gerenciar automações, enviar mensagens,
              criar campanhas, agendar eventos e analisar seus mentorados. O que precisa?
            </p>
            <div className="grid grid-cols-2 gap-2 mt-6 max-w-sm">
              {[
                '📊 Como estão meus mentorados?',
                '⚡ Ative todas as automações',
                '📱 Mande um WhatsApp motivacional',
                '📧 Crie uma campanha de email',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="text-xs text-left p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 mt-1">
                <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3",
              msg.role === 'user'
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 border border-border/30"
            )}>
              {/* Executed actions */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {msg.actions.map((action, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {getActionLabel(action)}
                    </Badge>
                  ))}
                </div>
              )}

              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none text-foreground [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_strong]:text-foreground [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg">
                  <ReactMarkdown>{msg.content || (msg.isStreaming ? '...' : '')}</ReactMarkdown>
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                  )}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="shrink-0 mt-1">
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="bg-muted/50 border border-border/30 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Processando...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-end gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={onClear}
              title="Nova conversa"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ao Jarvis... (Enter para enviar, Shift+Enter para nova linha)"
              className="min-h-[44px] max-h-32 resize-none pr-12 bg-muted/30 border-border/50"
              rows={1}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-7 w-7"
              onClick={isLoading ? onStop : handleSubmit}
              disabled={!isLoading && !input.trim()}
            >
              {isLoading ? <Square className="h-3 w-3" /> : <Send className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Jarvis pode executar ações reais: automações, WhatsApp, email e calendário.
        </p>
      </div>
    </div>
  );
}
