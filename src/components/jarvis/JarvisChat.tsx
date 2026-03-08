import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, Trash2, Bot, User, CheckCircle2, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type JarvisMessage } from '@/hooks/useJarvis';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { JarvisOrb, type OrbState } from './JarvisOrb';

interface Props {
  messages: JarvisMessage[];
  isLoading: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  onClear: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  toggle_automation: '⚡ Automação',
  send_whatsapp: '📱 WhatsApp',
  create_email_campaign: '📧 Campanha',
  create_event: '📅 Evento criado',
  update_event: '📅 Evento atualizado',
  delete_event: '🗑️ Evento removido',
  run_automation: '🚀 Automação executada',
  navigate: '🧭 Navegando',
  invite_mentorado: '👤 Convite',
  update_mentorado: '✏️ Atualizado',
  suspend_mentorado: '⏸ Suspenso',
  reactivate_mentorado: '▶️ Reativado',
  send_email: '📧 Email',
  send_sos: '🆘 SOS',
  create_task: '✅ Tarefa',
  bulk_create_tasks: '✅ Tarefas',
  update_task: '✅ Tarefa movida',
  delete_task: '🗑️ Tarefa removida',
  create_lead: '🎯 Lead',
  update_lead: '🎯 Lead movido',
  delete_lead: '🗑️ Lead removido',
  create_prospection: '🎯 Prospecção',
  add_interaction: '💬 Interação CRM',
  toggle_trail: '📚 Trilha',
  generate_trail: '🤖 Trilha gerada',
  create_trail: '📚 Trilha criada',
  create_module: '📦 Módulo criado',
  create_lesson: '📝 Aula criada',
  complete_lesson: '✅ Aula concluída',
  create_playbook: '📖 Playbook',
  update_playbook: '📖 Playbook',
  generate_playbook: '🤖 Playbook gerado',
  award_badge: '🏆 Badge',
  create_badge: '🏆 Badge',
  create_reward: '🎁 Recompensa',
  toggle_popup: '🔔 Popup',
  create_popup: '🔔 Popup criado',
  toggle_email_flow: '📧 Fluxo',
  create_form: '📝 Formulário criado',
  add_question: '📝 Pergunta adicionada',
  toggle_form: '📝 Formulário',
  create_template: '📧 Template criado',
  revoke_invite: '🚫 Convite revogado',
  bulk_invite: '👥 Convites em massa',
  bulk_email: '📧 Emails em massa',
  bulk_lead_stage: '🎯 Leads movidos',
  report: '📊 Relatório',
  update_settings: '⚙️ Configuração',
  create_stage: '🎯 Etapa criada',
  create_stage_automation: '⚡ Automação pipeline',
  log_activity: '📝 Atividade registrada',
  resolve_alert: '✅ Alerta resolvido',
  create_behavioral_q: '🧠 Pergunta comportamental',
  toggle_wa_flow: '📱 Fluxo WA',
  set_availability: '📅 Disponibilidade',
  assign_mentor: '👥 Mentor atribuído',
  create_journey: '🗺️ Jornada criada',
  create_journey_stage: '🗺️ Etapa jornada',
  edge_fn: '⚡ Função executada',
  query: '🔍 Consulta',
  insert: '➕ Inserido',
  update: '✏️ Atualizado',
  delete: '🗑️ Removido',
};

function getActionLabel(action: string) {
  const key = action.split(':')[0];
  const detail = action.split(':').slice(1).join(':');
  return `${ACTION_LABELS[key] || key}${detail ? `: ${detail}` : ''}`;
}

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

