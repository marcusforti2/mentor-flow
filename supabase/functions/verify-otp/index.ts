import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to get redirect path by role
function getRedirectPath(role: string): string {
  switch (role) {
    case 'master_admin':
      return '/master';
    case 'admin':
    case 'ops':
    case 'mentor':
      return '/mentor';
    case 'mentee':
      return '/mentorado';
    default:
      return '/mentorado';
  }
}

// Error response helper with error_type for frontend differentiation
function errorResponse(message: string, errorType: 'otp_invalid' | 'otp_expired' | 'internal' | 'no_invite', status = 400) {
  return new Response(
    JSON.stringify({ 
      error: message, 
      error_type: errorType 
    }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

// Success response helper
function successResponse(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify(data),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { email, code, tenant_id, devMode } = await req.json();

    if (!email || !code) {
      return errorResponse("Email e código são obrigatórios", "otp_invalid");
    }

    const normalizedCode = code.replace(/\D/g, '');
    const normalizedEmail = email.toLowerCase().trim();

    // ── RATE LIMIT: max 5 failed verifications per email in 15 minutes ──
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: failCount } = await supabase
      .from('otp_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .eq('attempt_type', 'verify')
      .gte('created_at', fifteenMinAgo);

    if ((failCount ?? 0) >= 5) {
      console.log("verify-otp: RATE LIMITED -", normalizedEmail, "failed attempts:", failCount);
      return new Response(
        JSON.stringify({ 
          error: 'Conta temporariamente bloqueada por excesso de tentativas. Aguarde 15 minutos.',
          error_type: 'rate_limited'
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log("verify-otp: Verifying for:", normalizedEmail, "tenant_id:", tenant_id, "devMode:", devMode);
    
    // ============================================
    // STEP 1: VALIDATE OTP CODE
    // ============================================
    let otpData = null;
    
    if (false) {
      // DEV MODE REMOVED FOR SECURITY - never bypass OTP validation in production
      console.log("verify-otp: DEV MODE disabled");
      otpData = { id: 'dev-mode', devMode: true };
    } else {
      // Find valid OTP
      const { data: foundOtp, error: otpError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("code", normalizedCode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      console.log("verify-otp: OTP query result:", { found: !!foundOtp, error: otpError?.message });

      if (otpError) {
        console.error("verify-otp: OTP query error:", otpError);
        return errorResponse("Erro ao verificar código", "internal");
      }

      if (!foundOtp) {
        console.log("verify-otp: No OTP found for code");
        return errorResponse("Código inválido", "otp_invalid");
      }
      
      // Check expiration separately for better error message
      const expiresAt = new Date(foundOtp.expires_at);
      if (expiresAt < new Date()) {
        console.log("verify-otp: OTP expired at:", foundOtp.expires_at);
        return errorResponse("Código expirado. Solicite um novo código.", "otp_expired");
      }
      
      if (foundOtp.used) {
        console.log("verify-otp: OTP already used");
        return errorResponse("Código já utilizado. Solicite um novo código.", "otp_invalid");
      }
      
      otpData = foundOtp;
    }

    console.log("verify-otp: OTP validated successfully");

    // ============================================
    // STEP 2: CHECK IF USER EXISTS
    // ============================================
    // Use profiles table to find user_id by email, then getUserById
    // This avoids the auth.admin.listUsers() NULL scan bug on confirmation_token
    let existingUser = null;
    const { data: profileMatch } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle();
    
    if (profileMatch?.user_id) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profileMatch.user_id);
      if (!userError && userData?.user) {
        existingUser = userData.user;
      }
    }
    
    // Fallback: check memberships table if profile has no email
    if (!existingUser) {
      const { data: membershipUsers } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('status', 'active');
      
      if (membershipUsers && membershipUsers.length > 0) {
        for (const m of membershipUsers) {
          const { data: uData } = await supabase.auth.admin.getUserById(m.user_id);
          if (uData?.user?.email?.toLowerCase() === normalizedEmail) {
            existingUser = uData.user;
            break;
          }
        }
      }
    }
    
    console.log("verify-otp: User lookup result:", { found: !!existingUser });

    // ============================================
    // STEP 3A: EXISTING USER - BOOTSTRAP LOGIN
    // ============================================
    if (existingUser) {
      console.log("verify-otp: Existing user found:", existingUser.id);
      
      // Generate magic link FIRST (critical for login)
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });

      if (linkError) {
        console.error("verify-otp: Error generating magic link:", linkError);
        // Even if magic link fails, we validated OTP - indicate this is an internal error
        return errorResponse("Erro interno ao autenticar. O código estava correto - tente novamente.", "internal");
      }

      // Mark OTP as used (non-blocking - fire and forget)
      if (!devMode && otpData?.id && otpData.id !== 'dev-mode') {
        (async () => {
          try {
            await supabase.from("otp_codes").update({ used: true }).eq("id", otpData.id);
            console.log("verify-otp: OTP marked as used");
          } catch (err) {
            console.error("verify-otp: Failed to mark OTP used:", err);
          }
        })();
      }

      // BOOTSTRAP: Get user's membership, creating if needed
      let membership = null;
      
      // First, try to find existing active membership
      const { data: existingMembership, error: membershipError } = await supabase
        .from("memberships")
        .select("tenant_id, role, status")
        .eq("user_id", existingUser.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        console.error("verify-otp: Error fetching membership:", membershipError);
        // Non-blocking - still allow login
      }

      if (existingMembership) {
        membership = existingMembership;
        console.log("verify-otp: Found existing membership:", membership.role);
      } else {
        // No active membership - try to activate from invite or inactive membership
        console.log("verify-otp: No active membership, attempting bootstrap...");
        
        // Check for inactive membership to reactivate
        const { data: inactiveMembership } = await supabase
          .from("memberships")
          .select("id, tenant_id, role")
          .eq("user_id", existingUser.id)
          .eq("status", "inactive")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (inactiveMembership) {
          console.log("verify-otp: Reactivating inactive membership:", inactiveMembership.id);
          const { error: updateError } = await supabase
            .from("memberships")
            .update({ status: 'active' })
            .eq("id", inactiveMembership.id);
          
          if (!updateError) {
            membership = { 
              tenant_id: inactiveMembership.tenant_id, 
              role: inactiveMembership.role, 
              status: 'active' 
            };
          }
        } else {
          // Check for pending invite to accept
          let inviteQuery = supabase
            .from("invites")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("status", "pending")
            .gt("expires_at", new Date().toISOString());
          
          if (tenant_id) {
            inviteQuery = inviteQuery.eq("tenant_id", tenant_id);
          }
          
          const { data: invite } = await inviteQuery.limit(1).maybeSingle();
          
          if (invite) {
            console.log("verify-otp: Found pending invite, creating membership");
            
            // Create membership from invite
            const { data: newMembership, error: createError } = await supabase
              .from("memberships")
              .insert({
                user_id: existingUser.id,
                tenant_id: invite.tenant_id,
                role: invite.role,
                status: 'active',
              })
              .select()
              .single();

            if (!createError && newMembership) {
              membership = { 
                tenant_id: newMembership.tenant_id, 
                role: newMembership.role, 
                status: 'active' 
              };
              
              // Mark invite as accepted (non-blocking)
              void supabase
                .from("invites")
                .update({ status: 'accepted', accepted_at: new Date().toISOString() })
                .eq("id", invite.id);

              // Create role-specific profile if needed
              if (invite.role === 'mentee') {
                void supabase.from("mentee_profiles").insert({ membership_id: newMembership.id });
                console.log("verify-otp: Queued mentee_profile creation");
              } else if (['mentor', 'admin'].includes(invite.role)) {
                void supabase.from("mentor_profiles").insert({ membership_id: newMembership.id });
                console.log("verify-otp: Queued mentor_profile creation");
              }
            }
          }
        }
      }

      console.log("verify-otp: Magic link generated for existing user, membership:", membership?.role || 'none');

      return successResponse({
        success: true,
        isNewUser: false,
        actionLink: linkData.properties?.action_link,
        tokenHash: linkData.properties?.hashed_token,
        email: normalizedEmail,
        tenant_id: membership?.tenant_id || null,
        role: membership?.role || null,
        redirect_path: membership ? getRedirectPath(membership.role) : '/mentorado',
        // Indicate if membership is missing (frontend can show warning)
        membership_missing: !membership,
      });
    }

    // ============================================
    // STEP 3B: NEW USER - REQUIRES INVITE
    // ============================================
    console.log("verify-otp: New user, checking for invite");
    
    // Find pending invite for this email
    let inviteQuery = supabase
      .from("invites")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());
    
    if (tenant_id) {
      inviteQuery = inviteQuery.eq("tenant_id", tenant_id);
    }
    
    const { data: invite, error: inviteError } = await inviteQuery.limit(1).maybeSingle();

    if (inviteError) {
      console.error("verify-otp: Error fetching invite:", inviteError);
      return errorResponse("Erro interno ao verificar convite", "internal");
    }

    if (!invite) {
      console.log("verify-otp: No valid invite found for new user");
      return errorResponse(
        "Convite não encontrado ou expirado. Você precisa ser convidado para acessar a plataforma.", 
        "no_invite",
        403
      );
    }

    console.log("verify-otp: Found invite:", { id: invite.id, tenant_id: invite.tenant_id, role: invite.role });

    // Extract data from invite metadata
    const fullName = invite.metadata?.full_name || '';
    const phone = invite.metadata?.phone || '';

    // Create new user with random password
    const randomPassword = crypto.randomUUID();
    
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
      },
    });

    if (signUpError) {
      console.error("verify-otp: Error creating user:", signUpError);
      return errorResponse("Erro interno ao criar conta. O código estava correto - tente novamente.", "internal");
    }

    const userId = signUpData.user?.id;
    console.log("verify-otp: User created:", userId);
    
    if (userId) {
      // Update profile with invite data (non-blocking)
      void supabase
        .from("profiles")
        .update({ full_name: fullName, phone: phone || null })
        .eq("user_id", userId);
      console.log("verify-otp: Queued profile update");

      // Create membership
      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .insert({
          user_id: userId,
          tenant_id: invite.tenant_id,
          role: invite.role,
          status: 'active',
        })
        .select()
        .single();

      if (membershipError) {
        console.error("verify-otp: Error creating membership:", membershipError);
        // Continue anyway - user exists, they can login
      } else {
        console.log(`verify-otp: Membership '${invite.role}' created for user:`, userId);

        // Create role-specific profile (non-blocking)
        if (invite.role === 'mentee') {
          void supabase.from("mentee_profiles").insert({
            membership_id: membership.id,
            onboarding_completed: devMode || false,
          });
          console.log("verify-otp: Queued mentee_profile creation");

          // Find a mentor to assign
          const { data: mentorMembership } = await supabase
            .from("memberships")
            .select("id")
            .eq("tenant_id", invite.tenant_id)
            .in("role", ["admin", "mentor"])
            .limit(1)
            .single();

          if (mentorMembership) {
            void supabase.from("mentor_mentee_assignments").insert({
              tenant_id: invite.tenant_id,
              mentor_membership_id: mentorMembership.id,
              mentee_membership_id: membership.id,
              status: 'active',
            });
            console.log("verify-otp: Queued mentor assignment");
          }

          // BACKWARD COMPATIBILITY: Legacy mentorado record
          // Legacy mentorado table removed - mentee_profiles is created above
          console.log("verify-otp: Mentee profile created via membership system");
        } else if (['mentor', 'admin'].includes(invite.role)) {
          void supabase.from("mentor_profiles").insert({
            membership_id: membership.id,
            business_name: fullName ? `Mentoria de ${fullName}` : 'Minha Mentoria',
          });
          console.log("verify-otp: Queued mentor_profile creation");

          // BACKWARD COMPATIBILITY: Legacy mentor record
          void supabase.from("mentors").insert({
            user_id: userId,
            business_name: fullName ? `Mentoria de ${fullName}` : 'Minha Mentoria',
          });
          console.log("verify-otp: Queued legacy mentor creation");

          void supabase.from("user_roles").insert({
            user_id: userId,
            role: 'mentor',
          });
          console.log("verify-otp: Queued legacy user_role creation");
        }
      }

      // Mark invite as accepted (non-blocking)
      void supabase
        .from("invites")
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq("id", invite.id);
      console.log("verify-otp: Queued invite acceptance");
    }

    // Generate magic link for the new user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });

    if (linkError) {
      console.error("verify-otp: Error generating link for new user:", linkError);
      return errorResponse("Conta criada mas erro ao autenticar. Tente fazer login novamente.", "internal");
    }

    // Mark OTP as used (non-blocking)
    if (!devMode && otpData?.id && otpData.id !== 'dev-mode') {
      void supabase.from("otp_codes").update({ used: true }).eq("id", otpData.id);
      console.log("verify-otp: Queued OTP mark as used");
    }

    console.log("verify-otp: New user created and authenticated:", normalizedEmail);

    return successResponse({
      success: true,
      isNewUser: true,
      userId: userId,
      actionLink: linkData.properties?.action_link,
      tokenHash: linkData.properties?.hashed_token,
      email: normalizedEmail,
      tenant_id: invite.tenant_id,
      role: invite.role,
      redirect_path: getRedirectPath(invite.role),
    });

  } catch (error: any) {
    console.error("verify-otp: Unexpected error:", error);
    return errorResponse(
      error.message || "Erro interno inesperado", 
      "internal"
    );
  }
});
