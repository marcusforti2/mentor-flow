import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingProgressBar } from "@/components/onboarding/ProgressBar";
import { OnboardingQuestionCard } from "@/components/onboarding/QuestionCard";
import {
  Loader2, ArrowRight, ArrowUp, CheckCircle, ChevronDown,
  Upload as UploadIcon, Link as LinkIcon, ImageIcon,
} from "lucide-react";

/* ── types ───────────────────────────────────────── */
interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  order_index: number;
  is_required: boolean;
}

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  business_type: string;
  main_offer: string;
  target_audience: string;
  monthly_revenue: string;
  responses: Record<string, any>;
}

/* Each "slide" in our typeform */
interface Slide {
  key: string;
  type: 'intro' | 'field' | 'question' | 'otp' | 'complete';
  label?: string;
  subtitle?: string;
  fieldKey?: keyof FormData;
  fieldType?: string;
  options?: any[];
  required?: boolean;
  question?: Question;
  placeholder?: string;
  inputType?: string;
}

const INITIAL_FORM_DATA: FormData = {
  full_name: '', email: '', phone: '', business_name: '',
  business_type: '', main_offer: '', target_audience: '',
  monthly_revenue: '', responses: {},
};

const BUSINESS_TYPES = [
  'Serviços', 'Produtos Físicos', 'Infoprodutos', 'SaaS / Software',
  'Consultoria', 'Agência', 'E-commerce', 'Outro',
];

const REVENUE_RANGES = [
  'Ainda não faturei', 'Até R$ 5.000/mês', 'R$ 5.000 a R$ 20.000/mês',
  'R$ 20.000 a R$ 50.000/mês', 'R$ 50.000 a R$ 100.000/mês', 'Acima de R$ 100.000/mês',
];

