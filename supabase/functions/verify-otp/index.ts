import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to get or create the default tenant
async function getDefaultTenant(supabase: any): Promise<string> {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", "lbv")
    .single();
  
  if (tenant) return tenant.id;
  
  // Create default tenant if not exists
  const { data: newTenant, error } = await supabase
    .from("tenants")
    .insert({ name: "LBV Tech", slug: "lbv" })
    .select("id")
    .single();
  
  if (error) throw new Error("Failed to create default tenant");
  return newTenant.id;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code, fullName, phone, userType, devMode, mentorId, tenantSlug } = await req.json();

    if (!email || !code) {
      throw new Error("Email e código são obrigatórios");
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize code - remove spaces and keep only digits
    const normalizedCode = code.replace(/\D/g, '');
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log("Verifying OTP:", { email: normalizedEmail, code: normalizedCode, devMode });
    
    // DEV MODE: Skip OTP validation with special code
    let otpData = null;
    if (devMode && normalizedCode === '000000') {
      console.log("DEV MODE: Bypassing OTP validation");
      otpData = { id: 'dev-mode', devMode: true };
    } else {
      // Find any valid OTP for this email/code combination that hasn't expired
      const { data: foundOtp, error: otpError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("code", normalizedCode)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      console.log("OTP query result:", { found: !!foundOtp, error: otpError?.message });

      if (otpError) {
        console.error("OTP query error:", otpError);
        throw new Error("Erro ao verificar código");
      }

      if (!foundOtp) {
        console.log("No valid OTP found for:", { email: normalizedEmail, code: normalizedCode });
        throw new Error("Código inválido ou expirado");
      }
      
      otpData = foundOtp;
    }

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      // User exists - generate magic link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });

      if (linkError) {
        console.error("Error generating magic link:", linkError);
        throw new Error("Erro ao autenticar");
      }

      // Mark code as used ONLY after successful link generation (skip in devMode)
      if (!devMode && otpData?.id) {
        await supabase
          .from("otp_codes")
          .update({ used: true })
          .eq("id", otpData.id);
      }

      console.log("Magic link generated for existing user:", normalizedEmail);

      return new Response(
        JSON.stringify({
          success: true,
          isNewUser: false,
          actionLink: linkData.properties?.action_link,
          tokenHash: linkData.properties?.hashed_token,
          email: normalizedEmail,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      // New user - need registration data
      if (!fullName) {
        return new Response(
          JSON.stringify({
            success: true,
            isNewUser: true,
            needsName: true,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Validate userType
      const validRole = userType === 'mentor' ? 'mentor' : 'mentee';

      // PREVENT creating user if trying to register as mentor but mentor already exists
      if (validRole === 'mentor') {
        // Check if admin membership exists in any tenant
        const { data: existingAdmin } = await supabase
          .from("memberships")
          .select("id")
          .eq("role", "admin")
          .maybeSingle();
        
        if (existingAdmin) {
          console.log("Mentor registration blocked - mentor already exists");
          return new Response(
            JSON.stringify({ 
              error: "Já existe um mentor cadastrado no sistema. Por favor, selecione 'Mentorado' para criar sua conta." 
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      }

      // Create new user with random password (they'll use OTP)
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
        console.error("Error creating user:", signUpError);
        throw new Error("Erro ao criar conta");
      }

      const userId = signUpData.user?.id;
      
      if (userId) {
        // Update profile with full name and phone
        await supabase
          .from("profiles")
          .update({ 
            full_name: fullName,
            phone: phone || null,
          })
          .eq("user_id", userId);

        // Get tenant ID (use provided slug or default)
        const tenantId = await getDefaultTenant(supabase);
        console.log("Using tenant:", tenantId);

        // Create membership based on role
        const membershipRole = validRole === 'mentor' ? 'admin' : 'mentee';
        const { data: membership, error: membershipError } = await supabase
          .from("memberships")
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            role: membershipRole,
            status: 'active',
          })
          .select()
          .single();

        if (membershipError) {
          console.error("Error creating membership:", membershipError);
        } else {
          console.log(`Membership '${membershipRole}' created for user:`, userId);

          // Create role-specific profile
          if (validRole === 'mentee') {
            // Find a mentor to assign (get first admin/mentor membership in tenant)
            const { data: mentorMembership } = await supabase
              .from("memberships")
              .select("id")
              .eq("tenant_id", tenantId)
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
              console.error("Error creating mentee_profile:", profileError);
            } else {
              console.log("Mentee profile created for membership:", membership.id);
            }

            // Create assignment if mentor exists
            if (mentorMembership) {
              await supabase
                .from("mentor_mentee_assignments")
                .insert({
                  tenant_id: tenantId,
                  mentor_membership_id: mentorMembership.id,
                  mentee_membership_id: membership.id,
                  status: 'active',
                });
            }

            // BACKWARD COMPATIBILITY: Also create legacy mentorado record
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
          } else {
            // Create mentor_profile for admin role
            const { error: profileError } = await supabase
              .from("mentor_profiles")
              .insert({
                membership_id: membership.id,
                business_name: `Mentoria de ${fullName}`,
              });

            if (profileError) {
              console.error("Error creating mentor_profile:", profileError);
            } else {
              console.log("Mentor profile created for membership:", membership.id);
            }

            // BACKWARD COMPATIBILITY: Also create legacy mentor record
            await supabase
              .from("mentors")
              .insert({
                user_id: userId,
                business_name: `Mentoria de ${fullName}`,
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
      }

      // Generate magic link for the new user
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });

      if (linkError) {
        console.error("Error generating link for new user:", linkError);
        throw new Error("Erro ao autenticar novo usuário");
      }

      // Mark code as used ONLY after everything succeeded (skip in devMode)
      if (!devMode && otpData?.id) {
        await supabase
          .from("otp_codes")
          .update({ used: true })
          .eq("id", otpData.id);
      }

      console.log("New user created and magic link generated:", normalizedEmail);

      return new Response(
        JSON.stringify({
          success: true,
          isNewUser: true,
          userType: validRole === 'mentor' ? 'mentor' : 'mentorado',
          userId: userId,
          actionLink: linkData.properties?.action_link,
          tokenHash: linkData.properties?.hashed_token,
          email: normalizedEmail,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
