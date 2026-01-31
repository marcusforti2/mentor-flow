import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Must already have the mentorado role
    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "mentorado")
      .maybeSingle();

    if (roleError) throw roleError;
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "User is not a mentorado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If mentorado already exists, return it
    const { data: existing, error: existingError } = await supabase
      .from("mentorados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.id) {
      return new Response(JSON.stringify({ success: true, mentorado_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-link only when there is exactly ONE mentor in the system.
    const { data: mentors, error: mentorsError } = await supabase
      .from("mentors")
      .select("id")
      .limit(2);

    if (mentorsError) throw mentorsError;
    if (!mentors || mentors.length !== 1) {
      return new Response(
        JSON.stringify({
          error:
            "Não foi possível vincular automaticamente. Peça para o mentor aprovar seu acesso (ou defina um mentor padrão).",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mentorId = mentors[0].id as string;

    const { data: created, error: insertError } = await supabase
      .from("mentorados")
      .insert({
        user_id: user.id,
        mentor_id: mentorId,
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, mentorado_id: created.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ensure-mentorado:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
