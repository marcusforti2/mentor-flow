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

    console.log("ensure-mentorado called for user:", user.id);

    // Check if user is already a mentor (should not auto-link mentors as mentorados)
    const { data: mentorRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "mentor")
      .maybeSingle();

    if (mentorRole) {
      return new Response(JSON.stringify({ error: "User is a mentor, not a mentorado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if mentorado record already exists
    const { data: existing, error: existingError } = await supabase
      .from("mentorados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing mentorado:", existingError);
      throw existingError;
    }

    if (existing?.id) {
      console.log("Mentorado already exists:", existing.id);
      return new Response(JSON.stringify({ success: true, mentorado_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-link only works when there is exactly ONE mentor in the system
    const { data: mentors, error: mentorsError } = await supabase
      .from("mentors")
      .select("id")
      .limit(2);

    if (mentorsError) throw mentorsError;

    if (!mentors || mentors.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum mentor cadastrado no sistema ainda." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mentors.length > 1) {
      return new Response(
        JSON.stringify({
          error: "Existem múltiplos mentores. Aguarde aprovação manual do seu mentor.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mentorId = mentors[0].id as string;
    console.log("Auto-linking to mentor:", mentorId);

    // Ensure user has the mentorado role (insert if not exists)
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: "mentorado" },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );

    if (roleError) {
      console.error("Error assigning mentorado role:", roleError);
      throw roleError;
    }

    // Create the mentorado record
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

    if (insertError) {
      console.error("Error creating mentorado record:", insertError);
      throw insertError;
    }

    console.log("Mentorado created successfully:", created.id);

    return new Response(JSON.stringify({ success: true, mentorado_id: created.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ensure-mentorado:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
