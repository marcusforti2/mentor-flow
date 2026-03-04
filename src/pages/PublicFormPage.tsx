import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ArrowRight, ArrowUp, CheckCircle, ChevronDown,
  Upload as UploadIcon, Link as LinkIcon, ImageIcon,
} from "lucide-react";

/* ── types ── */
interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  order_index: number;
  is_required: boolean;
}

interface FormInfo {
  id: string;
  title: string;
  description: string | null;
  form_type: string;
  tenant_id: string;
  settings: any;
}

interface TenantBranding {
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  brand_attributes: any;
}

interface Slide {
  key: string;
  type: 'intro' | 'question' | 'complete';
  label?: string;
  subtitle?: string;
  required?: boolean;
  question?: Question;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const PublicFormPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<FormInfo | null>(null);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('down');

  /* ── build slides ── */
  const slides: Slide[] = useMemo(() => {
    const s: Slide[] = [{ key: 'intro', type: 'intro' }];
    for (const q of questions) {
      s.push({
        key: `q-${q.id}`,
        type: 'question',
        label: q.question_text,
        required: q.is_required,
        question: q,
      });
    }
    s.push({ key: 'complete', type: 'complete' });
    return s;
  }, [questions]);

  const totalSlides = slides.length;
  const slide = slides[currentSlide];

  /* ── fetch data ── */
  useEffect(() => {
    if (slug) fetchFormData();
  }, [slug]);