/* letter shortcuts A-Z for options */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mentorId = searchParams.get('mentor');
  const inviteToken = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [mentorInfo, setMentorInfo] = useState<{ business_name: string | null } | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [resolvedMentorId, setResolvedMentorId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('down');

  /* ── build slides ──────────────────────────────── */
  const slides: Slide[] = useMemo(() => {
    const s: Slide[] = [
      { key: 'intro', type: 'intro' },
      { key: 'full_name', type: 'field', label: 'Qual é o seu nome completo?', fieldKey: 'full_name', fieldType: 'text', required: true, placeholder: 'Digite seu nome...' },
      { key: 'email', type: 'field', label: 'Qual é o seu melhor email?', fieldKey: 'email', fieldType: 'text', inputType: 'email', required: true, placeholder: 'nome@email.com' },
      { key: 'phone', type: 'field', label: 'Seu WhatsApp', subtitle: 'Opcional, mas recomendado', fieldKey: 'phone', fieldType: 'text', placeholder: '(00) 00000-0000' },
      { key: 'business_name', type: 'field', label: 'Qual o nome do seu negócio?', fieldKey: 'business_name', fieldType: 'text', placeholder: 'Nome da empresa...' },
      { key: 'business_type', type: 'field', label: 'Qual o tipo do seu negócio?', fieldKey: 'business_type', fieldType: 'select', options: BUSINESS_TYPES, required: true },
      { key: 'main_offer', type: 'field', label: 'Qual a sua principal oferta?', subtitle: 'Descreva seu produto ou serviço principal', fieldKey: 'main_offer', fieldType: 'textarea', placeholder: 'Ex: Consultoria em marketing digital...' },
      { key: 'target_audience', type: 'field', label: 'Quem é o seu público-alvo?', fieldKey: 'target_audience', fieldType: 'textarea', placeholder: 'Ex: Empreendedores digitais que faturam...' },
      { key: 'monthly_revenue', type: 'field', label: 'Qual seu faturamento mensal atual?', fieldKey: 'monthly_revenue', fieldType: 'select', options: REVENUE_RANGES },
    ];

    // Add dynamic questions
    for (const q of questions) {
      s.push({
        key: `q-${q.id}`,
        type: 'question',
        label: q.question_text,
        required: q.is_required,
        question: q,
      });
    }

    s.push({ key: 'otp', type: 'otp', label: 'Verifique seu email' });
    s.push({ key: 'complete', type: 'complete' });

    return s;
  }, [questions]);

  const totalSlides = slides.length;
  const slide = slides[currentSlide];

  /* ── fetch data ────────────────────────────────── */
  useEffect(() => {
    fetchMentorAndQuestions();
  }, [mentorId, inviteToken]);

  const fetchMentorAndQuestions = async () => {
    let targetMembershipId = mentorId;

    if (inviteToken) {
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('id, tenant_id, email, status, expires_at, metadata, role, created_by_membership_id')
        .eq('id', inviteToken)
        .maybeSingle();

      if (inviteError || !invite || invite.status !== 'pending') {
        toast({ title: "Convite inválido ou já utilizado", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        toast({ title: "Convite expirado", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const meta = invite.metadata as Record<string, any> | null;
      setInviteData(invite);
      targetMembershipId = invite.created_by_membership_id;
      setFormData(prev => ({
        ...prev,
        full_name: meta?.full_name || prev.full_name,
        email: invite.email || prev.email,
        phone: meta?.phone || prev.phone,
        business_name: meta?.business_name || prev.business_name,
      }));
    }

    if (!targetMembershipId) {
      toast({ title: "Link inválido", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    setResolvedMentorId(targetMembershipId);

    try {
      const { data: membership } = await supabase
        .from('memberships').select('id, tenant_id').eq('id', targetMembershipId).single();

      if (!membership) { toast({ title: "Mentor não encontrado", variant: "destructive" }); return; }
      setTenantId(membership.tenant_id);

      const { data: mentorProfile } = await supabase
        .from('mentor_profiles').select('business_name').eq('membership_id', membership.id).single();

      if (mentorProfile) {
        setMentorInfo({ business_name: mentorProfile.business_name });
      } else {
        const { data: tenant } = await supabase.from('tenants').select('name').eq('id', membership.tenant_id).single();
        setMentorInfo({ business_name: tenant?.name || 'Mentoria' });
      }

      const { data: questionsData } = await supabase
        .from('behavioral_questions')
        .select('id, question_text, question_type, options, order_index, is_required')
        .eq('tenant_id', membership.tenant_id)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      setQuestions(questionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── helpers ───────────────────────────────────── */
  const getFieldValue = (key: keyof FormData) => {
    const v = formData[key];
    return typeof v === 'string' ? v : '';
  };

  const setField = (key: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getResponse = (qId: string) => formData.responses[qId];
  const setResponse = (qId: string, value: any) => {
    setFormData(prev => ({ ...prev, responses: { ...prev.responses, [qId]: value } }));
  };

  /* ── validation ────────────────────────────────── */
  const validateSlide = (): boolean => {
    if (!slide) return false;
    if (slide.type === 'field' && slide.required && slide.fieldKey) {
      const v = getFieldValue(slide.fieldKey);
      if (!v.trim()) { toast({ title: "Campo obrigatório", variant: "destructive" }); return false; }
      if (slide.fieldKey === 'email' && !v.includes('@')) { toast({ title: "Email inválido", variant: "destructive" }); return false; }
    }
    if (slide.type === 'question' && slide.required && slide.question) {
      const r = getResponse(slide.question.id);
      if (r === undefined || r === null || r === '') { toast({ title: "Resposta obrigatória", variant: "destructive" }); return false; }
    }
    if (slide.type === 'otp') {
      if (!otpCode || otpCode.length !== 6) { toast({ title: "Digite o código de 6 dígitos", variant: "destructive" }); return false; }
    }
    return true;
  };

  /* ── OTP & submit ──────────────────────────────── */
  const sendOtp = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp', { body: { email: formData.email } });
      if (error) throw error;
      toast({ title: "Código enviado!", description: "Verifique seu email" });
    } catch (error: any) {
      toast({ title: "Erro ao enviar código", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtpAndCreate = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-onboarding', {
        body: {
          email: formData.email, otp: otpCode,
          mentorId: resolvedMentorId || mentorId,
          inviteToken: inviteToken || undefined,
          tenantId: tenantId || undefined,
          fullName: formData.full_name, phone: formData.phone,
          businessProfile: {
            business_name: formData.business_name, business_type: formData.business_type,
            main_offer: formData.main_offer, target_audience: formData.target_audience,
            monthly_revenue: formData.monthly_revenue,
          },
          responses: formData.responses,
        },
      });
      if (error) throw error;
      if (data?.session) {
        await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      }
      goTo(slides.length - 1); // complete
      toast({ title: "Conta criada com sucesso!" });
      setTimeout(() => navigate('/app'), 2500);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Código inválido", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── navigation ────────────────────────────────── */
  const goTo = (idx: number) => {
    setDirection(idx > currentSlide ? 'down' : 'up');
    setCurrentSlide(idx);
  };

  const handleNext = async () => {
    if (!validateSlide()) return;

    // When leaving the slide before OTP, send OTP
    const nextSlide = slides[currentSlide + 1];
    if (nextSlide?.type === 'otp') {
      await sendOtp();
    }

    if (slide.type === 'otp') {
      await verifyOtpAndCreate();
      return;
    }

    if (currentSlide < totalSlides - 1) {
      goTo(currentSlide + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) goTo(currentSlide - 1);
  };

  /* keyboard */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  }, [currentSlide, formData, otpCode, isSubmitting]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* ── render helpers ────────────────────────────── */
  const renderSelectOptions = (options: string[], value: string, onChange: (v: string) => void) => (
    <div className="space-y-3 w-full">
      {options.map((opt, i) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            onClick={() => { onChange(opt); }}
            className={`
              w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-200 border
              ${selected
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                : 'bg-white/5 text-white/90 border-white/10 hover:bg-white/10 hover:border-white/20'}
            `}
          >
            <span className={`
              h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors
              ${selected ? 'bg-black text-white' : 'bg-white/10 text-white/60 border border-white/20'}
            `}>
              {LETTERS[i]}
            </span>
            <span className="text-[15px] md:text-base font-medium">{opt}</span>
            {selected && <CheckCircle className="h-5 w-5 ml-auto shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  const renderDISCOptions = (question: Question) => {
    const opts = Array.isArray(question.options) ? question.options : [];
    const currentVal = getResponse(question.id);
    return (
      <div className="space-y-3 w-full">
        {opts.map((opt: any, i: number) => {
          const optText = typeof opt === 'string' ? opt : opt?.text || '';
          const optValue = typeof opt === 'string' ? opt : opt;
          const selected = JSON.stringify(currentVal) === JSON.stringify(optValue);
          return (
            <button
              key={i}
              onClick={() => setResponse(question.id, optValue)}
              className={`
                w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-200 border
                ${selected
                  ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                  : 'bg-white/5 text-white/90 border-white/10 hover:bg-white/10 hover:border-white/20'}
              `}
            >
              <span className={`
                h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0
                ${selected ? 'bg-black text-white' : 'bg-white/10 text-white/60 border border-white/20'}
              `}>
                {LETTERS[i]}
              </span>
              <span className="text-[15px] md:text-base font-medium">{optText}</span>
              {selected && <CheckCircle className="h-5 w-5 ml-auto shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  };

  /* ── input class ───────────────────────────────── */
  const inputClass = "w-full bg-transparent border-0 border-b-2 border-white/20 focus:border-white text-white text-xl md:text-2xl py-3 px-0 placeholder:text-white/25 focus:outline-none focus:ring-0 transition-colors caret-white";
  const textareaClass = "w-full bg-transparent border-0 border-b-2 border-white/20 focus:border-white text-white text-lg md:text-xl py-3 px-0 placeholder:text-white/25 focus:outline-none focus:ring-0 transition-colors resize-none caret-white min-h-[80px]";

  /* ── loading ───────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if ((!mentorId && !inviteToken) || !mentorInfo) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Link Inválido</h1>
          <p className="text-white/50">Este link de onboarding não é válido.</p>
          <button onClick={() => navigate('/')} className="text-white underline underline-offset-4">Voltar</button>
        </div>
      </div>
    );
  }

  /* ── main render ───────────────────────────────── */
  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Progress */}
      {slide?.type !== 'intro' && slide?.type !== 'complete' && (
        <OnboardingProgressBar current={currentSlide} total={totalSlides - 1} />
      )}

      {/* Main area */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 md:py-20">
        <OnboardingQuestionCard key={slide?.key}>

          {/* ── INTRO ── */}
          {slide?.type === 'intro' && (
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Bem-vindo 👋
                </h1>
                {mentorInfo.business_name && (
                  <p className="text-xl md:text-2xl text-white/60">
                    à mentoria <span className="text-white font-semibold">{mentorInfo.business_name}</span>
                  </p>
                )}
                <p className="text-white/40 text-base md:text-lg max-w-md mx-auto">
                  Vamos conhecer você e seu negócio. Leva poucos minutos.
                </p>
              </div>
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-white/90 transition-colors active:scale-95"
              >
                Começar <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* ── FIELD ── */}
          {slide?.type === 'field' && slide.fieldKey && (
            <div className="space-y-8">
              {/* Question number + label */}
              <div className="space-y-2">
                <p className="text-sm text-white/40 font-medium">
                  {currentSlide} <span className="text-white/20">→</span> {totalSlides - 2}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                  {slide.label}
                  {slide.required && <span className="text-red-400 ml-1">*</span>}
                </h2>
                {slide.subtitle && (
                  <p className="text-white/40 text-base">{slide.subtitle}</p>
                )}
              </div>

              {/* Input */}
              {slide.fieldType === 'text' && (
                <input
                  type={slide.inputType || 'text'}
                  value={getFieldValue(slide.fieldKey)}
                  onChange={(e) => setField(slide.fieldKey!, e.target.value)}
                  placeholder={slide.placeholder || 'Digite aqui...'}
                  className={inputClass}
                  autoFocus
                />
              )}

              {slide.fieldType === 'textarea' && (
                <textarea
                  value={getFieldValue(slide.fieldKey)}
                  onChange={(e) => setField(slide.fieldKey!, e.target.value)}
                  placeholder={slide.placeholder || 'Digite aqui...'}
                  className={textareaClass}
                  rows={3}
                  autoFocus
                />
              )}

              {slide.fieldType === 'select' && slide.options && (
                renderSelectOptions(
                  slide.options,
                  getFieldValue(slide.fieldKey),
                  (v) => setField(slide.fieldKey!, v)
                )
              )}

              {/* OK button */}
              {slide.fieldType !== 'select' && (
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-lg text-sm hover:bg-white/90 transition-colors active:scale-95 disabled:opacity-50"
                >
                  OK <CheckCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* ── QUESTION ── */}
          {slide?.type === 'question' && slide.question && (
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-sm text-white/40 font-medium">
                  {currentSlide} <span className="text-white/20">→</span> {totalSlides - 2}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                  {slide.question.question_text}
                  {slide.required && <span className="text-red-400 ml-1">*</span>}
                </h2>
              </div>

              {/* text */}
              {slide.question.question_type === 'text' && (
                <input
                  value={getResponse(slide.question.id) || ''}
                  onChange={(e) => setResponse(slide.question.id, e.target.value)}
                  placeholder="Digite sua resposta..."
                  className={inputClass}
                  autoFocus
                />
              )}

              {/* textarea */}
              {slide.question.question_type === 'textarea' && (
                <textarea
                  value={getResponse(slide.question.id) || ''}
                  onChange={(e) => setResponse(slide.question.id, e.target.value)}
                  placeholder="Digite sua resposta..."
                  className={textareaClass}
                  rows={4}
                  autoFocus
                />
              )}

              {/* link */}
              {slide.question.question_type === 'link' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-5 w-5 text-white/40 shrink-0" />
                    <input
                      type="url"
                      value={getResponse(slide.question.id) || ''}
                      onChange={(e) => setResponse(slide.question.id, e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* image upload */}
              {slide.question.question_type === 'image' && (
                <div className="space-y-4">
                  <label className={`
                    w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
                    ${getResponse(slide.question.id)?.preview
                      ? 'border-white/40 bg-white/5'
                      : 'border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/5'}
                  `}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setResponse(slide.question!.id, { fileName: file.name, fileSize: file.size, preview: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    {getResponse(slide.question.id)?.preview ? (
                      <div className="space-y-3 text-center">
                        <img src={getResponse(slide.question.id).preview} alt="Preview" className="max-h-52 mx-auto rounded-xl" />
                        <p className="text-sm text-white/40">{getResponse(slide.question.id).fileName}</p>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setResponse(slide.question!.id, null); }}
                          className="text-sm text-white/60 underline underline-offset-4 hover:text-white"
                        >
                          Trocar imagem
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
                          <ImageIcon className="h-7 w-7 text-white/40" />
                        </div>
                        <p className="text-white/70 font-medium">Clique ou arraste uma imagem</p>
                        <p className="text-sm text-white/30">PNG, JPG até 10MB</p>
                      </>
                    )}
                  </label>
                </div>
              )}

              {/* select / multiple_choice */}
              {(slide.question.question_type === 'select' || slide.question.question_type === 'multiple_choice') && (
                (() => {
                  const opts = Array.isArray(slide.question!.options) ? slide.question!.options : [];
                  const stringOpts = opts.map((o: any) => typeof o === 'string' ? o : o?.text || '');
                  return renderSelectOptions(stringOpts, getResponse(slide.question!.id) || '', (v) => setResponse(slide.question!.id, v));
                })()
              )}

              {/* yes_no */}
              {slide.question.question_type === 'yes_no' && (
                <div className="flex gap-4">
                  {['Sim', 'Não'].map(opt => {
                    const selected = getResponse(slide.question!.id) === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setResponse(slide.question!.id, opt)}
                        className={`flex-1 py-5 rounded-xl text-lg font-bold transition-all border ${
                          selected ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* scale */}
              {slide.question.question_type === 'scale' && (
                <div className="flex flex-wrap gap-3 justify-center">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => {
                    const selected = getResponse(slide.question!.id) === n;
                    return (
                      <button
                        key={n}
                        onClick={() => setResponse(slide.question!.id, n)}
                        className={`h-14 w-14 rounded-xl text-lg font-bold transition-all border ${
                          selected ? 'bg-white text-black border-white scale-110' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* disc */}
              {slide.question.question_type === 'disc' && renderDISCOptions(slide.question)}

              {/* OK for text types */}
              {['text', 'textarea', 'link'].includes(slide.question.question_type) && (
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-lg text-sm hover:bg-white/90 transition-colors active:scale-95 disabled:opacity-50"
                >
                  OK <CheckCircle className="h-4 w-4" />
                </button>
              )}

              {!slide.required && (
                <p className="text-sm text-white/25 italic">Opcional — pressione Enter para pular</p>
              )}
            </div>
          )}

          {/* ── OTP ── */}
          {slide?.type === 'otp' && (
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold">Verifique seu email ✉️</h2>
                <p className="text-white/40 text-base">
                  Enviamos um código de 6 dígitos para <span className="text-white/70 font-medium">{formData.email}</span>
                </p>
              </div>
              <input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-transparent border-0 border-b-2 border-white/20 focus:border-white text-white text-4xl md:text-5xl text-center py-4 px-0 tracking-[0.5em] font-mono placeholder:text-white/15 focus:outline-none focus:ring-0 transition-colors caret-white"
                maxLength={6}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <button onClick={sendOtp} disabled={isSubmitting} className="text-sm text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors">
                  Reenviar código
                </button>
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-lg text-sm hover:bg-white/90 transition-colors active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Verificar
                </button>
              </div>
            </div>
          )}

          {/* ── COMPLETE ── */}
          {slide?.type === 'complete' && (
            <div className="text-center space-y-8">
              <div className="h-20 w-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold">Tudo pronto! 🎉</h1>
                <p className="text-white/40 text-lg">Sua conta foi criada. Redirecionando...</p>
              </div>
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-white/40" />
            </div>
          )}
        </OnboardingQuestionCard>
      </main>

      {/* Bottom nav */}
      {slide?.type !== 'intro' && slide?.type !== 'complete' && (
        <footer className="fixed bottom-0 left-0 right-0 p-4 flex items-center justify-between">
          {/* Nav arrows */}
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              disabled={currentSlide <= 0}
              className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 transition-colors disabled:opacity-20"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 transition-colors disabled:opacity-20"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Enter hint */}
          <p className="text-xs text-white/20 hidden md:block">
            Pressione <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/40 text-[10px]">Enter ↵</kbd>
          </p>
        </footer>
      )}
    </div>
  );
};

export default Onboarding;
