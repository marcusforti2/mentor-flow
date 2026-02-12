import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Documento conceitual completo do sistema LBV TECH
const SYSTEM_CONCEPT = `
Learning Brand - SISTEMA OPERACIONAL DE GOVERNO PARA MENTORIAS HIGH TICKET

Data de Concepção: Fevereiro 2025
Nome do Sistema: Learning Brand

=== TITULAR DOS DIREITOS DE PROPRIEDADE INTELECTUAL ===

MARCUS VINICIUS BARRETO FORTI 38791232848
Pessoa jurídica de direito privado
CNPJ/MF nº. 30.192.804/0001-09
Sede: Rua Vinte e Quatro de Fevereiro, nº.470, Centro, Capão Bonito/SP, CEP: 18300-360

Representada na forma de seu contrato social por seu sócio administrador:
Sr. Marcus Vinicius Barreto Forti
Nacionalidade: Brasileiro
Estado Civil: Casado
RG nº. 46.835.234-X
CPF/MF nº. 387.912.328-48

=== VISÃO GERAL E PROPÓSITO ===

Plataforma SaaS multi-tenant projetada para escalabilidade superior a 200 mentorados, focada no nicho de educação High Ticket (mentorias e consultorias) para profissionais de saúde (médicos, dentistas, advogados), com tickets de alto valor (R$ 50.000 a R$ 120.000).

O sistema opera como um "Sistema Operacional de Governo" para mentorias, adotando estética sóbria de "Sala de Guerra" com foco em previsibilidade de vendas, clareza de gargalos e tomada de decisão empresarial.

2. ARQUITETURA DE PORTAIS
- Portal do Mentor (/admin): Painel administrativo, Dashboard KPIs, Gestão de trilhas, Centro SOS, Calendário, Email marketing
- Portal do Mentorado (/app): Área gamificada, CRM pessoal, Arsenal de IA, Trilhas Netflix-style, Loja de prêmios, Centro SOS
- Sistema de Roles: admin_master (acesso total), mentor (painel admin), mentorado (área de membros)

3. MÓDULOS PROPRIETÁRIOS
3.1 Onboarding Automatizado (Estilo Typeform): Formulário personalizado, link único, fluxo visual, verificação OTP, criação automática de conta
3.2 Arsenal de Vendas (8 ferramentas de IA):
  - Qualificador de Leads (scraping Instagram/LinkedIn via Piloterr API, perfil DISC)
  - Hub de Comunicação (scripts, cold messages multi-canal, follow-up)
  - Simulador de Objeções (role-play baseado em DISC)
  - Criador de Propostas (ancoragem de valor)
  - Análise de Conversão (dashboard + insights IA)
  - Analisador de Calls (transcrição + scoring)
  - Gerador de Bio (otimização para redes)
  - Mentor Virtual 24/7 (chatbot contextual)
3.3 Sistema de Gamificação: Badges, streaks, pontos, ranking, loja de prêmios
3.4 CRM Individual: Pipeline Kanban, qualificação automática, histórico, screenshots
3.5 Centro SOS: Triagem IA, chat automatizado, agendamento, histórico
3.6 Sistema de Trilhas: Carrossel Netflix, módulos com vídeos, progresso, certificados
3.7 Calendário Integrado: Visualização semanal/mensal, eventos recorrentes, links de reunião
3.8 Email Marketing: Templates, automações, fluxos visuais, logs

4. ESTRUTURA DE DADOS (34 TABELAS)
Principais: profiles, user_roles, mentors, mentorados, mentorado_business_profiles
Gamificação: badges, user_badges, user_streaks, ranking_entries
CRM: crm_prospections, crm_interactions, crm_leads
IA: ai_tool_usage, behavioral_questions, behavioral_responses, behavioral_reports, call_transcripts, call_analyses, training_analyses, roleplay_simulations
Trilhas: trails, trail_modules, trail_lessons, trail_progress, certificates
Comunicação: email_templates, email_automations, email_flows, email_flow_executions, email_flow_triggers, email_logs, sos_requests, sos_responses
Calendário: calendar_events, meetings, meeting_attendees, meeting_recordings
Recompensas: reward_catalog, reward_redemptions
Autenticação: otp_codes

5. INTEGRAÇÕES TECNOLÓGICAS
Backend: Lovable Cloud (Supabase/PostgreSQL), 16+ Edge Functions, Row Level Security
APIs: Piloterr (scraping), Resend (emails), Lovable AI Gateway (Gemini 2.5), Apify, Firecrawl
Frontend: React 18, TypeScript, Tailwind CSS, Radix UI, React Flow, Recharts

6. DIFERENCIAIS INOVADORES
- Contexto Enriquecido de IA (compartilhamento de dados DISC/temperatura entre ferramentas)
- Scraping Automatizado de perfis sociais
- Gamificação Integrada completa
- Onboarding Passwordless via OTP
- Multi-tenant Isolado por mentor
- Role Play Contextualizado baseado em perfil comportamental real
`

