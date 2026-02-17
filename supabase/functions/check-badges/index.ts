import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Badge { id: string; name: string; icon_url: string; criteria: string; points_required: number; tenant_id: string; }
interface UserStats { prospectionCount: number; lessonsCompleted: number; modulesCompleted: number; trailsCompleted: number; weeklyRank: number; streakDays: number; aiToolsUsed: number; }

function evaluateCriteria(criteria: string, stats: UserStats): boolean {
  if (!criteria) return false;
  try {
    const match = criteria.match(/(\w+)\s*(>=|<=|>|<|=)\s*(\d+)/);
    if (!match) return false;
    const [, field, operator, valueStr] = match;
    const value = parseInt(valueStr, 10);
    const fieldMap: Record<string, number | undefined> = {
      prospection_count: stats.prospectionCount, lessons_completed: stats.lessonsCompleted,
      modules_completed: stats.modulesCompleted, trails_completed: stats.trailsCompleted,
      weekly_rank: stats.weeklyRank === 0 ? undefined : stats.weeklyRank,
      streak_days: stats.streakDays, ai_tools_used: stats.aiToolsUsed,
    };
    const statValue = fieldMap[field];
    if (statValue === undefined) return false;
    switch (operator) {
      case ">=": return statValue >= value;
      case "<=": return statValue <= value;
      case ">": return statValue > value;
      case "<": return statValue < value;
      case "=": return statValue === value;
      default: return false;
    }
  } catch { return false; }
}

async function checkBadgesForMentee(supabase: any, membershipId: string, tenantId: string) {
  const { data: allBadges } = await supabase.from("badges").select("*").eq("tenant_id", tenantId);
  if (!allBadges?.length) return [];

  const { data: unlockedBadges } = await supabase.from("user_badges").select("badge_id").eq("membership_id", membershipId);
  const unlockedSet = new Set(unlockedBadges?.map((ub: any) => ub.badge_id) || []);

  const [prospectionsRes, progressRes, streakRes, aiUsageRes] = await Promise.all([
    supabase.from("crm_prospections").select("id", { count: "exact" }).eq("membership_id", membershipId),
    supabase.from("trail_progress").select("id").eq("membership_id", membershipId).eq("completed", true),
    supabase.from("user_streaks").select("current_streak").eq("membership_id", membershipId).maybeSingle(),
    supabase.from("ai_tool_usage").select("tool_type").eq("membership_id", membershipId),
  ]);

  const stats: UserStats = {
    prospectionCount: prospectionsRes.count || 0,
    lessonsCompleted: progressRes.data?.length || 0,
    modulesCompleted: 0, trailsCompleted: 0, weeklyRank: 0,
    streakDays: streakRes.data?.current_streak || 0,
    aiToolsUsed: new Set(aiUsageRes.data?.map((u: any) => u.tool_type) || []).size,
  };

  const newlyUnlocked: Badge[] = [];
  for (const badge of allBadges as Badge[]) {
    if (unlockedSet.has(badge.id)) continue;
    if (evaluateCriteria(badge.criteria, stats)) {
      const { error } = await supabase.from("user_badges").insert({ membership_id: membershipId, badge_id: badge.id });
      if (!error) newlyUnlocked.push(badge);
    }
  }
  return newlyUnlocked;
}

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
    const isCronMode = !body.membership_id;

    // === CRON MODE ===
    if (isCronMode) {
      const { tenant_id } = body;
      let tenants: { id: string }[];
      if (tenant_id) {
        tenants = [{ id: tenant_id }];
      } else {
        const { data } = await supabase.from("tenants").select("id");
        tenants = data || [];
      }

      let totalUnlocked = 0;
      for (const tenant of tenants) {
        const { data: automationConfig } = await supabase
          .from("tenant_automations")
          .select("is_enabled")
          .eq("tenant_id", tenant.id)
          .eq("automation_key", "check_badges")
          .maybeSingle();

        if (automationConfig && !automationConfig.is_enabled) continue;

        const { data: mentees } = await supabase
          .from("memberships")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("role", "mentee")
          .eq("status", "active");

        if (!mentees?.length) continue;

        for (const mentee of mentees) {
          const unlocked = await checkBadgesForMentee(supabase, mentee.id, tenant.id);
          totalUnlocked += unlocked.length;
        }

        await supabase
          .from("tenant_automations")
          .update({ last_run_at: new Date().toISOString(), last_run_status: "success" })
          .eq("tenant_id", tenant.id)
          .eq("automation_key", "check_badges");
      }

      return new Response(JSON.stringify({ success: true, total_unlocked: totalUnlocked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === MANUAL MODE: requires user auth ===
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("id, tenant_id")
      .eq("id", body.membership_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Membership not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const unlocked = await checkBadgesForMentee(supabase, membership.id, membership.tenant_id);

    return new Response(JSON.stringify({
      success: true,
      newlyUnlocked: unlocked.map(b => ({ id: b.id, name: b.name, icon: b.icon_url, points: b.points_required })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("check-badges error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Unknown error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
