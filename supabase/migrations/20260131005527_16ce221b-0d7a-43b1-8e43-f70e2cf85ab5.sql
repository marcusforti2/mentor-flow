
-- =====================================================
-- FASE 1: ESTRUTURA DO BANCO DE DADOS - MentorHub Pro
-- =====================================================

-- 1. ENUM para roles
CREATE TYPE public.app_role AS ENUM ('mentor', 'mentorado');

-- 2. Tabela de roles (separada por segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função SECURITY DEFINER para verificar roles (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 5. Policies para user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Mentors can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentors can assign roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'mentor'));

-- 6. Tabela de perfis
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Mentors can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. Tabela de configurações do mentor
CREATE TABLE public.mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    business_name TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#D4AF37',
    secondary_color TEXT DEFAULT '#3B82F6',
    bio TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage their own config"
ON public.mentors FOR ALL
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Mentorados can view mentor config"
ON public.mentors FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentorado'));

-- 8. Tabela de mentorados (vínculo com mentor)
CREATE TABLE public.mentorados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mentorados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can view their own record"
ON public.mentorados FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Mentors can manage mentorados"
ON public.mentorados FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- =====================================================
-- MÓDULO CRM
-- =====================================================

-- 9. Pipeline de leads do mentor
CREATE TABLE public.crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'negotiation', 'closed_won', 'closed_lost')),
    value DECIMAL(10,2),
    notes TEXT,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage their leads"
ON public.crm_leads FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 10. Prospecções dos mentorados (alimenta ranking)
CREATE TABLE public.crm_prospections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    company TEXT,
    status TEXT DEFAULT 'contacted' CHECK (status IN ('contacted', 'interested', 'meeting_scheduled', 'proposal_sent', 'closed_won', 'closed_lost')),
    notes TEXT,
    points INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.crm_prospections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can manage their prospections"
ON public.crm_prospections FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can view all prospections"
ON public.crm_prospections FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 11. Histórico de interações
CREATE TABLE public.crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    prospection_id UUID REFERENCES public.crm_prospections(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('call', 'email', 'meeting', 'whatsapp', 'note')),
    description TEXT,
    outcome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CHECK (lead_id IS NOT NULL OR prospection_id IS NOT NULL)
);

ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage lead interactions"
ON public.crm_interactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentorados can manage their interactions"
ON public.crm_interactions FOR ALL
TO authenticated
USING (
    prospection_id IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.crm_prospections p
        JOIN public.mentorados m ON m.id = p.mentorado_id
        WHERE p.id = prospection_id AND m.user_id = auth.uid()
    )
);

-- =====================================================
-- MÓDULO TRILHAS E CONTEÚDO
-- =====================================================

-- 12. Trilhas de aprendizado
CREATE TABLE public.trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage trails"
ON public.trails FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentorados can view published trails"
ON public.trails FOR SELECT
TO authenticated
USING (is_published = true AND public.has_role(auth.uid(), 'mentorado'));

-- 13. Módulos das trilhas
CREATE TABLE public.trail_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.trail_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage modules"
ON public.trail_modules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentorados can view modules"
ON public.trail_modules FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'mentorado') AND
    EXISTS (SELECT 1 FROM public.trails t WHERE t.id = trail_id AND t.is_published = true)
);

-- 14. Aulas/Lições
CREATE TABLE public.trail_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.trail_modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT CHECK (content_type IN ('video', 'pdf', 'text', 'quiz', 'recording')),
    content_url TEXT,
    content_text TEXT,
    duration_minutes INTEGER,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.trail_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage lessons"
ON public.trail_lessons FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentorados can view lessons"
ON public.trail_lessons FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentorado'));

-- 15. Progresso dos mentorados nas trilhas
CREATE TABLE public.trail_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES public.trail_lessons(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (mentorado_id, lesson_id)
);

ALTER TABLE public.trail_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can manage their progress"
ON public.trail_progress FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can view all progress"
ON public.trail_progress FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 16. Certificados
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE NOT NULL,
    certificate_url TEXT,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (mentorado_id, trail_id)
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can view their certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can manage certificates"
ON public.certificates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- =====================================================
-- MÓDULO CALENDÁRIO
-- =====================================================

