import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const isCronMode = !body.tenant_id || !body.mentor_membership_id;

    // === CRON MODE: iterate all tenants ===
    if (isCronMode) {
      const { tenant_id } = body;
      let tenants: { id: string }[];
      if (tenant_id) {
        tenants = [{ id: tenant_id }];
      } else {
        const { data } = await supabase.from("tenants").select("id");
        tenants = data || [];
      }

      let totalAlerts = 0;

      for (const tenant of tenants) {
        const { data: automationConfig } = await supabase
          .from("tenant_automations")
          .select("is_enabled")
          .eq("tenant_id", tenant.id)
          .eq("automation_key", "check_alerts")
          .maybeSingle();

        if (automationConfig && !automationConfig.is_enabled) continue;

        // Get mentors for this tenant
        const { data: mentors } = await supabase
          .from("memberships")
          .select("id")
          .eq("tenant_id", tenant.id)
          .in("role", ["admin", "mentor"])
          .eq("status", "active");

        if (!mentors?.length) continue;

        for (const mentor of mentors) {
          const alertCount = await runAlertsForTenantMentor(supabase, tenant.id, mentor.id);
          totalAlerts += alertCount;
        }

        await supabase
          .from("tenant_automations")
          .update({ last_run_at: new Date().toISOString(), last_run_status: "success" })
          .eq("tenant_id", tenant.id)
          .eq("automation_key", "check_alerts");
      }

      return new Response(JSON.stringify({ success: true, alerts_created: totalAlerts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === MANUAL MODE: requires user auth ===
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: callerMembership } = await supabase
      .from("memberships")
      .select("id")
      .eq("id", body.mentor_membership_id)
      .eq("user_id", user.id)
      .eq("tenant_id", body.tenant_id)
      .eq("status", "active")
      .maybeSingle();

    if (!callerMembership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const alertCount = await runAlertsForTenantMentor(supabase, body.tenant_id, body.mentor_membership_id);

    await supabase
      .from("tenant_automations")
      .update({ last_run_at: new Date().toISOString(), last_run_status: "success" })
      .eq("tenant_id", body.tenant_id)
      .eq("automation_key", "check_alerts");

    return new Response(JSON.stringify({ alerts_created: alertCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("check-alerts error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function runAlertsForTenantMentor(supabase: any, tenantId: string, mentorMembershipId: string): Promise<number> {
  const alerts: any[] = [];
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: mentees } = await supabase
    .from("memberships")
    .select("id, user_id")
    .eq("tenant_id", tenantId)
    .eq("role", "mentee")
    .eq("status", "active");

  if (!mentees?.length) return 0;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", mentees.map((m: any) => m.user_id));

  const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name || "Sem nome"]));

  for (const mentee of mentees) {
    const menteeName = nameMap.get(mentee.user_id) || "Sem nome";

    const { data: recentActivity } = await supabase
      .from("activity_logs")
      .select("id")
      .eq("membership_id", mentee.id)
      .gte("created_at", threeDaysAgo)
      .limit(1);

    if (!recentActivity?.length) {
      alerts.push({
        tenant_id: tenantId,
        mentor_membership_id: mentorMembershipId,
        mentee_membership_id: mentee.id,
        alert_type: "inactive",
        severity: "high",
        title: `${menteeName} está inativo`,
        description: `Sem atividade há mais de 3 dias.`,
      });
    }

    const { data: overdueTasks } = await supabase
      .from("campan_tasks")
      .select("id, title")
      .eq("mentorado_membership_id", mentee.id)
      .neq("status_column", "done")
      .lt("due_date", now.toISOString().split("T")[0])
      .limit(3);

    if (overdueTasks?.length) {
      alerts.push({
        tenant_id: tenantId,
        mentor_membership_id: mentorMembershipId,
        mentee_membership_id: mentee.id,
        alert_type: "task_overdue",
        severity: "medium",
        title: `${menteeName} tem ${overdueTasks.length} tarefa(s) atrasada(s)`,
        description: overdueTasks.map((t: any) => t.title).join(", "),
      });
    }
  }

  // Deduplicate
  const today = now.toISOString().split("T")[0];
  const { data: existingAlerts } = await supabase
    .from("smart_alerts")
    .select("alert_type, mentee_membership_id")
    .eq("mentor_membership_id", mentorMembershipId)
    .gte("created_at", today)
    .eq("is_dismissed", false);

  const existingSet = new Set((existingAlerts || []).map((a: any) => `${a.alert_type}__${a.mentee_membership_id}`));
  const newAlerts = alerts.filter(a => !existingSet.has(`${a.alert_type}__${a.mentee_membership_id}`));

  if (newAlerts.length > 0) {
    await supabase.from("smart_alerts").insert(newAlerts);
  }

  // Cleanup old read alerts
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("smart_alerts").delete()
    .eq("mentor_membership_id", mentorMembershipId)
    .eq("is_read", true)
    .lt("created_at", sevenDaysAgo);

  return newAlerts.length;
}
