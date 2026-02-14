import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface OnboardingRequest {
  email: string;
  otp: string;
  mentorId: string;
  inviteToken?: string;
  tenantId?: string;
  fullName: string;
  phone?: string;
  businessProfile: {
    business_name?: string;
    business_type?: string;
    main_offer?: string;
    target_audience?: string;
    monthly_revenue?: string;
  };
  responses: Record<string, any>;
}

async function getDefaultTenant(supabase: any): Promise<string> {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", "lbv")
    .single();
  
  if (tenant) return tenant.id;
  
  const { data: newTenant, error } = await supabase
    .from("tenants")
    .insert({ name: "LBV Tech", slug: "lbv" })
    .select("id")
    .single();
  
  if (error) throw new Error("Failed to create default tenant");
  return newTenant.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body: OnboardingRequest = await req.json();
    const { email, otp, mentorId, inviteToken, tenantId: providedTenantId, fullName, phone, businessProfile, responses } = body;

    console.log('Processing onboarding for:', email);
    
    // Validate invite token if provided
    let inviteRecord = null;
    if (inviteToken) {
      const { data: invite, error: inviteError } = await supabase
        .from('mentorado_invites')
        .select('*')
        .eq('invite_token', inviteToken)
        .eq('status', 'pending')
        .single();
      
      if (inviteError || !invite) {
        return new Response(JSON.stringify({ error: 'Convite inválido ou já utilizado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (new Date(invite.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Convite expirado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      inviteRecord = invite;
      console.log('Valid invite found:', invite.id);
    }

    // 1. Verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', otp)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpRecord) {
      return new Response(JSON.stringify({ error: 'Código inválido ou expirado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Mark OTP as used
    await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id);

    // 3. Create or find user
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;
    let session = null;

    if (userExists) {
      userId = userExists.id;
      console.log('User already exists:', userId);
    } else {
      const tempPassword = crypto.randomUUID();
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (userError) {
        return new Response(JSON.stringify({ error: 'Erro ao criar conta' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      userId = userData.user.id;
      console.log('Created new user:', userId);
    }

    // Generate session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
    });
    if (!linkError && linkData?.properties?.hashed_token) {
      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
      });
      if (!sessionError && sessionData?.session) {
        session = sessionData.session;
      }
    }

    // 4. Resolve tenant
    // mentorId could be a membership_id or a legacy mentor_id
    let tenantId = providedTenantId || null;
    let mentorMembershipId: string | null = null;
    
    // Try to find membership for the mentorId
    const { data: mentorMembership } = await supabase
      .from('memberships')
      .select('id, tenant_id')
      .eq('id', mentorId)
      .in('role', ['admin', 'mentor'])
      .single();
    
    if (mentorMembership) {
      tenantId = tenantId || mentorMembership.tenant_id;
      mentorMembershipId = mentorMembership.id;
    } else {
      // Fallback: try to find by tenant
      if (!tenantId) {
        tenantId = await getDefaultTenant(supabase);
      }
      // Find a mentor/admin in the tenant
      const { data: fallbackMentor } = await supabase
        .from('memberships')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('role', ['admin', 'mentor'])
        .limit(1)
        .single();
      mentorMembershipId = fallbackMentor?.id || null;
    }

    console.log('Using tenant:', tenantId, 'mentor membership:', mentorMembershipId);

    // 5. Upsert profile
    await supabase.from('profiles').upsert({
      user_id: userId,
      full_name: fullName,
      email: email.toLowerCase(),
      phone: phone || null,
    }, { onConflict: 'user_id' });

    // 6. Create or get membership
    let membershipId: string;
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('role', 'mentee')
      .maybeSingle();

    if (existingMembership) {
      membershipId = existingMembership.id;
    } else {
      const { data: newMembership, error: membershipError } = await supabase
        .from('memberships')
        .insert({ user_id: userId, tenant_id: tenantId, role: 'mentee', status: 'active' })
        .select('id')
        .single();
      if (membershipError) {
        return new Response(JSON.stringify({ error: 'Erro ao criar vínculo com o tenant' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      membershipId = newMembership.id;
    }
    console.log('Membership:', membershipId);

    // 7. Create mentee_profile
    await supabase.from('mentee_profiles').upsert({
      membership_id: membershipId,
      business_name: businessProfile?.business_name || null,
      onboarding_completed: true,
      business_profile: businessProfile || {},
    }, { onConflict: 'membership_id' });

    // 8. Create mentor_mentee_assignment
    if (mentorMembershipId) {
      const { data: existingAssignment } = await supabase
        .from('mentor_mentee_assignments')
        .select('id')
        .eq('mentor_membership_id', mentorMembershipId)
        .eq('mentee_membership_id', membershipId)
        .maybeSingle();

      if (!existingAssignment) {
        await supabase.from('mentor_mentee_assignments').insert({
          tenant_id: tenantId,
          mentor_membership_id: mentorMembershipId,
          mentee_membership_id: membershipId,
          status: 'active',
        });
        console.log('Created mentor_mentee_assignment');
      }
    }

    // 9. Save behavioral responses (new arch only)
    if (responses && Object.keys(responses).length > 0) {
      const responseRecords = Object.entries(responses).map(([questionId, answer]) => ({
        mentorado_id: membershipId, // Uses membership_id in the mentorado_id field for now (legacy column name)
        question_id: questionId,
        selected_option: typeof answer === 'object' ? answer : { value: answer },
        tenant_id: tenantId,
        membership_id: membershipId,
      }));

      await supabase.from('behavioral_responses').upsert(responseRecords, {
        onConflict: 'mentorado_id,question_id',
      });
    }

    // 10. Mark invite as accepted
    if (inviteRecord) {
      await supabase.from('mentorado_invites').update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      }).eq('id', inviteRecord.id);
      console.log('Invite marked as accepted');
    }

    console.log('Onboarding completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      membershipId,
      session,
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error: unknown) {
    console.error('Onboarding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