-- 17. Encontros agendados
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    meeting_url TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    meeting_type TEXT DEFAULT 'group' CHECK (meeting_type IN ('group', 'individual', 'sos')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage meetings"
ON public.meetings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentorados can view meetings"
ON public.meetings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentorado'));

-- 18. Confirmação de presença
CREATE TABLE public.meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    confirmed BOOLEAN DEFAULT false,
    attended BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (meeting_id, mentorado_id)
);

ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can manage their attendance"
ON public.meeting_attendees FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can manage all attendance"
ON public.meeting_attendees FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 19. Gravações de encontros
CREATE TABLE public.meeting_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    recording_url TEXT NOT NULL,
    duration_minutes INTEGER,
    lesson_id UUID REFERENCES public.trail_lessons(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage recordings"
ON public.meeting_recordings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentorados can view recordings"
ON public.meeting_recordings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentorado'));

-- =====================================================
-- MÓDULO CENTRO DE TREINAMENTO (IA)
-- =====================================================

-- 20. Transcrições de calls
CREATE TABLE public.call_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    transcript_text TEXT NOT NULL,
    call_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can manage their transcripts"
ON public.call_transcripts FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can view all transcripts"
ON public.call_transcripts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 21. Análises geradas pela IA
CREATE TABLE public.call_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID REFERENCES public.call_transcripts(id) ON DELETE CASCADE NOT NULL UNIQUE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    strengths JSONB,
    weaknesses JSONB,
    objections_handled JSONB,
    objections_missed JSONB,
    suggestions JSONB,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.call_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can view their analyses"
ON public.call_analyses FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.call_transcripts ct
        JOIN public.mentorados m ON m.id = ct.mentorado_id
        WHERE ct.id = transcript_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can view all analyses"
ON public.call_analyses FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "System can insert analyses"
ON public.call_analyses FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- MÓDULO CENTRO SOS
-- =====================================================

-- 22. Solicitações urgentes
CREATE TABLE public.sos_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'scheduled', 'resolved', 'cancelled')),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can manage their SOS requests"
ON public.sos_requests FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can manage all SOS requests"
ON public.sos_requests FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 23. Respostas/atendimentos SOS
CREATE TABLE public.sos_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.sos_requests(id) ON DELETE CASCADE NOT NULL,
    responder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sos_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses to their requests"
ON public.sos_responses FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sos_requests sr
        JOIN public.mentorados m ON m.id = sr.mentorado_id
        WHERE sr.id = request_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can manage all responses"
ON public.sos_responses FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- =====================================================
-- MÓDULO GAMIFICAÇÃO
-- =====================================================

-- 24. Entradas do ranking
CREATE TABLE public.ranking_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    points INTEGER DEFAULT 0,
    period_type TEXT CHECK (period_type IN ('weekly', 'monthly', 'all_time')),
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (mentorado_id, period_type, period_start)
);

ALTER TABLE public.ranking_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view ranking"
ON public.ranking_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can manage ranking"
ON public.ranking_entries FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 25. Badges disponíveis
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    criteria TEXT,
    points_required INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage badges"
ON public.badges FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentorados can view badges"
ON public.badges FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentorado'));

-- 26. Conquistas desbloqueadas
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (mentorado_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view user badges"
ON public.user_badges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Mentors can manage user badges"
ON public.user_badges FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- =====================================================
-- MÓDULO EMAIL MARKETING
-- =====================================================

-- 27. Templates de email
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    merge_tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage email templates"
ON public.email_templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 28. Automações de email
CREATE TABLE public.email_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE CASCADE NOT NULL,
    trigger_type TEXT CHECK (trigger_type IN ('inactivity', 'ranking_change', 'trail_complete', 'onboarding', 'custom')),
    trigger_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage automations"
ON public.email_automations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 29. Log de emails enviados
CREATE TABLE public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID REFERENCES public.email_automations(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can view email logs"
ON public.email_logs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- =====================================================
-- MÓDULO TESTE COMPORTAMENTAL
-- =====================================================

-- 30. Perguntas do teste
CREATE TABLE public.behavioral_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT CHECK (question_type IN ('disc', 'enneagram', 'custom')),
    options JSONB NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.behavioral_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage questions"
ON public.behavioral_questions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Mentorados can view active questions"
ON public.behavioral_questions FOR SELECT
TO authenticated
USING (is_active = true AND public.has_role(auth.uid(), 'mentorado'));

-- 31. Respostas dos mentorados
CREATE TABLE public.behavioral_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.behavioral_questions(id) ON DELETE CASCADE NOT NULL,
    selected_option JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (mentorado_id, question_id)
);

ALTER TABLE public.behavioral_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can manage their responses"
ON public.behavioral_responses FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can view all responses"
ON public.behavioral_responses FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

-- 32. Relatórios comportamentais gerados pela IA
CREATE TABLE public.behavioral_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE CASCADE NOT NULL UNIQUE,
    disc_profile JSONB,
    enneagram_type INTEGER,
    strengths JSONB,
    challenges JSONB,
    sales_recommendations JSONB,
    communication_style TEXT,
    full_report TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.behavioral_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorados can view their report"
ON public.behavioral_reports FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mentorados m 
        WHERE m.id = mentorado_id AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can view all reports"
ON public.behavioral_reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "System can manage reports"
ON public.behavioral_reports FOR ALL
TO authenticated
WITH CHECK (true);

-- =====================================================
-- TRIGGERS E FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at em todas as tabelas relevantes
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mentors_updated_at BEFORE UPDATE ON public.mentors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mentorados_updated_at BEFORE UPDATE ON public.mentorados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_leads_updated_at BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_prospections_updated_at BEFORE UPDATE ON public.crm_prospections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trails_updated_at BEFORE UPDATE ON public.trails FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trail_modules_updated_at BEFORE UPDATE ON public.trail_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trail_lessons_updated_at BEFORE UPDATE ON public.trail_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trail_progress_updated_at BEFORE UPDATE ON public.trail_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_call_transcripts_updated_at BEFORE UPDATE ON public.call_transcripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sos_requests_updated_at BEFORE UPDATE ON public.sos_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ranking_entries_updated_at BEFORE UPDATE ON public.ranking_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_automations_updated_at BEFORE UPDATE ON public.email_automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_behavioral_reports_updated_at BEFORE UPDATE ON public.behavioral_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil no signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar Realtime para ranking
ALTER PUBLICATION supabase_realtime ADD TABLE public.ranking_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_prospections;