  const fetchFormData = async () => {
    try {
      // Fetch form by slug
      const { data: formData, error } = await supabase
        .from('tenant_forms')
        .select('id, title, description, form_type, tenant_id, settings, is_active')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !formData) {
        setIsLoading(false);
        return;
      }

      setForm(formData as FormInfo);

      // Fetch branding
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name, logo_url, primary_color, secondary_color, accent_color, brand_attributes')
        .eq('id', formData.tenant_id)
        .single();

      if (tenantData) setBranding(tenantData as TenantBranding);

      // Fetch questions
      const { data: qs } = await supabase
        .from('form_questions')
        .select('id, question_text, question_type, options, order_index, is_required')
        .eq('form_id', formData.id)
        .order('order_index', { ascending: true });

      setQuestions(qs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── branding colors ── */
  const primaryColor = branding?.primary_color || '#ffffff';
  const bgColor = branding?.brand_attributes?.background || '#000000';
  const isDark = isColorDark(bgColor);

  function isColorDark(color: string): boolean {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return true;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }

  const textColor = isDark ? '#ffffff' : '#000000';
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const textSecondary = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const hoverBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const selectedBg = primaryColor;
  const selectedText = isColorDark(primaryColor) ? '#ffffff' : '#000000';

  /* ── helpers ── */
  const getAnswer = (qId: string) => answers[qId];
  const setAnswer = (qId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  /* ── validation ── */
  const validateSlide = (): boolean => {
    if (slide?.type === 'question' && slide.required && slide.question) {
      const r = getAnswer(slide.question.id);
      if (r === undefined || r === null || r === '') {
        toast({ title: "Resposta obrigatória", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  /* ── submit ── */
  const submitForm = async () => {
    if (!form) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('form_submissions').insert({
        form_id: form.id,
        tenant_id: form.tenant_id,
        answers,
        respondent_name: answers._name || null,
        respondent_email: answers._email || null,
      });
      if (error) throw error;
      goTo(slides.length - 1);
      toast({ title: "Resposta enviada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── navigation ── */
  const goTo = (idx: number) => {
    setDirection(idx > currentSlide ? 'down' : 'up');
    setCurrentSlide(idx);
  };

  const handleNext = async () => {
    if (!validateSlide()) return;
    // If this is the last question, submit
    if (currentSlide === totalSlides - 2) {
      await submitForm();
      return;
    }
    if (currentSlide < totalSlides - 1) goTo(currentSlide + 1);
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
  }, [currentSlide, answers, isSubmitting]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* ── render helpers ── */
  const renderSelectOptions = (options: string[], value: string, onChange: (v: string) => void) => (
    <div className="space-y-3 w-full">
      {options.map((opt, i) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              background: selected ? selectedBg : hoverBg,
              color: selected ? selectedText : textColor,
              borderColor: selected ? selectedBg : borderColor,
            }}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-200 border"
          >
            <span
              style={{
                background: selected ? (isDark ? '#000' : '#fff') : hoverBg,
                color: selected ? (isDark ? '#fff' : '#000') : textMuted,
                borderColor: borderColor,
              }}
              className="h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 border"
            >
              {LETTERS[i]}
            </span>
            <span className="text-[15px] md:text-base font-medium">{opt}</span>
            {selected && <CheckCircle className="h-5 w-5 ml-auto shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${borderColor}`,
    color: textColor,
    fontSize: '1.5rem',
    padding: '0.75rem 0',
    outline: 'none',
    caretColor: primaryColor,
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    fontSize: '1.25rem',
    resize: 'none',
    minHeight: '80px',
  };

  const btnStyle: React.CSSProperties = {
    background: primaryColor,
    color: selectedText,
    fontWeight: 700,
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  };

  /* ── loading ── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bgColor }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: textMuted }} />
      </div>
    );
  }

  if (!form || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: bgColor }}>
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold" style={{ color: textColor }}>Formulário não encontrado</h1>
          <p style={{ color: textMuted }}>Este formulário não existe ou está inativo.</p>
        </div>
      </div>
    );
  }

  /* ── progress bar ── */
  const progress = totalSlides > 2 ? ((currentSlide) / (totalSlides - 2)) * 100 : 0;

  /* ── main render ── */
  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: bgColor, color: textColor }}>
      {/* Progress */}
      {slide?.type !== 'intro' && slide?.type !== 'complete' && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1" style={{ background: borderColor }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 100)}%`, background: primaryColor }}
          />
        </div>
      )}

      {/* Logo */}
      {branding?.logo_url && (
        <div className="fixed top-4 left-4 z-40">
          <img src={branding.logo_url} alt={branding.name} className="h-8 object-contain" />
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 md:py-20">
        <div className="w-full max-w-xl mx-auto px-6 animate-in fade-in-0 slide-in-from-bottom-6 duration-500" key={slide?.key}>

          {/* ── INTRO ── */}
          {slide?.type === 'intro' && (
            <div className="text-center space-y-8">
              <div className="space-y-4">
                {branding?.logo_url && (
                  <img src={branding.logo_url} alt={branding.name} className="h-12 mx-auto object-contain mb-6" />
                )}
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  {form.title}
                </h1>
                {form.description && (
                  <p className="text-xl md:text-2xl" style={{ color: textMuted }}>
                    {form.description}
                  </p>
                )}
                {branding?.name && (
                  <p style={{ color: textMuted }} className="text-base md:text-lg">
                    por <span style={{ color: textSecondary }} className="font-semibold">{branding.name}</span>
                  </p>
                )}
              </div>
              <button onClick={handleNext} style={btnStyle} className="hover:opacity-90 active:scale-95">
                Começar <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* ── QUESTION ── */}
          {slide?.type === 'question' && slide.question && (
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: textMuted }}>
                  {currentSlide} <span style={{ color: borderColor }}>→</span> {totalSlides - 2}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                  {slide.question.question_text}
                  {slide.required && <span className="text-red-400 ml-1">*</span>}
                </h2>
              </div>

              {/* text */}
              {slide.question.question_type === 'text' && (
                <input
                  value={getAnswer(slide.question.id) || ''}
                  onChange={(e) => setAnswer(slide.question.id, e.target.value)}
                  placeholder="Digite sua resposta..."
                  style={inputStyle}
                  autoFocus
                />
              )}

              {/* textarea */}
              {slide.question.question_type === 'textarea' && (
                <textarea
                  value={getAnswer(slide.question.id) || ''}
                  onChange={(e) => setAnswer(slide.question.id, e.target.value)}
                  placeholder="Digite sua resposta..."
                  style={textareaStyle}
                  rows={4}
                  autoFocus
                />
              )}

              {/* link */}
              {slide.question.question_type === 'link' && (
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-5 w-5 shrink-0" style={{ color: textMuted }} />
                  <input
                    type="url"
                    value={getAnswer(slide.question.id) || ''}
                    onChange={(e) => setAnswer(slide.question.id, e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                    autoFocus
                  />
                </div>
              )}

              {/* image */}
              {slide.question.question_type === 'image' && (
                <div className="space-y-4">
                  <label
                    className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200"
                    style={{ borderColor: getAnswer(slide.question.id)?.preview ? primaryColor : borderColor }}
                  >
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setAnswer(slide.question!.id, { fileName: file.name, fileSize: file.size, preview: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    {getAnswer(slide.question.id)?.preview ? (
                      <div className="space-y-3 text-center">
                        <img src={getAnswer(slide.question.id).preview} alt="Preview" className="max-h-52 mx-auto rounded-xl" />
                        <p className="text-sm" style={{ color: textMuted }}>{getAnswer(slide.question.id).fileName}</p>
                        <button type="button"
                          onClick={(e) => { e.preventDefault(); setAnswer(slide.question!.id, null); }}
                          className="text-sm underline underline-offset-4" style={{ color: textSecondary }}>
                          Trocar imagem
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: hoverBg }}>
                          <ImageIcon className="h-7 w-7" style={{ color: textMuted }} />
                        </div>
                        <p className="font-medium" style={{ color: textSecondary }}>Clique ou arraste uma imagem</p>
                        <p className="text-sm" style={{ color: textMuted }}>PNG, JPG até 10MB</p>
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
                  return renderSelectOptions(stringOpts, getAnswer(slide.question!.id) || '', (v) => setAnswer(slide.question!.id, v));
                })()
              )}

              {/* yes_no */}
              {slide.question.question_type === 'yes_no' && (
                <div className="flex gap-4">
                  {['Sim', 'Não'].map(opt => {
                    const selected = getAnswer(slide.question!.id) === opt;
                    return (
                      <button key={opt} onClick={() => setAnswer(slide.question!.id, opt)}
                        style={{
                          background: selected ? selectedBg : hoverBg,
                          color: selected ? selectedText : textColor,
                          borderColor: selected ? selectedBg : borderColor,
                        }}
                        className="flex-1 py-5 rounded-xl text-lg font-bold transition-all border">
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
                    const selected = getAnswer(slide.question!.id) === n;
                    return (
                      <button key={n} onClick={() => setAnswer(slide.question!.id, n)}
                        style={{
                          background: selected ? selectedBg : hoverBg,
                          color: selected ? selectedText : textColor,
                          borderColor: selected ? selectedBg : borderColor,
                          transform: selected ? 'scale(1.1)' : 'scale(1)',
                        }}
                        className="h-14 w-14 rounded-xl text-lg font-bold transition-all border">
                        {n}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* OK button for text types */}
              {['text', 'textarea', 'link'].includes(slide.question.question_type) && (
                <button onClick={handleNext} disabled={isSubmitting} style={btnStyle}
                  className="hover:opacity-90 active:scale-95 disabled:opacity-50">
                  OK <CheckCircle className="h-4 w-4" />
                </button>
              )}

              {!slide.required && (
                <p className="text-sm italic" style={{ color: textMuted }}>Opcional — pressione Enter para pular</p>
              )}
            </div>
          )}

          {/* ── COMPLETE ── */}
          {slide?.type === 'complete' && (
            <div className="text-center space-y-8">
              <div className="h-20 w-20 mx-auto rounded-full flex items-center justify-center"
                style={{ background: `${primaryColor}20` }}>
                <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold">Obrigado! 🎉</h1>
                <p style={{ color: textMuted }} className="text-lg">Sua resposta foi enviada com sucesso.</p>
              </div>
              {branding?.logo_url && (
                <img src={branding.logo_url} alt={branding.name} className="h-8 mx-auto object-contain opacity-50" />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom nav */}
      {slide?.type !== 'intro' && slide?.type !== 'complete' && (
        <footer className="fixed bottom-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={handleBack} disabled={currentSlide <= 0}
              className="h-10 w-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-20"
              style={{ background: hoverBg, color: textSecondary }}>
              <ArrowUp className="h-4 w-4" />
            </button>
            <button onClick={handleNext} disabled={isSubmitting}
              className="h-10 w-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-20"
              style={{ background: hoverBg, color: textSecondary }}>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs hidden md:block" style={{ color: textMuted }}>
            Pressione <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: hoverBg, color: textSecondary }}>Enter ↵</kbd>
          </p>
        </footer>
      )}
    </div>
  );
};

export default PublicFormPage;
