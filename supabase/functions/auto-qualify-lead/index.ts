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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const isCronMode = !body.prospection_id && !body.membership_id;

    // === CRON MODE: qualify unqualified leads across tenants ===
    if (isCronMode) {
      const { tenant_id } = body;
      let tenants: { id: string }[];
      if (tenant_id) {
        tenants = [{ id: tenant_id }];
      } else {
        const { data } = await supabase.from("tenants").select("id");
        tenants = data || [];
      }

      let totalQualified = 0;

      for (const tenant of tenants) {
        const { data: automationConfig } = await supabase
          .from("tenant_automations")
          .select("is_enabled")
          .eq("tenant_id", tenant.id)
          .eq("automation_key", "auto_qualify_lead")
          .maybeSingle();

        if (automationConfig && !automationConfig.is_enabled) continue;

        // Get unqualified leads with profile_url but no ai_insights
        const { data: leads } = await supabase
          .from("crm_prospections")
          .select("id, contact_name, profile_url, membership_id")
          .eq("tenant_id", tenant.id)
          .is("ai_insights", null)
          .not("profile_url", "is", null)
          .limit(10);

        if (!leads?.length) continue;

        for (const lead of leads) {
          if (!lead.profile_url || !lead.membership_id) continue;

          try {
            const qualifyRes = await fetch(`${supabaseUrl}/functions/v1/lead-qualifier`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
                apikey: serviceKey,
              },
              body: JSON.stringify({
                profileUrl: lead.profile_url,
                prospectionId: lead.id,
                membershipId: lead.membership_id,
              }),
            });

            if (qualifyRes.ok) {
              totalQualified++;
              console.log(`Auto-qualified: ${lead.contact_name}`);
            } else {
              const errText = await qualifyRes.text();
              console.error(`Failed to qualify ${lead.contact_name}:`, errText);
            }
          } catch (e) {
            console.error(`Error qualifying ${lead.contact_name}:`, e);
          }
        }

        await supabase
          .from("tenant_automations")
          .update({ last_run_at: new Date().toISOString(), last_run_status: "success" })
          .eq("tenant_id", tenant.id)
          .eq("automation_key", "auto_qualify_lead");
      }

      return new Response(JSON.stringify({ success: true, leads_qualified: totalQualified }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === MANUAL MODE: specific lead ===
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { prospection_id, membership_id } = body;
    if (!prospection_id || !membership_id) {
      return new Response(JSON.stringify({ error: "prospection_id and membership_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    const { data: prospection } = await supabase
      .from("crm_prospections")
      .select("id, contact_name, profile_url, ai_insights")
      .eq("id", prospection_id)
      .eq("membership_id", membership_id)
      .single();

    if (!prospection) {
      return new Response(JSON.stringify({ error: "Prospection not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (prospection.ai_insights) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_qualified" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!prospection.profile_url) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_profile_url" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const qualifyRes = await fetch(`${supabaseUrl}/functions/v1/lead-qualifier`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      body: JSON.stringify({ profileUrl: prospection.profile_url, prospectionId: prospection.id, membershipId: membership_id }),
    });

    const qualifyResult = await qualifyRes.json();
    if (!qualifyRes.ok) {
      return new Response(JSON.stringify({ success: false, error: qualifyResult.error || "Qualification failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, qualification: qualifyResult }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("auto-qualify-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
