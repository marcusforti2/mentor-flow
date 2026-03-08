import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Mic, MicOff, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useJarvis, type JarvisMessage } from '@/hooks/useJarvis';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { JarvisOrb, type OrbState } from './JarvisOrb';

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
const HAS_SYNTHESIS = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function JarvisFloatingOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const jarvis = useJarvis();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Overlay voice state
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const lastSpokenMsgRef = useRef<string | null>(null);

  const [input, setInput] = useState('');

  // ===== STEALTH VOICE MODE (native SpeechRecognition) =====
  const [stealthActive, setStealthActive] = useState(false);
  const [stealthListening, setStealthListening] = useState(false);
  const [stealthResponse, setStealthResponse] = useState<string | null>(null);
  const [stealthPartial, setStealthPartial] = useState('');
  const [stealthSpeaking, setStealthSpeaking] = useState(false);
  const stealthAudioRef = useRef<HTMLAudioElement | null>(null);
  const stealthLastSpokenRef = useRef<string | null>(null);
  const stealthRecognitionRef = useRef<any>(null);
  const stealthAwaitingReplyRef = useRef(false);
  const stealthSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stealthFinalRef = useRef('');

  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ====== STEALTH: Start native recognition ======
  const stealthStartListening = useCallback(() => {
    if (!HAS_SPEECH || !stealthActive || stealthListening || jarvis.isLoading || stealthSpeaking || stealthAwaitingReplyRef.current) return;
    if (stealthRecognitionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    stealthFinalRef.current = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) stealthFinalRef.current = final;
      setStealthPartial(final || interim);

      // Auto-send after 1.2s silence on final
      if (stealthSilenceTimerRef.current) clearTimeout(stealthSilenceTimerRef.current);
      if (final) {
        stealthSilenceTimerRef.current = setTimeout(() => {
          const text = stealthFinalRef.current.trim();
          if (text && text.length >= 2 && !stealthAwaitingReplyRef.current) {
            stealthAwaitingReplyRef.current = true;
            setStealthPartial('');
            stealthFinalRef.current = '';
            // Stop recognition while processing
            try { recognition.stop(); } catch {}
            stealthRecognitionRef.current = null;
            setStealthListening(false);
            jarvis.sendMessage(text);
          }
        }, 1200);
      }
    };

    recognition.onend = () => {
      stealthRecognitionRef.current = null;
      setStealthListening(false);
      if (stealthSilenceTimerRef.current) {
        clearTimeout(stealthSilenceTimerRef.current);
        stealthSilenceTimerRef.current = null;
      }
      // Send pending text
      const pending = stealthFinalRef.current.trim();
      if (pending && pending.length >= 2 && !stealthAwaitingReplyRef.current) {
        stealthAwaitingReplyRef.current = true;
        setStealthPartial('');
        stealthFinalRef.current = '';
        jarvis.sendMessage(pending);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        // Silently restart
        stealthRecognitionRef.current = null;
        setStealthListening(false);
        return;
      }
      console.error('Stealth STT error:', e.error);
      stealthRecognitionRef.current = null;
      setStealthListening(false);
    };

    stealthRecognitionRef.current = recognition;
    recognition.start();
    setStealthListening(true);
  }, [stealthActive, stealthListening, jarvis, stealthSpeaking]);

  const stealthStopListening = useCallback(() => {
    if (stealthSilenceTimerRef.current) {
      clearTimeout(stealthSilenceTimerRef.current);
      stealthSilenceTimerRef.current = null;
    }
    if (stealthRecognitionRef.current) {
      try { stealthRecognitionRef.current.stop(); } catch {}
      stealthRecognitionRef.current = null;
    }
    setStealthListening(false);
  }, []);

  const deactivateStealth = useCallback(() => {
    stealthStopListening();
    if (stealthAudioRef.current) {
      stealthAudioRef.current.onended = null;
      stealthAudioRef.current.onerror = null;
      stealthAudioRef.current.pause();
      stealthAudioRef.current = null;
    }
    stealthAwaitingReplyRef.current = false;
    stealthFinalRef.current = '';
    setStealthActive(false);
    setStealthResponse(null);
    setStealthPartial('');
    setStealthSpeaking(false);
  }, [stealthStopListening]);

  // Force mic OFF when loading or speaking
  useEffect(() => {
    if (stealthActive && (jarvis.isLoading || stealthSpeaking || stealthAwaitingReplyRef.current)) {
      stealthStopListening();
    }
  }, [jarvis.isLoading, stealthActive, stealthSpeaking, stealthStopListening]);

  // Auto-start listening when idle in stealth
  useEffect(() => {
    if (!stealthActive || stealthListening || jarvis.isLoading || stealthSpeaking || stealthAwaitingReplyRef.current) return;
    if (stealthRecognitionRef.current) return;
    const timer = setTimeout(() => {
      if (!stealthActive || stealthListening || jarvis.isLoading || stealthSpeaking || stealthAwaitingReplyRef.current) return;
      stealthStartListening();
    }, 300);
    return () => clearTimeout(timer);
  }, [jarvis.isLoading, stealthActive, stealthListening, stealthSpeaking, stealthStartListening]);

  // Watch for Jarvis response in stealth mode → TTS
  useEffect(() => {
    if (!stealthActive) return;
    const lastMsg = jarvis.messages[jarvis.messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.isStreaming) return;
    if (stealthLastSpokenRef.current === lastMsg.id) return;

    stealthLastSpokenRef.current = lastMsg.id;
    const text = stripMarkdown(lastMsg.content);
    setStealthResponse(lastMsg.content);
    setTimeout(() => setStealthResponse(null), 8000);

    if (text && text.length >= 5) {
      void stealthSpeakTTS(text);
      return;
    }

    stealthAwaitingReplyRef.current = false;
  }, [jarvis.messages, stealthActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const getBestVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis?.getVoices() || [];
    // pt-BR first
    const ptBr = voices.filter(v => v.lang === 'pt-BR' || v.lang === 'pt_BR');
    if (ptBr.length > 0) {
      return ptBr.find(v => v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Luciana')) || ptBr[0];
    }
    const pt = voices.find(v => v.lang.startsWith('pt'));
    if (pt) return pt;
    return voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  };

  const stealthSpeakTTS = async (text: string) => {
    if (stealthAudioRef.current) {
      stealthAudioRef.current.onended = null;
      stealthAudioRef.current.onerror = null;
      stealthAudioRef.current.pause();
      stealthAudioRef.current = null;
    }

    setStealthSpeaking(true);
    let finalized = false;

    const finishCycle = () => {
      if (finalized) return;
      finalized = true;
      setStealthSpeaking(false);
      stealthAwaitingReplyRef.current = false;
    };

    if (!window.speechSynthesis) { finishCycle(); return; }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 1500));
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    utterance.volume = 1;
    utterance.lang = voice?.lang || 'pt-BR';

    utterance.onend = () => finishCycle();
    utterance.onerror = () => finishCycle();

    window.speechSynthesis.speak(utterance);
  };

  // Handle FAB clicks
  const handleFabClick = useCallback(() => {
    if (stealthActive) {
      deactivateStealth();
      return;
    }

    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (clickCountRef.current >= 2) {
      clickCountRef.current = 0;
      setStealthActive(true);
      // Stealth mode activated silently
    } else {
      clickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) setIsOpen(true);
        clickCountRef.current = 0;
      }, 300);
    }
  }, [stealthActive, deactivateStealth]);

  // Global hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'j') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
      if (e.key === 'Escape' && stealthActive) deactivateStealth();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, stealthActive, deactivateStealth]);

  // Focus input
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [jarvis.messages]);

  // Navigation actions
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
          metricas: '/membro/metricas',
          'meus-arquivos': '/membro/meus-arquivos',
          'minhas-tarefas': '/membro/minhas-tarefas',
          'meu-crm': '/membro/meu-crm',
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

  // Overlay TTS (browser native)
  useEffect(() => {
    if (!ttsEnabled || !HAS_SYNTHESIS) return;
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
    const lowerName = (v: SpeechSynthesisVoice) => v.name.toLowerCase();
    const isPtBR = (v: SpeechSynthesisVoice) => v.lang === 'pt-BR';
    const isPt = (v: SpeechSynthesisVoice) => v.lang.startsWith('pt');

    const bestVoice =
      voices.find(v => isPtBR(v) && lowerName(v).includes('google')) ||
      voices.find(v => isPtBR(v) && lowerName(v).includes('microsoft')) ||
      voices.find(v => isPtBR(v) && !v.localService) ||
      voices.find(v => isPtBR(v)) ||
      voices.find(v => isPt(v) && lowerName(v).includes('google')) ||
      voices.find(v => isPt(v) && lowerName(v).includes('microsoft')) ||
      voices.find(v => isPt(v));

    if (bestVoice) utterance.voice = bestVoice;
    window.speechSynthesis.speak(utterance);
  }, [jarvis.messages, ttsEnabled]);

  // Overlay STT (native)
  const toggleListening = useCallback(() => {
    if (!HAS_SPEECH) return;
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
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, jarvis]);

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
        {/* Stealth mode: Orb + floating response */}
        {stealthActive && (
          <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3 animate-in slide-in-from-right-5 duration-300">
            {/* Response bubble */}
            {stealthResponse && (
              <div className="max-w-sm bg-card/95 backdrop-blur-xl border border-primary/20 rounded-2xl px-4 py-3 shadow-2xl animate-in fade-in-0 duration-300">
                <div className="prose prose-sm prose-invert max-w-none text-foreground text-xs [&_p]:mb-1 [&_strong]:text-foreground">
                  <ReactMarkdown>{stealthResponse}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Partial transcript */}
            {stealthPartial && !stealthResponse && (
              <div className="bg-card/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl px-4 py-2 shadow-2xl">
                <span className="text-xs text-muted-foreground">{stealthPartial}</span>
              </div>
            )}

            {/* Orb */}
            <JarvisOrb
              state={
                stealthListening ? 'listening' :
                jarvis.isLoading ? 'processing' :
                stealthSpeaking ? 'speaking' :
                'idle' as OrbState
              }
              size="sm"
              onClick={deactivateStealth}
            />
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={handleFabClick}
          className={cn(
            "fixed bottom-6 right-6 z-50 group",
            stealthActive && "hidden"
          )}
          title="EloAi — clique duplo para modo voz"
        >
          <div className={cn(
            "absolute inset-0 rounded-full blur-lg transition-opacity scale-110",
            "bg-gradient-to-r from-purple-600 via-violet-500 to-purple-700 opacity-60 group-hover:opacity-90"
          )} />
          <div className="relative h-14 w-14 rounded-full flex items-center justify-center shadow-2xl border bg-gradient-to-br from-purple-600 via-violet-500 to-purple-800 shadow-purple-500/40 border-purple-400/30 transition-transform group-hover:scale-110">
            <div className="absolute inset-0 rounded-full border border-purple-400/20 animate-ping" style={{ animationDuration: '3s' }} />
            <Bot className="h-6 w-6 text-white drop-shadow-lg" />
          </div>
          <span className="absolute -top-8 right-0 bg-card/90 backdrop-blur-sm text-[10px] text-foreground px-2 py-1 rounded-lg border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            2x clique = modo voz
          </span>
        </button>
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md animate-in fade-in-0 duration-200"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-2xl h-[600px] max-h-[80vh] pointer-events-auto animate-in zoom-in-95 fade-in-0 duration-300">
          <div className="absolute -inset-[2px] rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-violet-500/30 to-purple-800/40" />
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 400">
              {Array.from({ length: 20 }).map((_, i) => {
                const cx = 40 + (i % 5) * 80 + Math.sin(i * 1.3) * 20;
                const cy = 40 + Math.floor(i / 5) * 90 + Math.cos(i * 0.9) * 15;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="3" fill="#a855f7" opacity={0.6 + Math.sin(i) * 0.3}>
                      <animate attributeName="opacity" values={`${0.3 + Math.sin(i) * 0.2};${0.8};${0.3 + Math.sin(i) * 0.2}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                      <animate attributeName="r" values="2;4;2" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" />
                    </circle>
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

          <div className="relative h-full rounded-3xl bg-card/95 backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-purple-500/10 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-display font-bold text-foreground">EloAi</h2>
                  <p className="text-[10px] text-muted-foreground">Assistente Inteligente • Ctrl+Alt+J</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {HAS_SYNTHESIS && (
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", ttsEnabled && "text-purple-400")} onClick={() => setTtsEnabled(!ttsEnabled)}>
                    {ttsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

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
                    {['Abra os mentorados', 'Status das automações', 'Resumo do CRM', 'Agendar reunião'].map(s => (
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
                    {HAS_SPEECH && (
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
