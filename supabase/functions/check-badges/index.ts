// @deno-types="npm:@supabase/supabase-js@2"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Badge {
  id: string;
  name: string;
  icon_url: string;
  criteria: string;
  points_required: number;
}

interface UserStats {
  prospectionCount: number;
  lessonsCompleted: number;
  modulesCompleted: number;
  trailsCompleted: number;
  weeklyRank: number;
  streakDays: number;
  aiToolsUsed: number;
}

function evaluateCriteria(criteria: string, stats: UserStats): boolean {
  if (!criteria) return false;
  try {
    const match = criteria.match(/(\w+)\s*(>=|<=|>|<|=)\s*(\d+)/);
    if (!match) return false;

    const [, field, operator, valueStr] = match;
    const value = parseInt(valueStr, 10);

    const fieldMap: Record<string, number | undefined> = {
      prospection_count: stats.prospectionCount,
      lessons_completed: stats.lessonsCompleted,
      modules_completed: stats.modulesCompleted,
      trails_completed: stats.trailsCompleted,
      weekly_rank: stats.weeklyRank === 0 ? undefined : stats.weeklyRank,
      streak_days: stats.streakDays,
      ai_tools_used: stats.aiToolsUsed,
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
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Get membership_id from body or find active mentee membership
    const body = await req.json().catch(() => ({}));
    let membershipId: string;

    if (body.membership_id) {
      // Validate ownership: the membership must belong to this user
      const { data: membership, error: memError } = await supabase
        .from("memberships")
        .select("id, tenant_id")
        .eq("id", body.membership_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (memError || !membership) {
        throw new Error("Membership not found or unauthorized");
      }
      membershipId = membership.id;
    } else {
      // Fallback: find first active mentee membership
      const { data: membership, error: memError } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "mentee")
        .eq("status", "active")
        .limit(1)
        .single();

      if (memError || !membership) {
        throw new Error("No active mentee membership found");
      }
      membershipId = membership.id;
    }

    // Check if automation is enabled for the tenant
    const { data: membershipForTenant } = await supabase
      .from("memberships")
      .select("tenant_id")
      .eq("id", membershipId)
      .single();

    if (membershipForTenant?.tenant_id) {
      const { data: automationConfig } = await supabase
        .from("tenant_automations")
        .select("is_enabled")
        .eq("tenant_id", membershipForTenant.tenant_id)
        .eq("automation_key", "check_badges")
        .maybeSingle();

      if (automationConfig && !automationConfig.is_enabled) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "automation_disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get all badges for this tenant
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select("*");

    if (badgesError) throw new Error("Error fetching badges");

    // Get already unlocked badges
    const { data: unlockedBadges } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("membership_id", membershipId);

    const unlockedBadgeIds = new Set(unlockedBadges?.map((ub) => ub.badge_id) || []);

    // Calculate user stats using membership_id
    const [prospectionsRes, progressRes, streakRes, aiUsageRes] = await Promise.all([
      supabase
        .from("crm_prospections")
        .select("id", { count: "exact" })
        .eq("membership_id", membershipId),
      supabase
        .from("trail_progress")
        .select("id, completed, lesson_id")
        .eq("membership_id", membershipId)
        .eq("completed", true),
      supabase
        .from("user_streaks")
        .select("current_streak")
        .eq("membership_id", membershipId)
        .maybeSingle(),
      supabase
        .from("ai_tool_usage")
        .select("tool_type")
        .eq("membership_id", membershipId),
    ]);

    const uniqueAiTools = new Set(aiUsageRes.data?.map((u) => u.tool_type) || []);

    const stats: UserStats = {
      prospectionCount: prospectionsRes.count || 0,
      lessonsCompleted: progressRes.data?.length || 0,
      modulesCompleted: 0,
      trailsCompleted: 0,
      weeklyRank: 0,
      streakDays: streakRes.data?.current_streak || 0,
      aiToolsUsed: uniqueAiTools.size,
    };

    // Check which badges should be unlocked
    const newlyUnlockedBadges: Badge[] = [];

    for (const badge of allBadges as Badge[]) {
      if (unlockedBadgeIds.has(badge.id)) continue;

      if (evaluateCriteria(badge.criteria, stats)) {
        const { error: insertError } = await supabase
          .from("user_badges")
          .insert({ membership_id: membershipId, badge_id: badge.id });

        if (!insertError) {
          newlyUnlockedBadges.push(badge);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        newlyUnlocked: newlyUnlockedBadges.map((b) => ({
          id: b.id,
          name: b.name,
          icon: b.icon_url,
          points: b.points_required,
        })),
        stats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in check-badges:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
