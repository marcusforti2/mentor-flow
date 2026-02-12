import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const SANDBOX_TENANT = 'b0000000-0000-0000-0000-000000000002'

// ─── Helpers ───────────────────────────────────────────────
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)]
const ago = (days: number, hours = rand(8, 18)): string => {
  const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hours, rand(0, 59), 0, 0)
  return d.toISOString()
}
const future = (days: number, hours: number): string => {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hours, 0, 0, 0)
  return d.toISOString()
}
const periodStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
const periodEnd = () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]

async function getOrCreateUser(admin: any, email: string, name: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: 'Demo2026!', email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (!error) return data.user.id
  const { data: { users } } = await admin.auth.admin.listUsers()
  return users?.find((u: any) => u.email === email)?.id
}

// ─── Mentee Personas ──────────────────────────────────────
// Each mentee has a "persona" that defines their behavior pattern
interface Persona {
  name: string
  email: string
  business: string
  segment: string
  leadsCount: number      // CRM leads
  activityLevel: 'high' | 'medium' | 'low' | 'inactive'
  trailProgress: number   // 0-100 target %
  hasSOS: boolean
  sosCategory?: string
  sosTitle?: string
  sosDesc?: string
  temperature: 'hot' | 'warm' | 'cold'
  points: number
  joinDaysAgo: number     // how many days ago the mentee joined (controls Jornada CS week)
  businessProfile: {
    business_type: string
    monthly_revenue: string
    team_size: string
    main_offer: string
    target_audience: string
    maturity_level: string
    daily_prospection_goal: number
  }
}

const PERSONAS: Persona[] = [
  {
    name: 'Ana Carolina Martins', email: 'ana.martins.demo@lbvpreview.com',
    business: 'AC Consultoria Empresarial', segment: 'Consultoria',
    leadsCount: 35, activityLevel: 'high', trailProgress: 100, hasSOS: false,
    temperature: 'hot', points: 480, joinDaysAgo: 2,
    businessProfile: { business_type: 'Consultoria', monthly_revenue: 'R$ 30-50k', team_size: '3-5', main_offer: 'Consultoria de gestão para PMEs', target_audience: 'PMEs de 10-50 funcionários', maturity_level: 'scaling', daily_prospection_goal: 8 },
  },
  {
    name: 'Bruno Henrique Costa', email: 'bruno.costa.demo@lbvpreview.com',
    business: 'BH Marketing Digital', segment: 'Marketing',
    leadsCount: 22, activityLevel: 'high', trailProgress: 75, hasSOS: false,
    temperature: 'warm', points: 350, joinDaysAgo: 5,
    businessProfile: { business_type: 'Agência', monthly_revenue: 'R$ 20-30k', team_size: '2-3', main_offer: 'Gestão de tráfego pago', target_audience: 'E-commerces e infoprodutores', maturity_level: 'growing', daily_prospection_goal: 6 },
  },
  {
    name: 'Camila Ferreira Santos', email: 'camila.santos.demo@lbvpreview.com',
    business: 'CF Design Studio', segment: 'Design',
    leadsCount: 8, activityLevel: 'medium', trailProgress: 45, hasSOS: false,
    temperature: 'warm', points: 210, joinDaysAgo: 9,
    businessProfile: { business_type: 'Studio', monthly_revenue: 'R$ 8-15k', team_size: '1-2', main_offer: 'Identidade visual e branding', target_audience: 'Startups e marcas em lançamento', maturity_level: 'early', daily_prospection_goal: 4 },
  },
  {
    name: 'Diego Oliveira Lima', email: 'diego.lima.demo@lbvpreview.com',
    business: 'DOL Tecnologia', segment: 'SaaS',
    leadsCount: 50, activityLevel: 'high', trailProgress: 90, hasSOS: false,
    temperature: 'hot', points: 520, joinDaysAgo: 12,
    businessProfile: { business_type: 'SaaS', monthly_revenue: 'R$ 50-80k', team_size: '5-10', main_offer: 'ERP para restaurantes', target_audience: 'Restaurantes e bares', maturity_level: 'scaling', daily_prospection_goal: 10 },
  },
  {
    name: 'Elena Rodrigues Souza', email: 'elena.souza.demo@lbvpreview.com',
    business: 'ES Coaching Executivo', segment: 'Coaching',
    leadsCount: 15, activityLevel: 'medium', trailProgress: 60, hasSOS: true,
    sosCategory: 'crm', sosTitle: 'Dificuldade com follow-up', sosDesc: 'Não consigo manter cadência de follow-up com meus leads. Preciso de ajuda para organizar meu processo de contato.',
    temperature: 'warm', points: 275, joinDaysAgo: 16,
    businessProfile: { business_type: 'Coaching', monthly_revenue: 'R$ 15-25k', team_size: '1', main_offer: 'Coaching executivo 1:1', target_audience: 'C-levels e diretores', maturity_level: 'growing', daily_prospection_goal: 5 },
  },
  {
    name: 'Felipe Almeida Rocha', email: 'felipe.rocha.demo@lbvpreview.com',
    business: 'FA Vendas B2B', segment: 'Vendas',
    leadsCount: 3, activityLevel: 'low', trailProgress: 15, hasSOS: true,
    sosCategory: 'motivation', sosTitle: 'Desmotivado com resultados', sosDesc: 'Estou há 2 semanas sem fechar nenhum negócio. Sinto que meu script não está funcionando e preciso de orientação urgente.',
    temperature: 'cold', points: 65, joinDaysAgo: 20,
    businessProfile: { business_type: 'Representação', monthly_revenue: 'R$ 3-8k', team_size: '1', main_offer: 'Representação comercial B2B', target_audience: 'Indústrias de pequeno porte', maturity_level: 'early', daily_prospection_goal: 3 },
  },
  {
    name: 'Gabriela Nascimento Dias', email: 'gabriela.dias.demo@lbvpreview.com',
    business: 'GN Treinamentos Corporativos', segment: 'Treinamentos',
    leadsCount: 28, activityLevel: 'high', trailProgress: 85, hasSOS: false,
    temperature: 'hot', points: 410, joinDaysAgo: 24,
    businessProfile: { business_type: 'Treinamentos', monthly_revenue: 'R$ 25-40k', team_size: '3-5', main_offer: 'Treinamentos in-company de liderança', target_audience: 'Empresas médias (50-200 funcionários)', maturity_level: 'scaling', daily_prospection_goal: 7 },
  },
  {
    name: 'Henrique Barbosa Mendes', email: 'henrique.mendes.demo@lbvpreview.com',
    business: 'HB Soluções Financeiras', segment: 'Finanças',
    leadsCount: 12, activityLevel: 'medium', trailProgress: 55, hasSOS: false,
    temperature: 'warm', points: 190, joinDaysAgo: 27,
    businessProfile: { business_type: 'Consultoria Financeira', monthly_revenue: 'R$ 12-20k', team_size: '2', main_offer: 'Planejamento financeiro para empresas', target_audience: 'Empresários com faturamento acima de R$500k/ano', maturity_level: 'growing', daily_prospection_goal: 5 },
  },
  {
    name: 'Isabela Torres Vieira', email: 'isabela.vieira.demo@lbvpreview.com',
    business: 'IT Arquitetura de Negócios', segment: 'Arquitetura',
    leadsCount: 5, activityLevel: 'inactive', trailProgress: 10, hasSOS: false,
    temperature: 'cold', points: 30, joinDaysAgo: 38,
    businessProfile: { business_type: 'Arquitetura', monthly_revenue: 'R$ 5-10k', team_size: '1', main_offer: 'Projetos de arquitetura comercial', target_audience: 'Donos de lojas e franquias', maturity_level: 'early', daily_prospection_goal: 2 },
  },
  {
    name: 'João Pedro Carvalho', email: 'joao.carvalho.demo@lbvpreview.com',
    business: 'JP Automação Comercial', segment: 'Automação',
    leadsCount: 42, activityLevel: 'high', trailProgress: 95, hasSOS: false,
    temperature: 'hot', points: 490, joinDaysAgo: 50,
    businessProfile: { business_type: 'Automação', monthly_revenue: 'R$ 40-60k', team_size: '4-6', main_offer: 'Automação de processos comerciais', target_audience: 'Empresas B2B com time de vendas', maturity_level: 'scaling', daily_prospection_goal: 9 },
  },
]

