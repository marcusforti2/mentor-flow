import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code, fullName, phone, userType, devMode, mentorId } = await req.json();

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
      const validUserType = userType === 'mentor' ? 'mentor' : 'mentorado';

      // PREVENT creating user if trying to register as mentor but mentor already exists
      if (validUserType === 'mentor') {
        const { data: existingMentor } = await supabase
          .from("user_roles")
          .select("id")
          .eq("role", "mentor")
          .limit(1)
          .maybeSingle();
        
        if (existingMentor) {
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

        // Assign role based on userType
        const { error: roleError } = await supabase.rpc('assign_role', {
          _user_id: userId,
          _role: validUserType
        });

        if (roleError) {
          console.error("Error assigning role:", roleError);
          // Don't throw - user was created, just log the error
        }

        console.log(`Role '${validUserType}' assigned to user:`, userId);

        // If mentorado, create the mentorado record
        if (validUserType === 'mentorado') {
          // Get mentor_id - use provided mentorId or find first available mentor
          let targetMentorId = mentorId;
          if (!targetMentorId) {
            const { data: firstMentor } = await supabase
              .from("mentors")
              .select("id")
              .limit(1)
              .single();
            targetMentorId = firstMentor?.id;
          }

          if (targetMentorId) {
            const { error: mentoradoError } = await supabase
              .from("mentorados")
              .insert({
                user_id: userId,
                mentor_id: targetMentorId,
                status: 'active',
                onboarding_completed: devMode ? true : false,
              });

            if (mentoradoError) {
              console.error("Error creating mentorado:", mentoradoError);
            } else {
              console.log("Mentorado record created for user:", userId);
            }
          }
        }

        // If mentor in devMode, create mentor record
        if (validUserType === 'mentor' && devMode) {
          const { data: mentorRecord, error: mentorError } = await supabase
            .from("mentors")
            .insert({
              user_id: userId,
              business_name: `Mentoria de ${fullName}`,
            })
            .select()
            .single();

          if (mentorError) {
            console.error("Error creating mentor:", mentorError);
          } else {
            console.log("Mentor record created:", mentorRecord?.id);
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
          userType: validUserType,
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
