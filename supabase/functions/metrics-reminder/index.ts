import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get request body (may include tenant_id filter)
    let filterTenantId: string | null = null;
    try {
      const body = await req.json();
      filterTenantId = body?.tenant_id || null;
    } catch {}

    // 1. Get all enabled metrics_reminder automations
    let query = supabase
      .from("tenant_automations")
      .select("tenant_id")
      .eq("automation_key", "metrics_reminder")
      .eq("is_enabled", true);

    if (filterTenantId) {
      query = query.eq("tenant_id", filterTenantId);
    }

    const { data: enabledTenants, error: tenantErr } = await query;
    if (tenantErr) throw tenantErr;
    if (!enabledTenants || enabledTenants.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum tenant com metrics_reminder ativo" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantIds = enabledTenants.map((t) => t.tenant_id);

    // 2. Get all active mentee memberships for these tenants
    const { data: mentees, error: menteeErr } = await supabase
      .from("memberships")
      .select("id, user_id, tenant_id")
      .in("tenant_id", tenantIds)
      .eq("role", "mentee")
      .eq("status", "active");

    if (menteeErr) throw menteeErr;
    if (!mentees || mentees.length === 0) {
      return new Response(JSON.stringify({ message: "Sem mentorados ativos" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. For each mentee, check last 7 days of activities
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const menteeIds = mentees.map((m) => m.id);
    const { data: recentActivities } = await supabase
      .from("mentee_activities")
      .select("membership_id, count")
      .in("membership_id", menteeIds)
      .gte("activity_date", sevenDaysAgoStr);

    // Aggregate by membership
    const activityMap: Record<string, number> = {};
    (recentActivities || []).forEach((a) => {
      activityMap[a.membership_id] = (activityMap[a.membership_id] || 0) + a.count;
    });

    // Get profiles for emails
    const userIds = mentees.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);

    const profileMap: Record<string, { email: string; full_name: string }> = {};
    (profiles || []).forEach((p) => {
      profileMap[p.user_id] = { email: p.email || "", full_name: p.full_name || "Mentorado" };
    });

    // Get tenant names
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name")
      .in("id", tenantIds);

    const tenantMap: Record<string, string> = {};
    (tenants || []).forEach((t) => {
      tenantMap[t.id] = t.name;
    });

    // 4. Send emails
    let sentCount = 0;
    let skippedCount = 0;

    for (const mentee of mentees) {
      const profile = profileMap[mentee.user_id];
      if (!profile?.email) {
        skippedCount++;
        continue;
      }

      const totalActivities = activityMap[mentee.id] || 0;
      const tenantName = tenantMap[mentee.tenant_id] || "MentorFlow";
      const firstName = profile.full_name.split(" ")[0];
      const filled = totalActivities > 0;

      const subject = filled
        ? `${firstName}, ótimo trabalho! Confira seu resumo semanal 📊`
        : `${firstName}, suas métricas da semana passada estão pendentes! ⚠️`;

      const html = filled
        ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
            <h1 style="color: #10b981; font-size: 24px; margin-bottom: 8px;">Parabéns, ${firstName}! 🎉</h1>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Você registrou <strong>${totalActivities} atividade(s)</strong> na última semana no programa <strong>${tenantName}</strong>.
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Consistência é o que gera resultado. Continue assim!
            </p>
            <div style="margin: 24px 0;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/mentorado/metricas" 
                 style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Ver meu painel →
              </a>
            </div>
            <p style="color: #999; font-size: 12px;">Enviado automaticamente por ${tenantName}</p>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
            <h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 8px;">${firstName}, cadê seus números? 📊</h1>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Notamos que você não preencheu suas métricas na última semana no programa <strong>${tenantName}</strong>.
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              <strong>Sem dados preenchidos, não conseguimos calcular seu ROI</strong> e seu mentor não consegue te acompanhar.
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Leva menos de 2 minutos. Bora? 💪
            </p>
            <div style="margin: 24px 0;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/mentorado/metricas" 
                 style="background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Preencher agora →
              </a>
            </div>
            <p style="color: #999; font-size: 12px;">Enviado automaticamente por ${tenantName}</p>
          </div>
        `;

      // Send via Resend if key available
      if (resendKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${tenantName} <onboarding@resend.dev>`,
              to: [profile.email],
              subject,
              html,
            }),
          });

          if (res.ok) {
            sentCount++;
          } else {
            console.error(`Failed to send to ${profile.email}:`, await res.text());
            skippedCount++;
          }
        } catch (err) {
          console.error(`Error sending to ${profile.email}:`, err);
          skippedCount++;
        }
      } else {
        // No Resend key — just log
        console.log(`[metrics-reminder] Would send to ${profile.email}: ${subject}`);
        sentCount++;
      }
    }

    // 5. Update last_run
    for (const tid of tenantIds) {
      await supabase
        .from("tenant_automations")
        .update({ last_run_at: new Date().toISOString(), last_run_status: "success" })
        .eq("tenant_id", tid)
        .eq("automation_key", "metrics_reminder");
    }

    return new Response(
      JSON.stringify({ sent: sentCount, skipped: skippedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[metrics-reminder] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
