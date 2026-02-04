import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Test users data with different journey days
const TEST_USERS = [
  { name: 'Ana Silva', email: 'ana.silva.test@example.com', daysAgo: 1, business: 'Consultoria AS' },
  { name: 'Bruno Costa', email: 'bruno.costa.test@example.com', daysAgo: 3, business: 'BC Marketing' },
  { name: 'Carla Mendes', email: 'carla.mendes.test@example.com', daysAgo: 5, business: 'CM Design' },
  { name: 'Diego Ferreira', email: 'diego.ferreira.test@example.com', daysAgo: 10, business: 'DF Tech' },
  { name: 'Elena Santos', email: 'elena.santos.test@example.com', daysAgo: 15, business: 'ES Coaching' },
  { name: 'Felipe Lima', email: 'felipe.lima.test@example.com', daysAgo: 21, business: 'FL Vendas' },
  { name: 'Gabriela Rocha', email: 'gabriela.rocha.test@example.com', daysAgo: 28, business: 'GR Academy' },
  { name: 'Henrique Dias', email: 'henrique.dias.test@example.com', daysAgo: 35, business: 'HD Solutions' },
  { name: 'Isabela Martins', email: 'isabela.martins.test@example.com', daysAgo: 45, business: 'IM Consultoria' },
  { name: 'João Oliveira', email: 'joao.oliveira.test@example.com', daysAgo: 55, business: 'JO Services' },
  { name: 'Karen Souza', email: 'karen.souza.test@example.com', daysAgo: 70, business: 'KS Digital' },
  { name: 'Lucas Pereira', email: 'lucas.pereira.test@example.com', daysAgo: 85, business: 'LP Marketing' },
  { name: 'Marina Alves', email: 'marina.alves.test@example.com', daysAgo: 100, business: 'MA Coaching' },
  { name: 'Nicolas Barbosa', email: 'nicolas.barbosa.test@example.com', daysAgo: 120, business: 'NB Tech' },
  { name: 'Olivia Cardoso', email: 'olivia.cardoso.test@example.com', daysAgo: 150, business: 'OC Academy' },
  { name: 'Pedro Ribeiro', email: 'pedro.ribeiro.test@example.com', daysAgo: 180, business: 'PR Vendas' },
  { name: 'Quezia Teixeira', email: 'quezia.teixeira.test@example.com', daysAgo: 210, business: 'QT Consulting' },
  { name: 'Rafael Gomes', email: 'rafael.gomes.test@example.com', daysAgo: 250, business: 'RG Solutions' },
  { name: 'Sofia Nascimento', email: 'sofia.nascimento.test@example.com', daysAgo: 300, business: 'SN Digital' },
  { name: 'Thiago Castro', email: 'thiago.castro.test@example.com', daysAgo: 350, business: 'TC Services' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the mentor_id from request or find the first mentor
    const { mentor_id: requestMentorId } = await req.json().catch(() => ({}))
    
    let mentorId = requestMentorId
    
    if (!mentorId) {
      const { data: mentorData } = await supabaseAdmin
        .from('mentors')
        .select('id')
        .limit(1)
        .single()
      
      if (!mentorData) {
        return new Response(
          JSON.stringify({ error: 'Nenhum mentor encontrado. Configure um mentor primeiro.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      mentorId = mentorData.id
    }

    const results = []

    for (const testUser of TEST_USERS) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
        const userExists = existingUser.users.some(u => u.email === testUser.email)
        
        if (userExists) {
          results.push({ email: testUser.email, status: 'skipped', reason: 'already exists' })
          continue
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: testUser.email,
          email_confirm: true,
          password: 'TestPassword123!', // Temporary password
          user_metadata: {
            full_name: testUser.name
          }
        })

        if (authError) {
          results.push({ email: testUser.email, status: 'error', reason: authError.message })
          continue
        }

        const userId = authData.user.id

        // Update profile with name and phone
        await supabaseAdmin
          .from('profiles')
          .update({
            full_name: testUser.name,
            phone: `(11) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`
          })
          .eq('user_id', userId)

        // Add mentorado role
        await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'mentorado'
          })

        // Calculate joined_at date
        const joinedAt = new Date()
        joinedAt.setDate(joinedAt.getDate() - testUser.daysAgo)

        // Create mentorado record
        const { data: mentoradoData, error: mentoradoError } = await supabaseAdmin
          .from('mentorados')
          .insert({
            user_id: userId,
            mentor_id: mentorId,
            status: 'active',
            joined_at: joinedAt.toISOString(),
            onboarding_completed: Math.random() > 0.3 // 70% chance of completed
          })
          .select('id')
          .single()

        if (mentoradoError) {
          results.push({ email: testUser.email, status: 'partial', reason: mentoradoError.message })
          continue
        }

        // Create business profile
        const businessTypes = ['servicos', 'produtos', 'saas', 'consultoria']
        const maturityLevels = ['iniciante', 'crescimento', 'estabelecido', 'escala']
        
        await supabaseAdmin
          .from('mentorado_business_profiles')
          .insert({
            mentorado_id: mentoradoData.id,
            business_name: testUser.business,
            business_type: businessTypes[Math.floor(Math.random() * businessTypes.length)],
            maturity_level: maturityLevels[Math.floor(Math.random() * maturityLevels.length)],
            monthly_revenue: ['0-10k', '10k-50k', '50k-100k', '100k-500k'][Math.floor(Math.random() * 4)],
            team_size: ['solo', '2-5', '6-10', '11-20'][Math.floor(Math.random() * 4)]
          })

        results.push({ 
          email: testUser.email, 
          status: 'created', 
          daysAgo: testUser.daysAgo,
          joinedAt: joinedAt.toISOString()
        })

      } catch (err) {
        results.push({ email: testUser.email, status: 'error', reason: String(err) })
      }
    }

    const created = results.filter(r => r.status === 'created').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const errors = results.filter(r => r.status === 'error').length

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: { created, skipped, errors },
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
