import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Mic, MicOff, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useJarvis, type JarvisMessage } from '@/hooks/useJarvis';
import { useScribe } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

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

export function JarvisFloatingOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const jarvis = useJarvis();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice state (overlay mode)
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const lastSpokenMsgRef = useRef<string | null>(null);

  const hasSpeechRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [input, setInput] = useState('');

  // ===== STEALTH VOICE MODE =====
  const [stealthActive, setStealthActive] = useState(false);
  const [stealthListening, setStealthListening] = useState(false);
  const [stealthSttConnected, setStealthSttConnected] = useState(false);
  const [stealthResponse, setStealthResponse] = useState<string | null>(null);
  const [stealthPartial, setStealthPartial] = useState('');
  const [stealthSpeaking, setStealthSpeaking] = useState(false);
  const stealthAudioRef = useRef<HTMLAudioElement | null>(null);
  const stealthLastSpokenRef = useRef<string | null>(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stealthConnectingRef = useRef(false);

  const stealthScribe = useScribe({
    modelId: 'scribe_v2_realtime' as any,
    commitStrategy: 'vad' as any,
    onPartialTranscript: (data: any) => {
      if (data.text) setStealthPartial(data.text);
    },
    onCommittedTranscript: (data: any) => {
      if (data.text?.trim()) {
        setStealthPartial('');
        stealthStopListening();
        jarvis.sendMessage(data.text.trim());
      }
    },
  });

  const stealthStartListening = useCallback(async () => {
    if (stealthConnectingRef.current || stealthListening) return;
    stealthConnectingRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) { toast.error('Erro ao iniciar microfone'); return; }
      await stealthScribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      setStealthListening(true);
      setStealthSttConnected(true);
    } catch (err) {
      console.error('Stealth STT error:', err);
      toast.error('Não foi possível acessar o microfone');
      setStealthActive(false);
    } finally {
      stealthConnectingRef.current = false;
    }
  }, [stealthScribe, stealthListening]);

  const stealthStopListening = useCallback(() => {
    if (stealthSttConnected) {
      stealthScribe.disconnect();
      setStealthSttConnected(false);
    }
    setStealthListening(false);
  }, [stealthScribe, stealthSttConnected]);

  const deactivateStealth = useCallback(() => {
    stealthStopListening();
    if (stealthAudioRef.current) {
      stealthAudioRef.current.pause();
      stealthAudioRef.current = null;
    }
    setStealthActive(false);
    setStealthResponse(null);
    setStealthPartial('');
    setStealthSpeaking(false);
  }, [stealthStopListening]);

  // Auto-start listening when stealth activates
  useEffect(() => {
    if (stealthActive && !stealthListening && !jarvis.isLoading && !stealthSpeaking) {
      stealthStartListening();
    }
  }, [stealthActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for Jarvis response in stealth mode
  useEffect(() => {
    if (!stealthActive) return;
    const lastMsg = jarvis.messages[jarvis.messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.isStreaming) return;
    if (stealthLastSpokenRef.current === lastMsg.id) return;
    stealthLastSpokenRef.current = lastMsg.id;

    const text = stripMarkdown(lastMsg.content);
    setStealthResponse(lastMsg.content);

    // Auto-hide response after 8s
    setTimeout(() => setStealthResponse(null), 8000);

    // TTS
    if (text && text.length >= 5) {
      stealthSpeakTTS(text);
    } else {
      // No TTS, restart listening
      setTimeout(() => stealthStartListening(), 500);
    }
  }, [jarvis.messages, stealthActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const stealthSpeakTTS = async (text: string) => {
    setStealthSpeaking(true);
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
      if (!response.ok) throw new Error('TTS failed');
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      stealthAudioRef.current = audio;
      audio.onended = () => {
        setStealthSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        // Auto-restart listening
        if (stealthActive) {
          setTimeout(() => stealthStartListening(), 300);
        }
      };
      audio.onerror = () => {
        setStealthSpeaking(false);
        if (stealthActive) setTimeout(() => stealthStartListening(), 300);
      };
      await audio.play();
    } catch {
      setStealthSpeaking(false);
      if (stealthActive) setTimeout(() => stealthStartListening(), 300);
    }
  };

  // Handle FAB clicks: double-click = stealth, single = open overlay
  const handleFabClick = useCallback(() => {
    if (stealthActive) {
      deactivateStealth();
      return;
    }

    clickCountRef.current += 1;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (clickCountRef.current >= 2) {
      clickCountRef.current = 0;
      // Double-click → stealth mode
      setStealthActive(true);
      toast('🎤 Modo voz ativado — fale com o Jarvis', { duration: 2000 });
    } else {
      clickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          setIsOpen(true);
        }
        clickCountRef.current = 0;
      }, 300);
    }
  }, [stealthActive, deactivateStealth]);

  // Global hotkey: Ctrl+Alt+J or Cmd+Alt+J
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'j') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
      if (e.key === 'Escape' && stealthActive) {
        deactivateStealth();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, stealthActive, deactivateStealth]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [jarvis.messages]);

  // Handle navigation actions from Jarvis responses
  useEffect(() => {
    const lastMsg = jarvis.messages[jarvis.messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.isStreaming) return;
    if (!lastMsg.actions) return;

    for (const action of lastMsg.actions) {
      if (action.startsWith('navigate:')) {
        const page = action.split(':')[1];
        const routeMap: Record<string, string> = {
          dashboard: '/mentor',
          mentorados: '/mentor/mentorados',
          'jornada-cs': '/mentor/jornada-cs',
          crm: '/mentor/crm',
          formularios: '/mentor/formularios',
          trilhas: '/mentor/trilhas',
          playbooks: '/mentor/playbooks',
          calendario: '/mentor/calendario',
          emails: '/mentor/emails',
          whatsapp: '/mentor/whatsapp',
          popups: '/mentor/popups',
          sos: '/mentor/sos',
          automacoes: '/mentor/automacoes',
          relatorios: '/mentor/relatorios',
          perfil: '/mentor/perfil',
          'propriedade-intelectual': '/mentor/propriedade-intelectual',
          'onboarding-builder': '/mentor/onboarding-builder',
          'dev-tools': '/mentor/dev-tools',
          'ferramentas-ia': '/membro/ferramentas-ia',
        };
        const route = routeMap[page];
        if (route) {
          setTimeout(() => {
            navigate(route);
            setIsOpen(false);
          }, 1500);
        }
      }
    }
  }, [jarvis.messages, navigate]);

  // Overlay TTS (browser native, only when overlay is open)
  useEffect(() => {
    if (!ttsEnabled || !hasSpeechSynthesis) return;
    const lastMsg = jarvis.messages[jarvis.messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.isStreaming) return;
    if (lastSpokenMsgRef.current === lastMsg.id) return;
    lastSpokenMsgRef.current = lastMsg.id;
    const text = stripMarkdown(lastMsg.content);
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt') && v.name.toLowerCase().includes('google')) ||
                    voices.find(v => v.lang.startsWith('pt-BR')) ||
                    voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) utterance.voice = ptVoice;
    window.speechSynthesis.speak(utterance);
  }, [jarvis.messages, ttsEnabled, hasSpeechSynthesis]);

  // Overlay STT
  const toggleListening = useCallback(() => {
    if (!hasSpeechRecognition) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interim = t;
      }
      setInput(finalTranscript || interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        jarvis.sendMessage(finalTranscript.trim());
        setInput('');
        finalTranscript = '';
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, hasSpeechRecognition, jarvis]);

  const handleSubmit = () => {
    if (!input.trim() || jarvis.isLoading) return;
    jarvis.sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  if (!isOpen) {
    return (
      <>
        {/* Stealth mode floating indicators */}
        {stealthActive && (
          <>
            {/* Listening indicator */}
            {stealthListening && (
              <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 bg-card/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl px-4 py-2.5 shadow-2xl shadow-purple-500/20 animate-in slide-in-from-right-5 duration-300">
                <div className="relative">
                  <Mic className="h-4 w-4 text-purple-400" />
                  <div className="absolute -inset-1 rounded-full border border-purple-400/40 animate-ping" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {stealthPartial || 'Escutando...'}
                </span>
              </div>
            )}

            {/* Loading indicator */}
            {jarvis.isLoading && !stealthListening && (
              <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 bg-card/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl px-4 py-2.5 shadow-2xl shadow-purple-500/20 animate-in slide-in-from-right-5 duration-300">
                <Bot className="h-4 w-4 text-purple-400 animate-pulse" />
                <span className="text-xs text-muted-foreground">Processando...</span>
              </div>
            )}

            {/* Speaking indicator */}
            {stealthSpeaking && (
              <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 bg-card/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl px-4 py-2.5 shadow-2xl shadow-purple-500/20 animate-in slide-in-from-right-5 duration-300">
                <Volume2 className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-muted-foreground">Falando...</span>
              </div>
            )}

            {/* Response bubble */}
            {stealthResponse && (
              <div className="fixed bottom-24 right-6 z-50 max-w-sm bg-card/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl px-4 py-3 shadow-2xl shadow-purple-500/10 animate-in slide-in-from-right-5 fade-in-0 duration-300">
                <div className="prose prose-sm prose-invert max-w-none text-foreground text-xs [&_p]:mb-1 [&_strong]:text-foreground">
                  <ReactMarkdown>{stealthResponse}</ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}

        {/* FAB button */}
        <button
          onClick={handleFabClick}
          className="fixed bottom-6 right-6 z-50 group"
          title="Jarvis IA — clique duplo para modo voz"
        >
          {/* Neural network glow effect */}
          <div className={cn(
            "absolute inset-0 rounded-full blur-lg transition-opacity scale-110",
            stealthActive
              ? "bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-600 opacity-80 animate-pulse"
              : "bg-gradient-to-r from-purple-600 via-violet-500 to-purple-700 opacity-60 group-hover:opacity-90"
          )} />
          <div className={cn(
            "relative h-14 w-14 rounded-full flex items-center justify-center shadow-2xl border transition-transform group-hover:scale-110",
            stealthActive
              ? "bg-gradient-to-br from-emerald-500 via-green-400 to-emerald-600 shadow-emerald-500/40 border-emerald-400/30"
              : "bg-gradient-to-br from-purple-600 via-violet-500 to-purple-800 shadow-purple-500/40 border-purple-400/30"
          )}>
            {/* Animated neural rings */}
            <div className={cn(
              "absolute inset-0 rounded-full border animate-ping",
              stealthActive ? "border-emerald-400/30" : "border-purple-400/20"
            )} style={{ animationDuration: '3s' }} />
            <div className={cn(
              "absolute -inset-1 rounded-full border animate-ping",
              stealthActive ? "border-emerald-400/15" : "border-purple-400/10"
            )} style={{ animationDuration: '4s', animationDelay: '1s' }} />
            {stealthActive ? (
              <Mic className="h-6 w-6 text-white drop-shadow-lg" />
            ) : (
              <Bot className="h-6 w-6 text-white drop-shadow-lg" />
            )}
          </div>
          <span className="absolute -top-8 right-0 bg-card/90 backdrop-blur-sm text-[10px] text-foreground px-2 py-1 rounded-lg border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            {stealthActive ? 'Clique para desativar' : '2x clique = modo voz'}
          </span>
        </button>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md animate-in fade-in-0 duration-200"
        onClick={() => setIsOpen(false)}
      />

      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-2xl h-[600px] max-h-[80vh] pointer-events-auto animate-in zoom-in-95 fade-in-0 duration-300">
          {/* Neural network background effect */}
          <div className="absolute -inset-[2px] rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-violet-500/30 to-purple-800/40" />
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 400">
              {/* Neural network nodes */}
              {Array.from({ length: 20 }).map((_, i) => {
                const cx = 40 + (i % 5) * 80 + Math.sin(i * 1.3) * 20;
                const cy = 40 + Math.floor(i / 5) * 90 + Math.cos(i * 0.9) * 15;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="3" fill="#a855f7" opacity={0.6 + Math.sin(i) * 0.3}>
                      <animate attributeName="opacity" values={`${0.3 + Math.sin(i) * 0.2};${0.8};${0.3 + Math.sin(i) * 0.2}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                      <animate attributeName="r" values="2;4;2" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" />
                    </circle>
                    {/* Connections to nearby nodes */}
                    {Array.from({ length: 20 }).map((_, j) => {
                      if (j <= i) return null;
                      const cx2 = 40 + (j % 5) * 80 + Math.sin(j * 1.3) * 20;
                      const cy2 = 40 + Math.floor(j / 5) * 90 + Math.cos(j * 0.9) * 15;
                      const dist = Math.sqrt((cx - cx2) ** 2 + (cy - cy2) ** 2);
                      if (dist > 120) return null;
                      return (
                        <line key={`${i}-${j}`} x1={cx} y1={cy} x2={cx2} y2={cy2} stroke="#a855f7" strokeWidth="0.5" opacity={0.15}>
                          <animate attributeName="opacity" values="0.05;0.25;0.05" dur={`${4 + (i + j) * 0.1}s`} repeatCount="indefinite" />
                        </line>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Main card */}
          <div className="relative h-full rounded-3xl bg-card/95 backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-purple-500/10 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-display font-bold text-foreground">Jarvis</h2>
                  <p className="text-[10px] text-muted-foreground">Centro de Comando • Ctrl+Alt+J</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {hasSpeechSynthesis && (
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", ttsEnabled && "text-purple-400")} onClick={() => setTtsEnabled(!ttsEnabled)}>
                    {ttsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {jarvis.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl animate-pulse" />
                    <div className="relative p-4 rounded-2xl bg-gradient-to-br from-purple-600/20 to-violet-500/20 border border-purple-500/20">
                      <Bot className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                  <h3 className="text-base font-display font-bold text-foreground mb-1">Como posso ajudar?</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Pergunte qualquer coisa, peça para abrir uma página, ou dê um comando.
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-4 max-w-md">
                    {[
                      'Abra os mentorados',
                      'Status das automações',
                      'Resumo do CRM',
                      'Agendar reunião',
                    ].map(s => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/15 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {jarvis.messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-purple-600/20 to-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3 w-3 text-purple-400" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === 'user'
                      ? "bg-purple-600 text-white"
                      : "bg-muted/50 border border-border/30"
                  )}>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {msg.actions.map((a, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-1.5 py-0">
                            {a.split(':')[0] === 'navigate' ? '🧭 Navegando...' : `✅ ${a.split(':').slice(1).join(':') || a.split(':')[0]}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none text-foreground text-[13px] [&_p]:mb-1.5 [&_p]:leading-relaxed [&_ul]:mb-1 [&_ol]:mb-1 [&_li]:mb-0 [&_strong]:text-foreground [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded-lg">
                        <ReactMarkdown>{msg.content || (msg.isStreaming ? '...' : '')}</ReactMarkdown>
                        {msg.isStreaming && <span className="inline-block w-1.5 h-3.5 bg-purple-400 animate-pulse ml-0.5" />}
                      </div>
                    ) : (
                      <p className="text-[13px] whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {jarvis.isLoading && jarvis.messages[jarvis.messages.length - 1]?.role === 'user' && (
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-purple-600/20 to-violet-500/20 flex items-center justify-center shrink-0">
                    <Bot className="h-3 w-3 text-purple-400 animate-pulse" />
                  </div>
                  <div className="bg-muted/50 border border-border/30 rounded-2xl px-3 py-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border/30 px-4 py-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "🎤 Escutando..." : "Fale com o Jarvis..."}
                    className={cn(
                      "min-h-[40px] max-h-24 resize-none pr-20 bg-muted/30 border-border/50 text-sm rounded-xl",
                      isListening && "border-purple-500/50 ring-1 ring-purple-500/30"
                    )}
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                    {hasSpeechRecognition && (
                      <Button
                        size="icon"
                        variant={isListening ? "default" : "ghost"}
                        className={cn("h-7 w-7", isListening && "bg-destructive hover:bg-destructive/90 animate-pulse")}
                        onClick={toggleListening}
                      >
                        {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      className="h-7 w-7 bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600"
                      onClick={jarvis.isLoading ? jarvis.stopStreaming : handleSubmit}
                      disabled={!jarvis.isLoading && !input.trim()}
                    >
                      {jarvis.isLoading ? <Square className="h-3 w-3 text-white" /> : <Send className="h-3 w-3 text-white" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