// ─── CRM Lead Generator ───────────────────────────────────
const LEAD_STATUSES = ['contacted', 'interested', 'meeting_scheduled', 'proposal_sent', 'closed_won', 'closed_lost']
const LEAD_TEMPS = ['quente', 'morno', 'frio']
const COMPANIES = [
  'TechNova Solutions', 'Vertex Sistemas', 'Prisma Digital', 'Nexus Consulting',
  'Atlas Cloud', 'Orion Software', 'Zenith Labs', 'Quantum Services',
  'Stellar Brands', 'Nova Logística', 'Apex Distribuidora', 'Sigma Engenharia',
  'Delta Transportes', 'Beta Automação', 'Gamma Indústria', 'Omega Pharma',
  'Alpha Educação', 'Kappa Seguros', 'Theta Marketing', 'Iota Agro',
  'Rho Energia', 'Pi Construções', 'Tau Alimentos', 'Upsilon Textil',
]
const FIRST_NAMES = ['Ricardo', 'Mariana', 'Carlos', 'Juliana', 'Roberto', 'Fernanda', 'André', 'Patricia', 'Marcos', 'Luciana', 'Thiago', 'Amanda', 'Rafael', 'Daniela', 'Eduardo', 'Beatriz', 'Gustavo', 'Larissa', 'Leonardo', 'Natalia']
const LAST_NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Barbosa', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Moreira', 'Vieira']

