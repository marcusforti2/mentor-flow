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
    const { email, code, fullName } = await req.json();

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
    
    console.log("Verifying OTP:", { email: normalizedEmail, code: normalizedCode });
    
    // Find any valid OTP for this email/code combination that hasn't expired
    // We don't care if it's used or not - as long as it hasn't expired, allow it
    const { data: otpData, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", normalizedCode)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    console.log("OTP query result:", { found: !!otpData, error: otpError?.message });

    if (otpError) {
      console.error("OTP query error:", otpError);
      throw new Error("Erro ao verificar código");
    }

    if (!otpData) {
      console.log("No valid OTP found for:", { email: normalizedEmail, code: normalizedCode });
      throw new Error("Código inválido ou expirado");
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

      // Mark code as used ONLY after successful link generation
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("id", otpData.id);

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
      // New user - need name
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

      // Create new user with random password (they'll use OTP)
      const randomPassword = crypto.randomUUID();
      
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (signUpError) {
        console.error("Error creating user:", signUpError);
        throw new Error("Erro ao criar conta");
      }

      // Update profile with full name
      if (signUpData.user) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName })
          .eq("user_id", signUpData.user.id);
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

      // Mark code as used ONLY after everything succeeded
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("id", otpData.id);

      console.log("New user created and magic link generated:", normalizedEmail);

      return new Response(
        JSON.stringify({
          success: true,
          isNewUser: true,
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
