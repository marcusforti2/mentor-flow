import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OnboardingRequest {
  email: string;
  otp: string;
  mentorId: string;
   inviteToken?: string;
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body: OnboardingRequest = await req.json();
    const { email, otp, mentorId, inviteToken, fullName, phone, businessProfile, responses } = body;

    console.log('Processing onboarding for:', email);
    
    // If inviteToken is provided, validate it first
    let inviteRecord = null;
    if (inviteToken) {
      const { data: invite, error: inviteError } = await supabase
        .from('mentorado_invites')
        .select('*')
        .eq('invite_token', inviteToken)
        .eq('status', 'pending')
        .single();
      
      if (inviteError || !invite) {
        console.error('Invalid invite token:', inviteError);
        return new Response(
          JSON.stringify({ error: 'Convite inválido ou já utilizado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check expiration
      if (new Date(invite.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Convite expirado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
      console.error('OTP verification failed:', otpError);
      return new Response(
        JSON.stringify({ error: 'Código inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Mark OTP as used
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id);

    // 3. Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;
    let session = null;

    if (userExists) {
      // User exists, just get their ID
      userId = userExists.id;
      console.log('User already exists:', userId);
      
      // Generate a magic link for existing user
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email.toLowerCase(),
      });

      if (linkError) {
        console.error('Error generating magic link:', linkError);
      } else if (linkData?.properties?.hashed_token) {
        // Verify the token to get a session
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: 'magiclink',
        });

        if (!sessionError && sessionData?.session) {
          session = sessionData.session;
        }
      }
    } else {
      // 4. Create new user
      const tempPassword = crypto.randomUUID();
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (userError) {
        console.error('Error creating user:', userError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar conta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = userData.user.id;
      console.log('Created new user:', userId);

      // Generate a session for the new user
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email.toLowerCase(),
      });

      if (linkError) {
        console.error('Error generating magic link:', linkError);
      } else if (linkData?.properties?.hashed_token) {
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: 'magiclink',
        });

        if (!sessionError && sessionData?.session) {
          session = sessionData.session;
        }
      }
    }

    // 5. Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        full_name: fullName,
        email: email.toLowerCase(),
        phone: phone || null,
      }, {
        onConflict: 'user_id',
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // 6. Assign mentorado role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'mentorado',
      }, {
        onConflict: 'user_id,role',
        ignoreDuplicates: true,
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
    }

    // 7. Create mentorado record
    const { data: mentoradoData, error: mentoradoError } = await supabase
      .from('mentorados')
      .upsert({
        user_id: userId,
        mentor_id: mentorId,
        status: 'active',
        joined_at: new Date().toISOString(),
        onboarding_completed: true,
        onboarding_step: 100,
      }, {
        onConflict: 'user_id',
      })
      .select('id')
      .single();

    if (mentoradoError) {
      console.error('Error creating mentorado:', mentoradoError);
      return new Response(
        JSON.stringify({ error: 'Erro ao vincular ao mentor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mentoradoId = mentoradoData.id;
    console.log('Created/updated mentorado:', mentoradoId);

    // 8. Create business profile
    if (businessProfile && Object.values(businessProfile).some(v => v)) {
      const { error: businessError } = await supabase
        .from('mentorado_business_profiles')
        .upsert({
          mentorado_id: mentoradoId,
          ...businessProfile,
        }, {
          onConflict: 'mentorado_id',
        });

      if (businessError) {
        console.error('Error creating business profile:', businessError);
      }
    }

    // 9. Save question responses
    if (responses && Object.keys(responses).length > 0) {
      const responseRecords = Object.entries(responses).map(([questionId, answer]) => ({
        mentorado_id: mentoradoId,
        question_id: questionId,
        selected_option: typeof answer === 'object' ? answer : { value: answer },
      }));

      const { error: responsesError } = await supabase
        .from('behavioral_responses')
        .upsert(responseRecords, {
          onConflict: 'mentorado_id,question_id',
        });

      if (responsesError) {
        console.error('Error saving responses:', responsesError);
      }
    }

    // 10. Create initial streak record
    await supabase
      .from('user_streaks')
      .upsert({
        mentorado_id: mentoradoId,
        current_streak: 1,
        longest_streak: 1,
        last_access_date: new Date().toISOString().split('T')[0],
      }, {
        onConflict: 'mentorado_id',
      });

    // 11. Mark invite as accepted if applicable
    if (inviteRecord) {
      const { error: inviteUpdateError } = await supabase
        .from('mentorado_invites')
        .update({
          status: 'accepted',
          mentorado_id: mentoradoId,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', inviteRecord.id);
      
      if (inviteUpdateError) {
        console.error('Error updating invite:', inviteUpdateError);
      } else {
        console.log('Invite marked as accepted:', inviteRecord.id);
      }
    }
 
    console.log('Onboarding completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        mentoradoId,
        session,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    console.error('Onboarding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
