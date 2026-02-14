import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { OnboardingProgressBar } from "@/components/onboarding/ProgressBar";
import { OnboardingQuestionCard } from "@/components/onboarding/QuestionCard";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  User,
  Briefcase,
  MessageSquare,
  Sparkles,
} from "lucide-react";

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

type Step = 'intro' | 'basic' | 'business' | 'questions' | 'otp' | 'complete';

const INITIAL_FORM_DATA: FormData = {
  full_name: '',
  email: '',
  phone: '',
  business_name: '',
  business_type: '',
  main_offer: '',
  target_audience: '',
  monthly_revenue: '',
  responses: {},
};

const BUSINESS_TYPES = [
  'Serviços',
  'Produtos Físicos',
  'Infoprodutos',
  'SaaS / Software',
  'Consultoria',
  'Agência',
  'E-commerce',
  'Outro',
];

const REVENUE_RANGES = [
  'Ainda não faturei',
  'Até R$ 5.000/mês',
  'R$ 5.000 a R$ 20.000/mês',
  'R$ 20.000 a R$ 50.000/mês',
  'R$ 50.000 a R$ 100.000/mês',
  'Acima de R$ 100.000/mês',
];

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mentorId = searchParams.get('mentor');
  const inviteToken = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [mentorInfo, setMentorInfo] = useState<{ business_name: string | null } | null>(null);
  const [inviteData, setInviteData] = useState<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    business_name: string | null;
    tenant_id: string;
  } | null>(null);
  const [resolvedMentorId, setResolvedMentorId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<Step>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const totalSteps = 3 + questions.length + 1;
  const getCurrentStepNumber = () => {
    switch (step) {
      case 'intro': return 0;
      case 'basic': return 1;
      case 'business': return 2;
      case 'questions': return 3 + currentQuestionIndex;
      case 'otp': return 3 + questions.length;
      case 'complete': return totalSteps;
      default: return 0;
    }
  };

  const fetchMentorAndQuestions = async () => {
    // The `mentor` param now refers to a membership_id (admin/mentor membership)
    let targetMembershipId = mentorId;
    
    if (inviteToken) {
      // Use the new invites table instead of legacy mentorado_invites
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('id, tenant_id, email, status, expires_at, metadata, role, created_by_membership_id')
        .eq('id', inviteToken)
        .maybeSingle();
      
      if (inviteError || !invite) {
        toast({ title: "Convite inválido", description: "Este link de convite não é válido ou já foi utilizado.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      if (invite.status !== 'pending') {
        toast({ title: "Convite já utilizado", description: "Este convite já foi aceito anteriormente.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        toast({ title: "Convite expirado", description: "Este convite expirou. Solicite um novo convite ao seu mentor.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const meta = invite.metadata as Record<string, any> | null;
      setInviteData({
        id: invite.id,
        full_name: meta?.full_name || '',
        email: invite.email || null,
        phone: meta?.phone || null,
        business_name: meta?.business_name || null,
        tenant_id: invite.tenant_id,
      });
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
      toast({ title: "Link inválido", description: "Este link de onboarding é inválido.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    setResolvedMentorId(targetMembershipId);
    setIsLoading(true);

    try {
      // Try to resolve mentor info via memberships + mentor_profiles (new arch)
      const { data: membership } = await supabase
        .from('memberships')
        .select('id, tenant_id')
        .eq('id', targetMembershipId)
        .single();

      if (membership) {
        setTenantId(membership.tenant_id);
        
        // Get business name from mentor_profiles
        const { data: mentorProfile } = await supabase
          .from('mentor_profiles')
          .select('business_name')
          .eq('membership_id', membership.id)
          .single();
        
        if (mentorProfile) {
          setMentorInfo({ business_name: mentorProfile.business_name });
        } else {
          // Fallback: try tenant name
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', membership.tenant_id)
            .single();
          setMentorInfo({ business_name: tenant?.name || 'Mentoria' });
        }
      } else {
        toast({ title: "Mentor não encontrado", description: "Este link de onboarding não é válido.", variant: "destructive" });
        return;
      }

      // Fetch behavioral questions via owner_membership_id
      const { data: questionsData } = await supabase
        .from('behavioral_questions')
        .select('id, question_text, question_type, options, order_index, is_required')
        .eq('owner_membership_id', targetMembershipId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      setQuestions(questionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Erro ao carregar", description: "Não foi possível carregar o formulário.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorAndQuestions();
  }, [mentorId, inviteToken]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  }, [step, currentQuestionIndex, formData]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const validateBasicStep = () => {
    if (!formData.full_name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast({ title: "Email válido obrigatório", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateBusinessStep = () => {
    if (!formData.business_type) {
      toast({ title: "Selecione o tipo de negócio", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateCurrentQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return true;
    if (!currentQuestion.is_required) return true;
    const response = formData.responses[currentQuestion.id];
    if (response === undefined || response === null || response === '') {
      toast({ title: "Resposta obrigatória", description: "Esta pergunta precisa ser respondida", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    switch (step) {
      case 'intro':
        setStep('basic');
        break;
      case 'basic':
        if (validateBasicStep()) setStep('business');
        break;
      case 'business':
        if (validateBusinessStep()) {
          if (questions.length > 0) {
            setStep('questions');
            setCurrentQuestionIndex(0);
          } else {
            await sendOtp();
          }
        }
        break;
      case 'questions':
        if (!validateCurrentQuestion()) return;
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          await sendOtp();
        }
        break;
      case 'otp':
        await verifyOtpAndCreate();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'basic':
        setStep('intro');
        break;
      case 'business':
        setStep('basic');
        break;
      case 'questions':
        if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(prev => prev - 1);
        } else {
          setStep('business');
        }
        break;
      case 'otp':
        if (questions.length > 0) {
          setStep('questions');
          setCurrentQuestionIndex(questions.length - 1);
        } else {
          setStep('business');
        }
        break;
    }
  };

  const sendOtp = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: { email: formData.email },
      });
      if (error) throw error;
      setOtpSent(true);
      setStep('otp');
      toast({ title: "Código enviado!", description: "Verifique seu email" });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({ title: "Erro ao enviar código", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtpAndCreate = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({ title: "Digite o código de 6 dígitos", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-onboarding', {
        body: {
          email: formData.email,
          otp: otpCode,
          mentorId: resolvedMentorId || mentorId,
          inviteToken: inviteToken || undefined,
          tenantId: tenantId || undefined,
          fullName: formData.full_name,
          phone: formData.phone,
          businessProfile: {
            business_name: formData.business_name,
            business_type: formData.business_type,
            main_offer: formData.main_offer,
            target_audience: formData.target_audience,
            monthly_revenue: formData.monthly_revenue,
          },
          responses: formData.responses,
        },
      });

      if (error) throw error;

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setStep('complete');
      toast({ title: "Conta criada com sucesso!" });

      setTimeout(() => {
        navigate('/app');
      }, 2000);
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast({ title: "Erro ao criar conta", description: error.message || "Código inválido ou expirado", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateResponse = (questionId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animated-gradient-bg" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if ((!mentorId && !inviteToken) || !mentorInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animated-gradient-bg" />
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Link Inválido</h1>
          <p className="text-muted-foreground">Este link de onboarding não é válido.</p>
          <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="animated-gradient-bg" />
      
      <header className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between">
        <BrandLogo variant="full" size="sm" />
        {step !== 'intro' && step !== 'complete' && (
          <OnboardingProgressBar 
            current={getCurrentStepNumber()} 
            total={totalSteps} 
          />
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-2xl">
          {/* Intro Step */}
          {step === 'intro' && (
            <OnboardingQuestionCard>
              <div className="text-center space-y-6">
                <div className="h-20 w-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    Bem-vindo(a)! 👋
                  </h1>
                  {mentorInfo.business_name && (
                    <p className="text-xl text-muted-foreground">
                      à mentoria <span className="text-primary font-semibold">{mentorInfo.business_name}</span>
                    </p>
                  )}
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Vamos conhecer você e seu negócio para personalizar sua jornada de crescimento.
                  </p>
                </div>
                <Button size="lg" onClick={handleNext} className="gradient-gold text-primary-foreground">
                  Começar <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </OnboardingQuestionCard>
          )}

          {/* Basic Info Step */}
          {step === 'basic' && (
            <OnboardingQuestionCard icon={User} title="Seus Dados" subtitle="Como podemos te chamar?">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nome Completo *</label>
                  <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Seu nome completo" className="h-12 text-lg" autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email *</label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="seu@email.com" className="h-12 text-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">WhatsApp</label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" className="h-12 text-lg" />
                </div>
              </div>
            </OnboardingQuestionCard>
          )}

          {/* Business Info Step */}
          {step === 'business' && (
            <OnboardingQuestionCard icon={Briefcase} title="Seu Negócio" subtitle="Conte-nos sobre sua empresa">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nome do Negócio</label>
                  <Input value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} placeholder="Nome da sua empresa" className="h-12 text-lg" autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tipo de Negócio *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUSINESS_TYPES.map(type => (
                      <Button key={type} type="button" variant={formData.business_type === type ? 'default' : 'outline'} className="h-auto py-3 justify-start" onClick={() => setFormData({ ...formData, business_type: type })}>
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Faturamento Mensal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {REVENUE_RANGES.map(range => (
                      <Button key={range} type="button" variant={formData.monthly_revenue === range ? 'default' : 'outline'} className="h-auto py-2 text-sm justify-start" onClick={() => setFormData({ ...formData, monthly_revenue: range })}>
                        {range}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </OnboardingQuestionCard>
          )}

          {/* Custom Questions Step */}
          {step === 'questions' && questions[currentQuestionIndex] && (
            <OnboardingQuestionCard
              icon={MessageSquare}
              title={`Pergunta ${currentQuestionIndex + 1} de ${questions.length}`}
              questionNumber={currentQuestionIndex + 1}
            >
              <div className="space-y-6">
                <p className="text-xl font-medium text-foreground">
                  {questions[currentQuestionIndex].question_text}
                </p>
                
                {questions[currentQuestionIndex].question_type === 'text' && (
                  <Input value={formData.responses[questions[currentQuestionIndex].id] || ''} onChange={(e) => updateResponse(questions[currentQuestionIndex].id, e.target.value)} placeholder="Digite sua resposta..." className="h-12 text-lg" autoFocus />
                )}
                
                {questions[currentQuestionIndex].question_type === 'textarea' && (
                  <Textarea value={formData.responses[questions[currentQuestionIndex].id] || ''} onChange={(e) => updateResponse(questions[currentQuestionIndex].id, e.target.value)} placeholder="Digite sua resposta..." rows={4} className="text-lg" autoFocus />
                )}
                
                {questions[currentQuestionIndex].question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {(Array.isArray(questions[currentQuestionIndex].options) ? questions[currentQuestionIndex].options : []).map((opt: string, idx: number) => (
                      <Button key={idx} type="button" variant={formData.responses[questions[currentQuestionIndex].id] === opt ? 'default' : 'outline'} className="w-full h-auto py-4 justify-start text-left" onClick={() => updateResponse(questions[currentQuestionIndex].id, opt)}>
                        <span className="h-6 w-6 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0">
                          {formData.responses[questions[currentQuestionIndex].id] === opt && <CheckCircle className="h-4 w-4" />}
                        </span>
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}
                
                {questions[currentQuestionIndex].question_type === 'yes_no' && (
                  <div className="flex gap-4">
                    <Button type="button" variant={formData.responses[questions[currentQuestionIndex].id] === 'Sim' ? 'default' : 'outline'} className="flex-1 h-14 text-lg" onClick={() => updateResponse(questions[currentQuestionIndex].id, 'Sim')}>Sim</Button>
                    <Button type="button" variant={formData.responses[questions[currentQuestionIndex].id] === 'Não' ? 'default' : 'outline'} className="flex-1 h-14 text-lg" onClick={() => updateResponse(questions[currentQuestionIndex].id, 'Não')}>Não</Button>
                  </div>
                )}
                
                {questions[currentQuestionIndex].question_type === 'scale' && (
                  <div className="flex gap-2 flex-wrap justify-center">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <Button key={num} type="button" variant={formData.responses[questions[currentQuestionIndex].id] === num ? 'default' : 'outline'} className="h-12 w-12 p-0 text-lg" onClick={() => updateResponse(questions[currentQuestionIndex].id, num)}>
                        {num}
                      </Button>
                    ))}
                  </div>
                )}

                {questions[currentQuestionIndex].question_type === 'link' && (
                  <Input type="url" value={formData.responses[questions[currentQuestionIndex].id] || ''} onChange={(e) => updateResponse(questions[currentQuestionIndex].id, e.target.value)} placeholder="https://..." className="h-12 text-lg" autoFocus />
                )}

                {questions[currentQuestionIndex].question_type === 'image' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          updateResponse(questions[currentQuestionIndex].id, { fileName: file.name, fileSize: file.size, preview: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }} />
                      {formData.responses[questions[currentQuestionIndex].id]?.preview ? (
                        <div className="space-y-2">
                          <img src={formData.responses[questions[currentQuestionIndex].id].preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                          <p className="text-sm text-muted-foreground">{formData.responses[questions[currentQuestionIndex].id].fileName}</p>
                          <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); updateResponse(questions[currentQuestionIndex].id, null); }}>Trocar imagem</Button>
                        </div>
                      ) : (
                        <>
                          <div className="h-12 w-12 mx-auto rounded-xl bg-primary/20 flex items-center justify-center mb-3">
                            <MessageSquare className="h-6 w-6 text-primary" />
                          </div>
                          <p className="text-foreground font-medium">Clique ou arraste uma imagem</p>
                          <p className="text-sm text-muted-foreground">PNG, JPG até 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {questions[currentQuestionIndex].question_type === 'disc' && (
                  <div className="space-y-2">
                    {(Array.isArray(questions[currentQuestionIndex].options) ? questions[currentQuestionIndex].options : []).map((opt: any, idx: number) => {
                      const optText = typeof opt === 'string' ? opt : opt?.text || '';
                      const optValue = typeof opt === 'string' ? opt : opt;
                      return (
                        <Button key={idx} type="button" variant={JSON.stringify(formData.responses[questions[currentQuestionIndex].id]) === JSON.stringify(optValue) ? 'default' : 'outline'} className="w-full h-auto py-4 justify-start text-left" onClick={() => updateResponse(questions[currentQuestionIndex].id, optValue)}>
                          <span className="h-6 w-6 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0">
                            {JSON.stringify(formData.responses[questions[currentQuestionIndex].id]) === JSON.stringify(optValue) && <CheckCircle className="h-4 w-4" />}
                          </span>
                          {optText}
                        </Button>
                      );
                    })}
                  </div>
                )}

                {!questions[currentQuestionIndex].is_required && (
                  <p className="text-sm text-muted-foreground text-center">Esta pergunta é opcional</p>
                )}
              </div>
            </OnboardingQuestionCard>
          )}

          {/* OTP Verification Step */}
          {step === 'otp' && (
            <OnboardingQuestionCard icon={CheckCircle} title="Verificar Email" subtitle={`Enviamos um código para ${formData.email}`}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Código de Verificação</label>
                  <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="h-16 text-center text-3xl tracking-[0.5em] font-mono" maxLength={6} autoFocus />
                </div>
                <Button variant="link" className="text-sm" onClick={sendOtp} disabled={isSubmitting}>Reenviar código</Button>
              </div>
            </OnboardingQuestionCard>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <OnboardingQuestionCard>
              <div className="text-center space-y-6">
                <div className="h-20 w-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-display font-bold text-foreground">Tudo pronto! 🎉</h1>
                  <p className="text-muted-foreground">Sua conta foi criada com sucesso. Redirecionando...</p>
                </div>
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </div>
            </OnboardingQuestionCard>
          )}

          {/* Navigation Buttons */}
          {step !== 'intro' && step !== 'complete' && (
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={handleNext} disabled={isSubmitting} className="gradient-gold text-primary-foreground">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {step === 'otp' ? 'Verificar e Criar Conta' : 'Continuar'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>Pressione <kbd className="px-2 py-1 bg-secondary rounded text-xs">Enter</kbd> para continuar</p>
      </footer>
    </div>
  );
};

export default Onboarding;
