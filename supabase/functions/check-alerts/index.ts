import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { tenant_id, mentor_membership_id } = await req.json();
    if (!tenant_id || !mentor_membership_id) {
      return new Response(JSON.stringify({ error: "tenant_id and mentor_membership_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const alerts: Array<{
      tenant_id: string;
      mentor_membership_id: string;
      mentee_membership_id: string;
      alert_type: string;
      severity: string;
      title: string;
      description: string;
    }> = [];

    // Get active mentees
    const { data: mentees } = await supabase
      .from("memberships")
      .select("id, user_id")
      .eq("tenant_id", tenant_id)
      .eq("role", "mentee")
      .eq("status", "active");

    if (!mentees?.length) {
      return new Response(JSON.stringify({ alerts_created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles for names
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", mentees.map(m => m.user_id));

    const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name || "Sem nome"]));

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Check each mentee
    for (const mentee of mentees) {
      const menteeName = nameMap.get(mentee.user_id) || "Sem nome";

      // 1. Inactive check — no activity in 3 days
      const { data: recentActivity } = await supabase
        .from("activity_logs")
        .select("id")
        .eq("membership_id", mentee.id)
        .gte("created_at", threeDaysAgo)
        .limit(1);

      if (!recentActivity?.length) {
        alerts.push({
          tenant_id,
          mentor_membership_id,
          mentee_membership_id: mentee.id,
          alert_type: "inactive",
          severity: "high",
          title: `${menteeName} está inativo`,
          description: `Sem atividade há mais de 3 dias. Considere entrar em contato.`,
        });
      }

      // 2. Task overdue
      const { data: overdueTasks } = await supabase
        .from("campan_tasks")
        .select("id, title")
        .eq("mentorado_membership_id", mentee.id)
        .neq("status_column", "done")
        .lt("due_date", now.toISOString().split("T")[0])
        .limit(3);

      if (overdueTasks?.length) {
        alerts.push({
          tenant_id,
          mentor_membership_id,
          mentee_membership_id: mentee.id,
          alert_type: "task_overdue",
          severity: "medium",
          title: `${menteeName} tem ${overdueTasks.length} tarefa(s) atrasada(s)`,
          description: overdueTasks.map(t => t.title).join(", "),
        });
      }
    }

    // 3. SOS pending — unresolved SOS calls
    const { data: pendingSos } = await supabase
      .from("sos_calls")
      .select("id, membership_id, subject")
      .eq("tenant_id", tenant_id)
      .eq("status", "pending")
      .limit(5);

    if (pendingSos?.length) {
      for (const sos of pendingSos) {
        const sosMentee = mentees.find(m => m.id === sos.membership_id);
        const sosName = sosMentee ? nameMap.get(sosMentee.user_id) || "Mentorado" : "Mentorado";
        alerts.push({
          tenant_id,
          mentor_membership_id,
          mentee_membership_id: sos.membership_id,
          alert_type: "sos_pending",
          severity: "urgent",
          title: `SOS de ${sosName}: ${sos.subject || "Sem assunto"}`,
          description: "Chamado SOS aguardando resposta.",
        });
      }
    }

    // Deduplicate: remove alerts that already exist (same type + mentee + today)
    const today = now.toISOString().split("T")[0];
    const { data: existingAlerts } = await supabase
      .from("smart_alerts")
      .select("alert_type, mentee_membership_id")
      .eq("mentor_membership_id", mentor_membership_id)
      .gte("created_at", today)
      .eq("is_dismissed", false);

    const existingSet = new Set(
      (existingAlerts || []).map(a => `${a.alert_type}__${a.mentee_membership_id}`)
    );

    const newAlerts = alerts.filter(
      a => !existingSet.has(`${a.alert_type}__${a.mentee_membership_id}`)
    );

    if (newAlerts.length > 0) {
      await supabase.from("smart_alerts").insert(newAlerts);
    }

    // Cleanup expired alerts (older than 7 days, already read)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("smart_alerts")
      .delete()
      .eq("mentor_membership_id", mentor_membership_id)
      .eq("is_read", true)
      .lt("created_at", sevenDaysAgo);

    return new Response(
      JSON.stringify({ alerts_created: newAlerts.length, total_detected: alerts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
