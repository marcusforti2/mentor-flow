import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, Trash2, Bot, User, CheckCircle2, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type JarvisMessage } from '@/hooks/useJarvis';
import { useScribe } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  create_event: '📅 Evento criado',
  update_event: '📅 Evento atualizado',
  delete_event: '🗑️ Evento removido',
  run_automation: '🚀 Automação executada',
  navigate: '🧭 Navegando',
  invite_mentorado: '👤 Convite enviado',
  update_mentorado: '✏️ Mentorado atualizado',
  suspend_mentorado: '⏸ Mentorado suspenso',
  reactivate_mentorado: '▶️ Mentorado reativado',
  send_email: '📧 Email enviado',
  send_sos: '🆘 SOS enviado',
  create_task: '✅ Tarefa criada',
  bulk_create_tasks: '✅ Tarefas criadas',
  update_task: '✅ Tarefa movida',
  create_lead: '🎯 Lead criado',
  update_lead: '🎯 Lead atualizado',
  create_prospection: '🎯 Prospecção criada',
  toggle_trail: '📚 Trilha alterada',
  generate_trail: '🤖 Trilha gerada',
  create_playbook: '📖 Playbook criado',
  update_playbook: '📖 Playbook atualizado',
  award_badge: '🏆 Badge concedido',
  create_badge: '🏆 Badge criado',
  toggle_popup: '🔔 Popup alterado',
  toggle_email_flow: '📧 Fluxo alterado',
};

function getActionLabel(action: string) {
  const key = action.split(':')[0];
  const detail = action.split(':').slice(1).join(':');
  return `${ACTION_LABELS[key] || key}${detail ? `: ${detail}` : ''}`;
}

// Strip markdown for TTS
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[>\-•]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim();
}

export function JarvisChat({ messages, isLoading, onSend, onStop, onClear }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice state
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const lastSpokenMsgRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ElevenLabs STT
  const [isListening, setIsListening] = useState(false);
  const [sttConnected, setSttConnected] = useState(false);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime' as any,
    commitStrategy: 'vad' as any,
    onPartialTranscript: (data: any) => {
      if (data.text) setInput(data.text);
    },
    onCommittedTranscript: (data: any) => {
      if (data.text?.trim()) {
        onSend(data.text.trim());
        setInput('');
        stopListening();
      }
    },
  });

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ElevenLabs TTS: speak new assistant messages
  useEffect(() => {
    if (!ttsEnabled) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.isStreaming) return;
    if (lastSpokenMsgRef.current === lastMsg.id) return;

    lastSpokenMsgRef.current = lastMsg.id;
    const text = stripMarkdown(lastMsg.content);
    if (!text || text.length < 5) return;

    speakWithElevenLabs(text);
  }, [messages, ttsEnabled]);

  // Stop audio when TTS disabled
  useEffect(() => {
    if (!ttsEnabled) {
      stopAudio();
    }
  }, [ttsEnabled]);

  const speakWithElevenLabs = async (text: string) => {
    stopAudio();
    setTtsLoading(true);
    setIsSpeaking(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'TTS failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => { setIsSpeaking(true); setTtsLoading(false); };
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setIsSpeaking(false); setTtsLoading(false); };

      await audio.play();
    } catch (err: any) {
      console.error('ElevenLabs TTS error:', err);
      setTtsLoading(false);
      setIsSpeaking(false);
      // Fallback silently - don't toast on every message
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setTtsLoading(false);
  };

  // STT: start/stop listening with ElevenLabs Scribe
  const startListening = useCallback(async () => {
    try {
      // Get scribe token
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) {
        toast.error('Erro ao iniciar reconhecimento de voz');
        return;
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setIsListening(true);
      setSttConnected(true);
    } catch (err) {
      console.error('STT start error:', err);
      toast.error('Não foi possível acessar o microfone');
    }
  }, [scribe]);

  const stopListening = useCallback(() => {
    if (sttConnected) {
      scribe.disconnect();
      setSttConnected(false);
    }
    setIsListening(false);
  }, [scribe, sttConnected]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      // If there's partial text, send it before stopping
      if (input.trim()) {
        onSend(input.trim());
        setInput('');
      }
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, input, onSend, startListening, stopListening]);

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
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Mic className="h-3 w-3" /> Clique no microfone para falar comigo
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

          {/* TTS toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0 transition-colors relative",
              ttsEnabled ? "text-primary bg-primary/10" : "text-muted-foreground"
            )}
            onClick={() => {
              if (isSpeaking) { stopAudio(); return; }
              setTtsEnabled(!ttsEnabled);
            }}
            title={isSpeaking ? "Parar áudio" : ttsEnabled ? "Desativar voz ElevenLabs" : "Ativar voz ElevenLabs"}
          >
            {ttsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSpeaking ? (
              <Volume2 className="h-4 w-4 animate-pulse" />
            ) : ttsEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "🎤 Escutando com ElevenLabs..." : "Pergunte ao Jarvis... (Enter para enviar)"}
              className={cn(
                "min-h-[44px] max-h-32 resize-none pr-20 bg-muted/30 border-border/50",
                isListening && "border-primary/50 ring-1 ring-primary/30"
              )}
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {/* Mic button - ElevenLabs STT */}
              <Button
                size="icon"
                variant={isListening ? "default" : "ghost"}
                className={cn(
                  "h-7 w-7",
                  isListening && "bg-destructive hover:bg-destructive/90 animate-pulse"
                )}
                onClick={toggleListening}
                title={isListening ? "Parar de escutar" : "Falar com Jarvis (ElevenLabs)"}
              >
                {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
              {/* Send / Stop button */}
              <Button
                size="icon"
                className="h-7 w-7"
                onClick={isLoading ? onStop : handleSubmit}
                disabled={!isLoading && !input.trim()}
              >
                {isLoading ? <Square className="h-3 w-3" /> : <Send className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {isListening
            ? "🎤 ElevenLabs Scribe ativo — fale agora, a mensagem será enviada ao detectar pausa"
            : isSpeaking
            ? "🔊 Jarvis falando via ElevenLabs..."
            : "Jarvis com voz ElevenLabs — microfone para falar, alto-falante para ouvir respostas."
          }
        </p>
      </div>
    </div>
  );
}
