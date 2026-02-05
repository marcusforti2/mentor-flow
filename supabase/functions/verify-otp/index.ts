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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code, tenant_id, devMode } = await req.json();

    if (!email || !code) {
      throw new Error("Email e código são obrigatórios");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedCode = code.replace(/\D/g, '');
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log("verify-otp: Verifying for:", normalizedEmail, "tenant_id:", tenant_id, "devMode:", devMode);
    
    // DEV MODE: Skip OTP validation with special code
    let otpData = null;
    if (devMode && normalizedCode === '000000') {
      console.log("verify-otp: DEV MODE bypassing OTP validation");
      otpData = { id: 'dev-mode', devMode: true };
    } else {
      // Find valid OTP
      const { data: foundOtp, error: otpError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("code", normalizedCode)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      console.log("verify-otp: OTP query result:", { found: !!foundOtp, error: otpError?.message });

      if (otpError) {
        console.error("verify-otp: OTP query error:", otpError);
        throw new Error("Erro ao verificar código");
      }

      if (!foundOtp) {
        console.log("verify-otp: No valid OTP found");
        throw new Error("Código inválido ou expirado");
      }
      
      otpData = foundOtp;
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      // EXISTING USER - generate magic link and return
      console.log("verify-otp: Existing user found:", existingUser.id);
      
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });

      if (linkError) {
        console.error("verify-otp: Error generating magic link:", linkError);
        throw new Error("Erro ao autenticar");
      }

      // Mark OTP as used
      if (!devMode && otpData?.id && otpData.id !== 'dev-mode') {
        await supabase.from("otp_codes").update({ used: true }).eq("id", otpData.id);
      }

      // Get user's membership for redirect info
      const { data: membership } = await supabase
        .from("memberships")
        .select("tenant_id, role")
        .eq("user_id", existingUser.id)
        .eq("status", "active")
        .order("role")
        .limit(1)
        .maybeSingle();

      console.log("verify-otp: Magic link generated for existing user");

      return new Response(
        JSON.stringify({
          success: true,
          isNewUser: false,
          actionLink: linkData.properties?.action_link,
          tokenHash: linkData.properties?.hashed_token,
          email: normalizedEmail,
          tenant_id: membership?.tenant_id,
          role: membership?.role,
          redirect_path: membership ? getRedirectPath(membership.role) : '/mentorado',
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // NEW USER - must have invite to proceed
    console.log("verify-otp: New user, checking for invite");
    
    // Find pending invite for this email
    let inviteQuery = supabase
      .from("invites")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());
    
    // Filter by tenant_id if provided
    if (tenant_id) {
      inviteQuery = inviteQuery.eq("tenant_id", tenant_id);
    }
    
    const { data: invite, error: inviteError } = await inviteQuery.limit(1).maybeSingle();

    if (inviteError) {
      console.error("verify-otp: Error fetching invite:", inviteError);
      throw new Error("Erro ao verificar convite");
    }

    if (!invite) {
      console.log("verify-otp: No valid invite found for new user");
      return new Response(
        JSON.stringify({ 
          error: "Convite não encontrado ou expirado. Você precisa ser convidado para acessar a plataforma." 
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
      throw new Error("Erro ao criar conta");
    }

    const userId = signUpData.user?.id;
    console.log("verify-otp: User created:", userId);
    
    if (userId) {
      // Update profile with invite data
      await supabase
        .from("profiles")
        .update({ 
          full_name: fullName,
          phone: phone || null,
        })
        .eq("user_id", userId);

      // Create membership using invite data
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
      } else {
        console.log(`verify-otp: Membership '${invite.role}' created for user:`, userId);

        // Create role-specific profile
        if (invite.role === 'mentee') {
          // Find a mentor to assign
          const { data: mentorMembership } = await supabase
            .from("memberships")
            .select("id")
            .eq("tenant_id", invite.tenant_id)
            .in("role", ["admin", "mentor"])
            .limit(1)
            .single();

          // Create mentee_profile
          const { error: profileError } = await supabase
            .from("mentee_profiles")
            .insert({
              membership_id: membership.id,
              onboarding_completed: devMode || false,
            });

          if (profileError) {
            console.error("verify-otp: Error creating mentee_profile:", profileError);
          }

          // Create assignment if mentor exists
          if (mentorMembership) {
            await supabase
              .from("mentor_mentee_assignments")
              .insert({
                tenant_id: invite.tenant_id,
                mentor_membership_id: mentorMembership.id,
                mentee_membership_id: membership.id,
                status: 'active',
              });
          }

          // BACKWARD COMPATIBILITY: Create legacy mentorado record
          const { data: legacyMentor } = await supabase
            .from("mentors")
            .select("id")
            .limit(1)
            .single();

          if (legacyMentor) {
            await supabase
              .from("mentorados")
              .insert({
                user_id: userId,
                mentor_id: legacyMentor.id,
                status: 'active',
                onboarding_completed: devMode || false,
              });
          }
        } else if (['mentor', 'admin'].includes(invite.role)) {
          // Create mentor_profile
          const { error: profileError } = await supabase
            .from("mentor_profiles")
            .insert({
              membership_id: membership.id,
              business_name: fullName ? `Mentoria de ${fullName}` : 'Minha Mentoria',
            });

          if (profileError) {
            console.error("verify-otp: Error creating mentor_profile:", profileError);
          }

          // BACKWARD COMPATIBILITY: Create legacy mentor record
          await supabase
            .from("mentors")
            .insert({
              user_id: userId,
              business_name: fullName ? `Mentoria de ${fullName}` : 'Minha Mentoria',
            });

          // Also create legacy user_role
          await supabase
            .from("user_roles")
            .insert({
              user_id: userId,
              role: 'mentor',
            });
        }
      }

      // Mark invite as accepted
      await supabase
        .from("invites")
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString() 
        })
        .eq("id", invite.id);

      console.log("verify-otp: Invite marked as accepted");
    }

    // Generate magic link for the new user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });

    if (linkError) {
      console.error("verify-otp: Error generating link for new user:", linkError);
      throw new Error("Erro ao autenticar novo usuário");
    }

    // Mark OTP as used
    if (!devMode && otpData?.id && otpData.id !== 'dev-mode') {
      await supabase.from("otp_codes").update({ used: true }).eq("id", otpData.id);
    }

    console.log("verify-otp: New user created and authenticated:", normalizedEmail);

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser: true,
        userId: userId,
        actionLink: linkData.properties?.action_link,
        tokenHash: linkData.properties?.hashed_token,
        email: normalizedEmail,
        tenant_id: invite.tenant_id,
        role: invite.role,
        redirect_path: getRedirectPath(invite.role),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("verify-otp: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