// Lista de arquivos principais do sistema
const SYSTEM_FILES = [
  'src/App.tsx',
  'src/pages/admin/AdminDashboard.tsx',
  'src/pages/admin/Trilhas.tsx',
  'src/pages/admin/CentroSOS.tsx',
  'src/pages/admin/Calendario.tsx',
  'src/pages/admin/EmailMarketing.tsx',
  'src/pages/admin/Mentorados.tsx',
  'src/pages/member/MemberDashboard.tsx',
  'src/pages/member/FerramentasIA.tsx',
  'src/pages/member/MeuCRM.tsx',
  'src/pages/member/Trilhas.tsx',
  'src/pages/member/CentroSOS.tsx',
  'src/pages/member/LojaPremios.tsx',
  'src/pages/Onboarding.tsx',
  'src/components/ai-tools/LeadQualifier.tsx',
  'src/components/ai-tools/CommunicationHub.tsx',
  'src/components/ai-tools/ObjectionSimulator.tsx',
  'src/components/ai-tools/ProposalCreator.tsx',
  'src/components/ai-tools/ConversionAnalyzer.tsx',
  'src/components/ai-tools/TrainingAnalyzer.tsx',
  'src/components/ai-tools/BioGenerator.tsx',
  'src/components/ai-tools/VirtualMentor.tsx',
  'src/components/gamification/BadgeCard.tsx',
  'src/components/gamification/StreakCounter.tsx',
  'src/components/gamification/PointsBadge.tsx',
  'src/components/crm/LeadCard.tsx',
  'src/components/crm/KanbanColumn.tsx',
  'src/components/trails/TrailCarousel.tsx',
  'src/components/email/FlowEditor.tsx',
  'supabase/functions/ai-tools/index.ts',
  'supabase/functions/lead-qualifier/index.ts',
  'supabase/functions/cold-messages/index.ts',
  'supabase/functions/generate-bio/index.ts',
  'supabase/functions/sos-triage/index.ts',
  'supabase/functions/process-onboarding/index.ts',
  'supabase/functions/send-otp/index.ts',
  'supabase/functions/verify-otp/index.ts',
  'supabase/functions/check-badges/index.ts',
]

async function generateSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Montar conteúdo completo para hash
    const fullContent = [
      '=== DOCUMENTO CONCEITUAL ===',
      SYSTEM_CONCEPT,
      '',
      '=== LISTA DE ARQUIVOS DO SISTEMA ===',
      SYSTEM_FILES.join('\n'),
      '',
      '=== VERSÃO ===',
      '1.0.0',
      '',
      '=== TITULAR ===',
      'MARCUS VINICIUS BARRETO FORTI 38791232848',
      'CNPJ: 30.192.804/0001-09',
      'CPF: 387.912.328-48',
      '',
      '=== SISTEMA ===',
      'Learning Brand',
    ].join('\n')

    // Gerar hash SHA-256
    const sha256Hash = await generateSHA256(fullContent)
    const timestamp = new Date().toISOString()

    // Salvar no banco de dados
    const { data: fingerprint, error } = await supabase
      .from('system_fingerprints')
      .insert({
        sha256_hash: sha256Hash,
        content_summary: 'Learning Brand - Sistema Operacional de Governo para Mentorias High Ticket. Plataforma SaaS multi-tenant com 8 ferramentas de IA, gamificação, CRM, trilhas e mais.',
        full_content: fullContent,
        version: '1.0.0',
        author: 'Marcus Vinicius Barreto Forti',
        system_name: 'Learning Brand',
        metadata: {
          files_count: SYSTEM_FILES.length,
          concept_length: SYSTEM_CONCEPT.length,
          generated_at: timestamp,
          purpose: 'Registro de anterioridade para ata notarial',
          titular: {
            razao_social: 'MARCUS VINICIUS BARRETO FORTI 38791232848',
            cnpj: '30.192.804/0001-09',
            endereco: 'Rua Vinte e Quatro de Fevereiro, nº.470, Centro, Capão Bonito/SP, CEP: 18300-360',
            representante: 'Marcus Vinicius Barreto Forti',
            rg: '46.835.234-X',
            cpf: '387.912.328-48'
          }
        }
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving fingerprint:', error)
      throw error
    }

    console.log('Fingerprint generated successfully:', fingerprint.id)

    return new Response(
      JSON.stringify({
        success: true,
        fingerprint: {
          id: fingerprint.id,
          sha256_hash: fingerprint.sha256_hash,
          created_at: fingerprint.created_at,
          version: fingerprint.version,
          author: fingerprint.author,
          system_name: fingerprint.system_name
        },
        message: 'Fingerprint gerado e registrado com sucesso. Use estes dados na ata notarial.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in system-fingerprint:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})