const HAS_SPEECH = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export function JarvisChat({ messages, isLoading, onSend, onStop, onClear }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice state
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const lastSpokenMsgRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Native STT
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRelistenRef = useRef(true);
  const hasAutoStarted = useRef(false);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ====== NATIVE SPEECH RECOGNITION (instant, no token) ======
  const startListening = useCallback(() => {
    if (!HAS_SPEECH || isListening || isLoading || isSpeaking) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    finalTranscriptRef.current = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }

      if (final) {
        finalTranscriptRef.current = final;
      }

      setInput(final || interim);

      // Auto-send after 1.5s of silence following final result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (final) {
        silenceTimerRef.current = setTimeout(() => {
          if (finalTranscriptRef.current.trim()) {
            onSend(finalTranscriptRef.current.trim());
            setInput('');
            finalTranscriptRef.current = '';
            // Stop current recognition session
            try { recognition.stop(); } catch {}
          }
        }, 1200);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      // Send any pending final transcript
      if (finalTranscriptRef.current.trim()) {
        onSend(finalTranscriptRef.current.trim());
        setInput('');
        finalTranscriptRef.current = '';
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      console.error('STT error:', e.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, isLoading, isSpeaking, onSend]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Auto-start on mount
  useEffect(() => {
    if (!hasAutoStarted.current && HAS_SPEECH) {
      hasAutoStarted.current = true;
      const timer = setTimeout(() => startListening(), 400);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop mic while loading/speaking
  useEffect(() => {
    if (isLoading || isSpeaking) {
      stopListening();
    }
  }, [isLoading, isSpeaking, stopListening]);

  // ====== NATIVE TTS (pt-BR priority) ======
  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis?.getVoices() || [];
    
    // 1st: Portuguese Brazilian voices (best quality ones first)
    const ptBrVoices = voices.filter(v => v.lang === 'pt-BR' || v.lang === 'pt_BR');
    if (ptBrVoices.length > 0) {
      // Prefer Google or Microsoft neural voices
      const premium = ptBrVoices.find(v => 
        v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Luciana')
      );
      return premium || ptBrVoices[0];
    }
    
    // 2nd: Any Portuguese voice
    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) return ptVoice;
    
    // 3rd: English fallback
    return voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0] || null;
  }, []);

  // Preload voices (Chrome loads async)
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    if (!ttsEnabled) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.isStreaming) return;
    if (lastSpokenMsgRef.current === lastMsg.id) return;

    lastSpokenMsgRef.current = lastMsg.id;
    const text = stripMarkdown(lastMsg.content);
    if (!text || text.length < 5) {
      if (autoRelistenRef.current) setTimeout(() => startListening(), 200);
      return;
    }
    speakNative(text);
  }, [messages, ttsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ttsEnabled) stopAudio();
  }, [ttsEnabled]);

  const speakNative = (text: string) => {
    stopAudio();
    stopListening();
    setIsSpeaking(false);

    if (!window.speechSynthesis) {
      if (autoRelistenRef.current && ttsEnabled) setTimeout(() => startListening(), 250);
      return;
    }

    window.speechSynthesis.cancel();

    // Limit text for faster processing
    const shortText = text.slice(0, 1500);
    const utterance = new SpeechSynthesisUtterance(shortText);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1.1; // Slightly faster for snappier feel
    utterance.pitch = 0.9;
    utterance.volume = 1;
    utterance.lang = voice?.lang || 'pt-BR';

    utterance.onstart = () => { setIsSpeaking(true); setTtsLoading(false); };
    utterance.onend = () => {
      setIsSpeaking(false);
      if (autoRelistenRef.current && ttsEnabled) setTimeout(() => startListening(), 200);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setTtsLoading(false);
      if (autoRelistenRef.current && ttsEnabled) setTimeout(() => startListening(), 200);
    };

    // Start speaking immediately - set loading false right away since native is instant
    setTtsLoading(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Also cancel native speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setTtsLoading(false);
  };

  const toggleListening = useCallback(() => {
    if (isListening) {
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
    stopListening();
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
            {/* Animated Orb */}
            <div className="mb-8">
              <JarvisOrb
                state={
                  isListening ? 'listening' :
                  isLoading ? 'processing' :
                  isSpeaking ? 'speaking' :
                  'idle' as OrbState
                }
                size="lg"
                onClick={toggleListening}
              />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2 mt-4">
              Olá, sou a Elo ✨
            </h2>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Sua assistente inteligente. Toque no orb ou fale diretamente.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-6 max-w-sm">
              {[
                '📊 Gere meu relatório mensal',
                '⚡ Ative todas as automações',
                '👥 Convide 3 mentorados',
                '📝 Crie um formulário de feedback',
                '📱 Mande WhatsApp motivacional pra todos',
                '📖 Gere um playbook de vendas',
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
              {msg.agent && msg.agent !== 'jarvis' && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1">
                    <Bot className="h-2.5 w-2.5" />
                    {({'crm':'💼 CRM','trails':'🎓 Trails','playbooks':'📖 Playbooks','calendar':'📅 Calendar','email':'✉️ Email','whatsapp':'📱 WhatsApp','cs':'🎯 CS','forms':'📋 Forms','popups':'🪧 Popups','gamification':'🏆 Gamification','analytics':'📊 Analytics','automation':'⚡ Automation','meetings':'🎥 Meetings','files':'📁 Files','branding':'🎨 Branding','community':'💬 Community','onboarding':'🚀 Onboarding','ai_tools':'🧠 AI Tools'} as Record<string,string>)[msg.agent] || msg.agent} Agent
                  </Badge>
                </div>
              )}
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
            title={isSpeaking ? "Parar áudio" : ttsEnabled ? "Desativar voz" : "Ativar voz"}
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
              placeholder={isListening ? "🎤 Escutando... fale agora" : "Fale com a Elo... (Enter para enviar)"}
              className={cn(
                "min-h-[44px] max-h-32 resize-none pr-20 bg-muted/30 border-border/50",
                isListening && "border-primary/50 ring-1 ring-primary/30"
              )}
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {HAS_SPEECH && (
                <Button
                  size="icon"
                  variant={isListening ? "default" : "ghost"}
                  className={cn(
                    "h-7 w-7",
                    isListening && "bg-destructive hover:bg-destructive/90 animate-pulse"
                  )}
                  onClick={toggleListening}
                  title={isListening ? "Parar de escutar" : "Falar com a Elo"}
                >
                  {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                </Button>
              )}
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
            ? "🎤 Escutando... fale agora, envio automático ao detectar pausa"
            : isSpeaking
            ? "🔊 Elo falando... voltarei a ouvir quando terminar"
            : ttsEnabled
            ? "🎙️ Modo conversação ativo — falo e ouço automaticamente"
            : "Elo pronta — microfone para falar, alto-falante para ouvir respostas."
          }
        </p>
      </div>
    </div>
  );
}
