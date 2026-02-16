import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { prospection_id, membership_id } = await req.json();
    if (!prospection_id || !membership_id) {
      return new Response(JSON.stringify({ error: "prospection_id and membership_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate ownership
    const { data: membership } = await supabase
      .from("memberships")
      .select("id, tenant_id")
      .eq("id", membership_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get the prospection
    const { data: prospection } = await supabase
      .from("crm_prospections")
      .select("id, contact_name, profile_url, ai_insights")
      .eq("id", prospection_id)
      .eq("membership_id", membership_id)
      .single();

    if (!prospection) {
      return new Response(JSON.stringify({ error: "Prospection not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Skip if already qualified or no social URL
    if (prospection.ai_insights) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_qualified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!prospection.profile_url) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_profile_url" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call the existing lead-qualifier function internally
    const qualifyRes = await fetch(`${supabaseUrl}/functions/v1/lead-qualifier`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
      },
      body: JSON.stringify({
        profileUrl: prospection.profile_url,
        prospectionId: prospection.id,
        membershipId: membership_id,
      }),
    });

    const qualifyResult = await qualifyRes.json();

    if (!qualifyRes.ok) {
      console.error("Auto-qualify failed:", qualifyResult);
      return new Response(JSON.stringify({ success: false, error: qualifyResult.error || "Qualification failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Auto-qualified lead ${prospection.contact_name} (${prospection_id})`);

    return new Response(JSON.stringify({ success: true, qualification: qualifyResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-qualify-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