function generateLeads(count: number, persona: Persona) {
  const leads: any[] = []
  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES)
    const lastName = pick(LAST_NAMES)
    const company = pick(COMPANIES)
    // Distribute statuses based on persona temperature
    let statusWeights: number[]
    if (persona.temperature === 'hot') {
      statusWeights = [10, 15, 25, 25, 20, 5] // more in negotiation/won
    } else if (persona.temperature === 'warm') {
      statusWeights = [20, 25, 20, 20, 10, 5]
    } else {
      statusWeights = [40, 25, 15, 10, 5, 5]
    }
    const totalWeight = statusWeights.reduce((a, b) => a + b, 0)
    let r = rand(1, totalWeight), cumulative = 0, statusIdx = 0
    for (let j = 0; j < statusWeights.length; j++) {
      cumulative += statusWeights[j]
      if (r <= cumulative) { statusIdx = j; break }
    }

    const daysAgo = rand(1, 60)
    const notes = [
      `Primeiro contato via LinkedIn. ${firstName} demonstrou interesse no serviço.`,
      `Reunião agendada para discutir proposta. Empresa com potencial alto.`,
      `Lead veio por indicação. Já conhece nosso trabalho.`,
      `Contato feito por cold email. Resposta positiva.`,
      `Encontro no evento de networking. Trocamos cartões.`,
      `Prospect ativo no LinkedIn. Engaja com conteúdo sobre ${persona.segment}.`,
      null,
    ]

    leads.push({
      contact_name: `${firstName} ${lastName}`,
      company,
      contact_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com`,
      contact_phone: `+5511${rand(90000, 99999)}${rand(1000, 9999)}`,
      status: LEAD_STATUSES[statusIdx],
      temperature: LEAD_TEMPS[rand(0, 2)],
      points: rand(5, 30),
      notes: pick(notes),
      created_at: ago(daysAgo),
      updated_at: ago(Math.max(0, daysAgo - rand(0, 5))),
      profile_url: rand(0, 1) ? `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}` : null,
    })
  }
  return leads
}

// ─── Activity Log Generator ───────────────────────────────
const ACTIVITY_TYPES = [
  { type: 'trail_started', desc: (n: string) => `${n} iniciou uma nova trilha`, points: 5 },
  { type: 'lesson_completed', desc: (n: string) => `${n} concluiu uma aula`, points: 10 },
  { type: 'prospection_added', desc: (n: string) => `${n} adicionou um novo lead ao CRM`, points: 5 },
  { type: 'crm_updated', desc: (n: string) => `${n} atualizou status de um lead`, points: 3 },
  { type: 'ai_tool_used', desc: (n: string) => `${n} utilizou ferramenta de IA`, points: 2 },
  { type: 'meeting_attended', desc: (n: string) => `${n} participou de um encontro`, points: 15 },
  { type: 'proposal_sent', desc: (n: string) => `${n} enviou uma proposta comercial`, points: 8 },
  { type: 'deal_closed', desc: (n: string) => `${n} fechou um negócio!`, points: 25 },
]

function generateActivities(persona: Persona) {
  const count = persona.activityLevel === 'high' ? rand(15, 25) :
                persona.activityLevel === 'medium' ? rand(8, 14) :
                persona.activityLevel === 'low' ? rand(2, 5) : rand(0, 1)
  const activities: any[] = []
  for (let i = 0; i < count; i++) {
    const at = pick(ACTIVITY_TYPES)
    const daysAgo = persona.activityLevel === 'high' ? rand(0, 14) :
                    persona.activityLevel === 'medium' ? rand(0, 21) :
                    persona.activityLevel === 'low' ? rand(7, 30) : rand(20, 45)
    activities.push({
      action_type: at.type,
      action_description: at.desc(persona.name.split(' ')[0]),
      points_earned: at.points,
      created_at: ago(daysAgo),
    })
  }
  return activities
}

// ─── AI Tool Usage Generator ──────────────────────────────
const AI_TOOLS = ['bio_generator', 'cold_message', 'lead_qualifier', 'script_generator', 'objection_simulator', 'follow_up_coach', 'proposal_creator', 'conversion_analyzer']

function generateAIUsage(persona: Persona) {
  const count = persona.activityLevel === 'high' ? rand(8, 15) :
                persona.activityLevel === 'medium' ? rand(3, 7) :
                persona.activityLevel === 'low' ? rand(0, 2) : 0
  const usage: any[] = []
  for (let i = 0; i < count; i++) {
    usage.push({
      tool_type: pick(AI_TOOLS),
      created_at: ago(rand(0, 30)),
    })
  }
  return usage
}

// ─── Main Seed Function ───────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const T = SANDBOX_TENANT

    console.log('[seed] Starting comprehensive simulation seed...')

    // ━━━ PHASE 1: CLEANUP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('[seed] Phase 1: Cleanup...')
    const { data: oldMemberships } = await admin.from('memberships').select('id, user_id').eq('tenant_id', T)
    if (oldMemberships?.length) {
      const mIds = oldMemberships.map(m => m.id)
      const uIds = oldMemberships.map(m => m.user_id)

      // Deep dependents first
      await admin.from('trail_progress').delete().eq('tenant_id', T)
      await admin.from('sos_responses').delete().in('request_id',
        (await admin.from('sos_requests').select('id').eq('tenant_id', T)).data?.map((s: any) => s.id) || []
      )
      await admin.from('sos_requests').delete().eq('tenant_id', T)
      await admin.from('crm_interactions').delete().in('prospection_id',
        (await admin.from('crm_prospections').select('id').eq('tenant_id', T)).data?.map((p: any) => p.id) || []
      )
      await admin.from('crm_prospections').delete().eq('tenant_id', T)
      await admin.from('activity_logs').delete().eq('tenant_id', T)
      await admin.from('ai_tool_usage').delete().eq('tenant_id', T)
      await admin.from('community_messages').delete().eq('tenant_id', T)

      // Community posts and related
      const { data: posts } = await admin.from('community_posts').select('id').eq('tenant_id', T)
      if (posts?.length) {
        const pIds = posts.map(p => p.id)
        await admin.from('community_comments').delete().in('post_id', pIds)
        await admin.from('community_likes').delete().in('post_id', pIds)
        await admin.from('community_posts').delete().eq('tenant_id', T)
      }

      // Meetings
      const { data: meetings } = await admin.from('meetings').select('id').eq('tenant_id', T)
      if (meetings?.length) {
        const meetIds = meetings.map(m => m.id)
        await admin.from('meeting_attendees').delete().in('meeting_id', meetIds)
        await admin.from('meeting_recordings').delete().in('meeting_id', meetIds)
        await admin.from('meetings').delete().eq('tenant_id', T)
      }

      // Trails
      const { data: trails } = await admin.from('trails').select('id').eq('tenant_id', T)
      if (trails?.length) {
        const tIds = trails.map(t => t.id)
        const { data: mods } = await admin.from('trail_modules').select('id').in('trail_id', tIds)
        if (mods?.length) {
          await admin.from('trail_lessons').delete().in('module_id', mods.map(m => m.id))
        }
        await admin.from('trail_modules').delete().in('trail_id', tIds)
        await admin.from('trails').delete().eq('tenant_id', T)
      }

      // Mentee/mentor profiles & assignments
      await admin.from('mentor_mentee_assignments').delete().eq('tenant_id', T)
      await admin.from('mentee_profiles').delete().in('membership_id', mIds)
      await admin.from('mentor_profiles').delete().in('membership_id', mIds)

      // Mentorado-related deep cleanup
      const { data: mentorados } = await admin.from('mentorados').select('id').in('user_id', uIds)
      if (mentorados?.length) {
        const mdIds = mentorados.map(m => m.id)
        await admin.from('ranking_entries').delete().in('mentorado_id', mdIds)
        await admin.from('mentorado_business_profiles').delete().in('mentorado_id', mdIds)
        await admin.from('mentorado_files').delete().in('mentorado_id', mdIds)
        await admin.from('behavioral_responses').delete().in('mentorado_id', mdIds)
        await admin.from('behavioral_reports').delete().in('mentorado_id', mdIds)
        await admin.from('mentorados').delete().in('id', mdIds)
      }

      // Legacy mentors
      await admin.from('mentors').delete().in('user_id', uIds)

      // Memberships
      await admin.from('memberships').delete().eq('tenant_id', T)

      // Profiles & auth users — ONLY delete users that have NO memberships in other tenants
      for (const uid of uIds) {
        const { data: otherMemberships } = await admin.from('memberships')
          .select('id')
          .eq('user_id', uid)
          .neq('tenant_id', T)
          .limit(1)
        
        // Skip users that belong to real tenants
        if (otherMemberships && otherMemberships.length > 0) {
          console.log(`[seed] Skipping user ${uid} — has memberships in other tenants`)
          continue
        }
        
        await admin.from('profiles').delete().eq('user_id', uid)
        try { await admin.auth.admin.deleteUser(uid) } catch (_) {}
      }
    }

    console.log('[seed] Cleanup complete.')

    // ━━━ PHASE 2: CREATE MENTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('[seed] Phase 2: Creating mentor...')
    const mentorUserId = await getOrCreateUser(admin, 'mentor.erika.demo@lbvpreview.com', 'Erika Silveira (Demo)')
    if (!mentorUserId) throw new Error('Failed to create mentor user')

    await admin.from('profiles').upsert({
      user_id: mentorUserId,
      full_name: 'Erika Silveira (Demo)',
      email: 'mentor.erika.demo@lbvpreview.com',
      phone: '+5511999001000',
    }, { onConflict: 'user_id' })

    const { data: mentorMembership } = await admin.from('memberships').insert({
      user_id: mentorUserId, tenant_id: T, role: 'mentor', status: 'active',
    }).select('id').single()
    if (!mentorMembership) throw new Error('Failed to create mentor membership')

    await admin.from('mentor_profiles').insert({
      membership_id: mentorMembership.id,
      business_name: 'Atlas Sales Invest (Demo)',
      bio: 'Mentora especialista em vendas B2B e prospecção ativa. +10 anos de experiência no mercado.',
      specialties: ['Vendas B2B', 'Prospecção', 'CRM', 'Negociação', 'Social Selling'],
      website: 'https://atlassalesinvest.com.br',
    })

    // Legacy mentor record (for tables that reference mentors.id)
    const { data: legacyMentor } = await admin.from('mentors').insert({
      user_id: mentorUserId,
      business_name: 'Atlas Sales Invest (Demo)',
      bio: 'Mentora especialista em vendas B2B',
    }).select('id').single()
    if (!legacyMentor) throw new Error('Failed to create legacy mentor')

    console.log('[seed] Mentor created:', mentorMembership.id)

    // ━━━ PHASE 3: CREATE MENTEES ━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('[seed] Phase 3: Creating mentees...')
    const menteeResults: { uid: string; memId: string; mentoradoId: string; persona: Persona }[] = []

    for (const persona of PERSONAS) {
      const uid = await getOrCreateUser(admin, persona.email, persona.name)
      if (!uid) { console.warn('[seed] Failed to create user for', persona.name); continue }

      await admin.from('profiles').upsert({
        user_id: uid, full_name: persona.name, email: persona.email,
        phone: `+5511${rand(90000, 99999)}${rand(1000, 9999)}`,
      }, { onConflict: 'user_id' })

      const joinedDaysAgo = persona.joinDaysAgo
      const joinedAt = ago(joinedDaysAgo)

      const { data: mem } = await admin.from('memberships').insert({
        user_id: uid, tenant_id: T, role: 'mentee', status: 'active',
      }).select('id').single()
      if (!mem) continue

      await admin.from('mentee_profiles').insert({
        membership_id: mem.id,
        business_name: persona.business,
        onboarding_completed: true,
        joined_at: joinedAt,
      })

      await admin.from('mentor_mentee_assignments').insert({
        mentor_membership_id: mentorMembership.id,
        mentee_membership_id: mem.id,
        tenant_id: T, status: 'active',
        assigned_at: joinedAt,
        created_by_membership_id: mentorMembership.id,
      })

      // Legacy mentorado
      const { data: mentorado } = await admin.from('mentorados').insert({
        user_id: uid, mentor_id: legacyMentor.id,
        status: persona.activityLevel === 'inactive' ? 'inactive' : 'active',
        onboarding_completed: true, joined_at: joinedAt,
      }).select('id').single()
      if (!mentorado) continue

      menteeResults.push({ uid, memId: mem.id, mentoradoId: mentorado.id, persona })

      // Ranking
      await admin.from('ranking_entries').insert({
        mentorado_id: mentorado.id,
        points: persona.points,
        period_type: 'monthly',
        period_start: periodStart(),
        period_end: periodEnd(),
      })

      // Business profile
      await admin.from('mentorado_business_profiles').insert({
        mentorado_id: mentorado.id,
        business_name: persona.business,
        ...persona.businessProfile,
      })

      // CRM Leads
      const leads = generateLeads(persona.leadsCount, persona)
      for (const lead of leads) {
        await admin.from('crm_prospections').insert({
          membership_id: mem.id, tenant_id: T, mentorado_id: mentorado.id,
          ...lead,
        })
      }

      // Activity Logs
      const activities = generateActivities(persona)
      for (const act of activities) {
        await admin.from('activity_logs').insert({
          membership_id: mem.id, tenant_id: T, mentorado_id: mentorado.id,
          ...act,
        })
      }

      // AI Tool Usage
      const aiUsage = generateAIUsage(persona)
      for (const usage of aiUsage) {
        await admin.from('ai_tool_usage').insert({
          membership_id: mem.id, tenant_id: T, mentorado_id: mentorado.id,
          ...usage,
        })
      }

      // SOS Requests
      if (persona.hasSOS) {
        await admin.from('sos_requests').insert({
          mentorado_id: mentorado.id,
          membership_id: mem.id,
          tenant_id: T,
          title: persona.sosTitle!,
          description: persona.sosDesc!,
          category: persona.sosCategory,
          priority: persona.temperature === 'cold' ? 'high' : 'medium',
          status: 'pending',
          created_at: ago(rand(1, 3)),
        })
      }

      console.log(`[seed] Mentee ${persona.name}: ${persona.leadsCount} leads, ${activities.length} activities`)
    }

    // ━━━ PHASE 4: TRAILS WITH PROGRESS ━━━━━━━━━━━━━━━━━━━
    console.log('[seed] Phase 4: Creating trails with progress...')

    const TRAILS_DATA = [
      {
        title: 'Fundamentos de Prospecção B2B',
        description: 'Domine as técnicas essenciais de prospecção para vendas B2B. Da pesquisa de ICP ao primeiro contato efetivo.',
        img: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',
        featured: true,
        modules: [
          { title: 'Introdução à Prospecção', lessons: [
            { title: 'O que é prospecção B2B?', dur: 12 },
            { title: 'Perfil do Cliente Ideal (ICP)', dur: 18 },
            { title: 'Ferramentas de pesquisa de prospects', dur: 15 },
            { title: 'Montando sua lista de prospecção', dur: 20 },
          ]},
          { title: 'Técnicas de Primeiro Contato', lessons: [
            { title: 'Cold calling: do zero ao sim', dur: 25 },
            { title: 'Social selling no LinkedIn', dur: 22 },
            { title: 'Email de prospecção que converte', dur: 18 },
            { title: 'Abordagem multicanal', dur: 15 },
          ]},
          { title: 'Qualificação de Leads', lessons: [
            { title: 'Framework BANT', dur: 20 },
            { title: 'Framework SPIN Selling', dur: 25 },
            { title: 'Scoring de leads na prática', dur: 15 },
          ]},
        ],
      },
      {
        title: 'Negociação e Fechamento Avançado',
        description: 'Técnicas avançadas de negociação, contorno de objeções e fechamento para vendas consultivas de alto ticket.',
        img: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80',
        featured: false,
        modules: [
          { title: 'Psicologia da Venda', lessons: [
            { title: 'Gatilhos mentais em vendas', dur: 20 },
            { title: 'Construindo rapport rápido', dur: 15 },
            { title: 'Linguagem corporal em reuniões', dur: 18 },
          ]},
          { title: 'Contorno de Objeções', lessons: [
            { title: 'As 7 objeções mais comuns', dur: 22 },
            { title: 'Técnica do espelhamento', dur: 15 },
            { title: 'Reframing de preço', dur: 20 },
          ]},
          { title: 'Técnicas de Fechamento', lessons: [
            { title: 'Fechamento por alternativa', dur: 12 },
            { title: 'Fechamento por urgência', dur: 15 },
            { title: 'Follow-up pós-proposta', dur: 18 },
            { title: 'Negociação final e contrato', dur: 25 },
          ]},
        ],
      },
      {
        title: 'CRM e Pipeline de Vendas',
        description: 'Organize seu processo comercial com CRM, pipeline estruturado e métricas que importam.',
        img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
        featured: false,
        modules: [
          { title: 'Fundamentos de CRM', lessons: [
            { title: 'Por que usar CRM?', dur: 10 },
            { title: 'Configurando seu pipeline', dur: 20 },
            { title: 'Cadastro e qualificação de leads', dur: 15 },
          ]},
          { title: 'Métricas e KPIs', lessons: [
            { title: 'Taxa de conversão por etapa', dur: 18 },
            { title: 'Tempo médio de fechamento', dur: 15 },
            { title: 'Forecast de vendas', dur: 20 },
          ]},
        ],
      },
    ]

    const allLessonIds: string[] = []
    const trailLessonMap: Map<string, string[]> = new Map() // trailId -> lessonIds

    for (let i = 0; i < TRAILS_DATA.length; i++) {
      const td = TRAILS_DATA[i]
      const { data: trail } = await admin.from('trails').insert({
        mentor_id: legacyMentor.id,
        tenant_id: T,
        creator_membership_id: mentorMembership.id,
        title: td.title,
        description: td.description,
        thumbnail_url: td.img,
        is_published: true,
        is_featured: td.featured,
        order_index: i,
      }).select('id').single()
      if (!trail) continue

      const thisTrailLessons: string[] = []

      for (let j = 0; j < td.modules.length; j++) {
        const mod = td.modules[j]
        const { data: module } = await admin.from('trail_modules').insert({
          trail_id: trail.id,
          title: mod.title,
          order_index: j,
        }).select('id').single()
        if (!module) continue

        for (let k = 0; k < mod.lessons.length; k++) {
          const les = mod.lessons[k]
          const { data: lesson } = await admin.from('trail_lessons').insert({
            module_id: module.id,
            title: les.title,
            content_type: 'video',
            content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration_minutes: les.dur,
            order_index: k,
          }).select('id').single()
          if (lesson) {
            allLessonIds.push(lesson.id)
            thisTrailLessons.push(lesson.id)
          }
        }
      }

      trailLessonMap.set(trail.id, thisTrailLessons)
    }

    // Trail progress per mentee
    for (const mr of menteeResults) {
      const target = mr.persona.trailProgress / 100
      for (const [_trailId, lessonIds] of trailLessonMap) {
        const completedCount = Math.floor(lessonIds.length * target)
        for (let i = 0; i < lessonIds.length; i++) {
          const completed = i < completedCount
          const progress = completed ? 100 : (i === completedCount ? rand(10, 80) : 0)
          if (progress > 0) {
            await admin.from('trail_progress').insert({
              mentorado_id: mr.mentoradoId,
              membership_id: mr.memId,
              tenant_id: T,
              lesson_id: lessonIds[i],
              completed,
              completed_at: completed ? ago(rand(5, 60)) : null,
              progress_percent: progress,
            })
          }
        }
      }
    }

    console.log('[seed] Trails and progress created.')

    // ━━━ PHASE 5: MEETINGS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('[seed] Phase 5: Creating meetings...')

    const MEETINGS = [
      // Future meetings
      { title: 'Mentoria em Grupo - Pipeline', d: 2, h: 10, type: 'group' },
      { title: 'Workshop: LinkedIn para Vendas', d: 4, h: 14, type: 'group' },
      { title: 'Encontro Semanal - Sprint de Prospecção', d: 7, h: 9, type: 'group' },
      { title: 'Masterclass: Fechamento de Alto Ticket', d: 9, h: 15, type: 'group' },
      { title: 'Review de Pipeline Individual', d: 12, h: 10, type: 'individual' },
      { title: 'Live Q&A - Tirando Dúvidas', d: 15, h: 19, type: 'group' },
      { title: 'Hotset 1:1 com Top Performers', d: 18, h: 11, type: 'individual' },
      { title: 'Sprint Prospecção - Dia D', d: 21, h: 10, type: 'group' },
      // Past meetings (completed)
      { title: 'Kick-off da Mentoria', d: -30, h: 10, type: 'group' },
      { title: 'Workshop: Cold Calling', d: -21, h: 14, type: 'group' },
      { title: 'Review Pipeline - Semana 2', d: -14, h: 9, type: 'group' },
      { title: 'Masterclass: Objeções', d: -10, h: 15, type: 'group' },
      { title: 'Mentoria Individual - Performance', d: -7, h: 10, type: 'individual' },
      { title: 'Encontro Semanal - Resultados', d: -3, h: 16, type: 'group' },
      { title: 'Sprint Final do Mês', d: -1, h: 10, type: 'group' },
    ]

    const createdMeetings: { id: string; isPast: boolean }[] = []

    for (const m of MEETINGS) {
      const isPast = m.d < 0
      const { data: meeting } = await admin.from('meetings').insert({
        mentor_id: legacyMentor.id,
        tenant_id: T,
        title: m.title,
        scheduled_at: future(m.d, m.h),
        duration_minutes: m.type === 'masterclass' ? 90 : m.type === 'individual' ? 30 : 60,
        meeting_url: 'https://meet.google.com/demo-sandbox',
        meeting_type: m.type,
        status: isPast ? 'completed' : 'scheduled',
        description: isPast
          ? `Encontro ${m.type} realizado com sucesso.`
          : `Encontro ${m.type} agendado.`,
      }).select('id').single()

      if (meeting) {
        createdMeetings.push({ id: meeting.id, isPast })

        // Add attendees (past meetings have more attendees)
        const attendeeCount = m.type === 'individual' ? 1 : rand(3, Math.min(menteeResults.length, 8))
        const shuffled = [...menteeResults].sort(() => Math.random() - 0.5).slice(0, attendeeCount)
        
        for (const mr of shuffled) {
          await admin.from('meeting_attendees').insert({
            meeting_id: meeting.id,
            mentorado_id: mr.mentoradoId,
            confirmed: isPast || rand(0, 1) === 1,
            confirmed_at: (isPast || rand(0, 1)) ? ago(rand(1, 5)) : null,
            attended: isPast ? rand(0, 1) === 1 : null,
          })
        }
      }
    }

    console.log(`[seed] ${createdMeetings.length} meetings created.`)

    // ━━━ PHASE 6: MENTOR LIBRARY FILES ━━━━━━━━━━━━━━━━━━━
    console.log('[seed] Phase 6: Creating files...')

    const MENTOR_LIBRARY_FILES = [
      { title: 'Guia de Prospecção B2B 2026', type: 'note', content: '# Guia Completo de Prospecção B2B\n\n## Passo 1: Defina seu ICP\nAntes de qualquer coisa, saiba exatamente quem você busca...\n\n## Passo 2: Construa sua lista\nUse LinkedIn Sales Navigator, Apollo.io ou busca manual...\n\n## Passo 3: Faça o primeiro contato\nMulticanal é a chave: email + LinkedIn + telefone...' },
      { title: 'Modelo de Proposta Comercial', type: 'note', content: '# Template de Proposta Comercial\n\n## Sobre nós\n[Breve apresentação]\n\n## Diagnóstico\n[Problema identificado]\n\n## Solução Proposta\n[Detalhamento]\n\n## Investimento\n[Preço e condições]\n\n## Próximos Passos\n[Call to action]' },
      { title: 'Script de Cold Calling', type: 'note', content: '# Script de Cold Calling\n\n**Abertura:** Olá [Nome], aqui é [Seu Nome] da [Empresa]. Não sei se é o melhor momento, mas...\n\n**Gancho:** Vi que vocês estão [evento/gatilho] e gostaria de compartilhar como ajudamos empresas similares a...\n\n**Qualificação:** Faz sentido para você [benefício]?\n\n**Fechamento:** Posso agendar 15 minutos para mostrar como funciona?' },
      { title: 'Link: Artigo sobre SPIN Selling', type: 'link', url: 'https://www.hubspot.com/sales/spin-selling' },
      { title: 'Link: Ferramentas de Prospecção', type: 'link', url: 'https://www.apollo.io' },
    ]

    for (const file of MENTOR_LIBRARY_FILES) {
      if (file.type === 'note') {
        await admin.from('mentor_library').insert({
          mentor_id: legacyMentor.id,
          file_type: 'note',
          note_title: file.title,
          note_content: file.content,
          category: 'Vendas',
          tags: ['prospecção', 'B2B', 'vendas'],
        })
      } else {
        await admin.from('mentor_library').insert({
          mentor_id: legacyMentor.id,
          file_type: 'link',
          link_title: file.title,
          link_url: file.url,
          category: 'Recursos',
          tags: ['recurso', 'referência'],
        })
      }
    }

    // Mentorado files (for specific mentees)
    const fileMentees = menteeResults.filter(m => m.persona.activityLevel === 'high' || m.persona.activityLevel === 'medium')
    for (const mr of fileMentees.slice(0, 5)) {
      await admin.from('mentorado_files').insert({
        mentor_id: legacyMentor.id,
        mentorado_id: mr.mentoradoId,
        owner_membership_id: mentorMembership.id,
        tenant_id: T,
        file_type: 'note',
        note_title: `Plano de Ação - ${mr.persona.name.split(' ')[0]}`,
        note_content: `# Plano de Ação Personalizado\n\n**Mentorado:** ${mr.persona.name}\n**Negócio:** ${mr.persona.business}\n\n## Objetivos do Mês\n1. Aumentar prospecções diárias para ${mr.persona.businessProfile.daily_prospection_goal}\n2. Melhorar taxa de conversão em 20%\n3. Fechar pelo menos 3 novos clientes\n\n## Ações\n- Revisar script de abordagem\n- Otimizar perfil do LinkedIn\n- Participar de 2 eventos de networking`,
        tags: ['plano', 'mensal', mr.persona.segment.toLowerCase()],
      })
    }

    console.log('[seed] Files created.')

    // ━━━ PHASE 7: COMMUNITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('[seed] Phase 7: Creating community posts...')

    const COMMUNITY_POSTS = [
      { content: '🎯 Acabei de fechar meu maior contrato do mês! A técnica de reframing de preço da última masterclass funcionou perfeitamente. Obrigado, Erika!', tags: ['conquista', 'fechamento'] },
      { content: '📊 Pergunta para o grupo: vocês estão usando alguma ferramenta específica para automação de follow-up? Meu processo está manual demais.', tags: ['dúvida', 'ferramentas'] },
      { content: '💡 Dica que aprendi essa semana: ao invés de perguntar "posso agendar uma reunião?", diga "terça ou quinta, qual funciona melhor?". Converte 3x mais!', tags: ['dica', 'prospecção'] },
      { content: '🔥 Sprint de prospecção em andamento! Já fiz 15 contatos hoje. Quem mais está participando?', tags: ['sprint', 'prospecção'] },
      { content: '📚 Terminei a trilha de Negociação! Muito conteúdo bom. Recomendo para quem ainda não começou.', tags: ['trilha', 'aprendizado'] },
    ]

    const activeMentees = menteeResults.filter(m => m.persona.activityLevel !== 'inactive')
    for (let i = 0; i < COMMUNITY_POSTS.length; i++) {
      const mr = activeMentees[i % activeMentees.length]
      const { data: post } = await admin.from('community_posts').insert({
        mentor_id: legacyMentor.id,
        mentorado_id: mr.mentoradoId,
        author_membership_id: mr.memId,
        tenant_id: T,
        content: COMMUNITY_POSTS[i].content,
        tags: COMMUNITY_POSTS[i].tags,
        created_at: ago(rand(0, 14)),
        likes_count: rand(2, 8),
        comments_count: rand(0, 4),
      }).select('id').single()

      if (post) {
        // Add some comments
        const commentCount = rand(1, 3)
        for (let c = 0; c < commentCount; c++) {
          const commenter = activeMentees[(i + c + 1) % activeMentees.length]
          await admin.from('community_comments').insert({
            post_id: post.id,
            mentorado_id: commenter.mentoradoId,
            content: pick([
              'Muito bom! Parabéns! 🎉',
              'Excelente dica, vou aplicar!',
              'Também estou usando essa estratégia e funciona demais.',
              'Quero saber mais sobre isso!',
              'Show! Continua compartilhando.',
            ]),
            created_at: ago(rand(0, 13)),
          })
        }
      }
    }

    console.log('[seed] Community created.')

    // ━━━ PHASE 8: EMAIL MARKETING ━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('[seed] Phase 8: Creating email flows & templates...')

    // Create email template
    const { data: emailTemplate } = await admin.from('email_templates').insert({
      mentor_id: legacyMentor.id,
      tenant_id: T,
      name: 'Boas-vindas Mentorado',
      subject: 'Bem-vindo(a) à mentoria, {{nome}}! 🚀',
      body_html: '<h2>Olá, {{nome}}!</h2><p>Seja muito bem-vindo(a) ao programa de mentoria. Estamos animados em ter você conosco!</p><p>Nas próximas semanas, você terá acesso a:</p><ul><li>🎯 CRM com IA para organizar suas prospecções</li><li>🤖 8 ferramentas de IA personalizadas</li><li>📚 Trilhas de conteúdo exclusivas</li><li>💬 Comunidade de mentorados</li></ul><p>Qualquer dúvida, use o Centro SOS dentro da plataforma.</p><p>Vamos juntos!</p>',
      body_text: 'Olá, {{nome}}! Bem-vindo à mentoria.',
      merge_tags: ['nome', 'business_name'],
    }).select('id').single()

    const { data: emailTemplate2 } = await admin.from('email_templates').insert({
      mentor_id: legacyMentor.id,
      tenant_id: T,
      name: 'Follow-up Semana 1',
      subject: '{{nome}}, como foi sua primeira semana? 📊',
      body_html: '<h2>E aí, {{nome}}! Como está?</h2><p>Já se passou uma semana desde que você entrou no programa. Quero saber:</p><ol><li>Já configurou seu CRM?</li><li>Quantas prospecções você fez?</li><li>Assistiu às primeiras aulas da trilha?</li></ol><p>Se precisar de ajuda, o Mentor Virtual está disponível 24/7 na plataforma. Use sem moderação!</p><p>Lembre-se: <strong>consistência > intensidade</strong>.</p>',
      body_text: 'Olá {{nome}}, como foi sua primeira semana?',
      merge_tags: ['nome'],
    }).select('id').single()

    const { data: emailTemplate3 } = await admin.from('email_templates').insert({
      mentor_id: legacyMentor.id,
      tenant_id: T,
      name: 'Reengajamento Inativo',
      subject: '{{nome}}, sentimos sua falta! 💛',
      body_html: '<h2>{{nome}}, tudo bem?</h2><p>Percebemos que faz alguns dias que você não acessa a plataforma. Sabemos que a rotina aperta, mas cada dia sem prospectar é um dia de faturamento perdido.</p><p>Aqui vai um desafio rápido: <strong>faça 3 prospecções hoje</strong>. Só 3. Use o Hub de Comunicação para gerar scripts prontos em segundos.</p><p>Seus colegas estão avançando no ranking. Não fique para trás! 🏆</p>',
      body_text: 'Olá {{nome}}, sentimos sua falta!',
      merge_tags: ['nome'],
    }).select('id').single()

    // Create email flow: Onboarding Sequence
    const onboardingNodes = [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Gatilho', triggerType: 'onboarding', config: {} } },
      { id: 'email-1', type: 'email', position: { x: 250, y: 200 }, data: { label: 'Enviar Email', subject: 'Bem-vindo(a) à mentoria! 🚀', body: emailTemplate?.id ? '' : 'Boas-vindas', templateId: emailTemplate?.id || '' } },
      { id: 'wait-1', type: 'wait', position: { x: 250, y: 350 }, data: { label: 'Aguardar', duration: 7, unit: 'days' } },
      { id: 'email-2', type: 'email', position: { x: 250, y: 500 }, data: { label: 'Enviar Email', subject: 'Como foi sua primeira semana? 📊', body: '', templateId: emailTemplate2?.id || '' } },
      { id: 'wait-2', type: 'wait', position: { x: 250, y: 650 }, data: { label: 'Aguardar', duration: 14, unit: 'days' } },
      { id: 'condition-1', type: 'condition', position: { x: 250, y: 800 }, data: { label: 'Condição', conditionType: 'inactivity', config: { days: 7 } } },
      { id: 'email-3', type: 'email', position: { x: 250, y: 950 }, data: { label: 'Enviar Email', subject: 'Sentimos sua falta! 💛', body: '', templateId: emailTemplate3?.id || '' } },
    ]
    const onboardingEdges = [
      { id: 'e-t1-e1', source: 'trigger-1', target: 'email-1', markerEnd: { type: 'arrowclosed' } },
      { id: 'e-e1-w1', source: 'email-1', target: 'wait-1', markerEnd: { type: 'arrowclosed' } },
      { id: 'e-w1-e2', source: 'wait-1', target: 'email-2', markerEnd: { type: 'arrowclosed' } },
      { id: 'e-e2-w2', source: 'email-2', target: 'wait-2', markerEnd: { type: 'arrowclosed' } },
      { id: 'e-w2-c1', source: 'wait-2', target: 'condition-1', markerEnd: { type: 'arrowclosed' } },
      { id: 'e-c1-e3', source: 'condition-1', target: 'email-3', markerEnd: { type: 'arrowclosed' } },
    ]

    await admin.from('email_flows').insert({
      mentor_id: legacyMentor.id,
      tenant_id: T,
      name: 'Sequência de Onboarding',
      description: 'Fluxo automático de boas-vindas e acompanhamento das primeiras semanas do mentorado',
      nodes: onboardingNodes,
      edges: onboardingEdges,
      is_active: true,
    })

    // Create second flow: Re-engagement
    const reengageNodes = [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Gatilho', triggerType: 'inactivity', config: { days: 5 } } },
      { id: 'email-1', type: 'email', position: { x: 250, y: 200 }, data: { label: 'Enviar Email', subject: 'Sentimos sua falta! 💛', body: '', templateId: emailTemplate3?.id || '' } },
      { id: 'wait-1', type: 'wait', position: { x: 250, y: 350 }, data: { label: 'Aguardar', duration: 3, unit: 'days' } },
      { id: 'email-2', type: 'email', position: { x: 250, y: 500 }, data: { label: 'Enviar Email', subject: 'Última chance de retomar! 🔥', body: '<h2>{{nome}}, ainda dá tempo!</h2><p>O ranking fecha em breve. Seus colegas estão crescendo. Volte hoje e faça pelo menos 1 prospecção.</p>' } },
    ]
    const reengageEdges = [
      { id: 'e-t1-e1', source: 'trigger-1', target: 'email-1', markerEnd: { type: 'arrowclosed' } },
      { id: 'e-e1-w1', source: 'email-1', target: 'wait-1', markerEnd: { type: 'arrowclosed' } },
      { id: 'e-w1-e2', source: 'wait-1', target: 'email-2', markerEnd: { type: 'arrowclosed' } },
    ]

    await admin.from('email_flows').insert({
      mentor_id: legacyMentor.id,
      tenant_id: T,
      name: 'Reengajamento de Inativos',
      description: 'Dispara automaticamente quando o mentorado fica 5+ dias sem acessar a plataforma',
      nodes: reengageNodes,
      edges: reengageEdges,
      is_active: false,
    })

    console.log('[seed] Email flows & templates created.')

    // ━━━ SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const totalLeads = PERSONAS.reduce((s, p) => s + p.leadsCount, 0)
    const totalActivities = menteeResults.reduce((s, mr) => {
      const acts = generateActivities(mr.persona)
      return s + acts.length
    }, 0)

    const summary = {
      success: true,
      mentor: { name: 'Erika Silveira (Demo)', membership_id: mentorMembership.id },
      mentees_created: menteeResults.length,
      total_leads: totalLeads,
      trails_created: TRAILS_DATA.length,
      meetings_created: createdMeetings.length,
      sos_requests: PERSONAS.filter(p => p.hasSOS).length,
      community_posts: COMMUNITY_POSTS.length,
      mentor_library_files: MENTOR_LIBRARY_FILES.length,
    }

    console.log('[seed] ✅ Simulation complete!', JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (e: any) {
    console.error('[seed] ❌ Error:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
