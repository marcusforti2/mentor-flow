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

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Get mentorado ID
    const { data: mentorado, error: mentoradoError } = await supabase
      .from("mentorados")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (mentoradoError || !mentorado) {
      throw new Error("Mentorado not found");
    }

    const mentoradoId = mentorado.id;

    // Get all badges
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select("*");

    if (badgesError) {
      throw new Error("Error fetching badges");
    }

    // Get already unlocked badges
    const { data: unlockedBadges } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("mentorado_id", mentoradoId);

    const unlockedBadgeIds = new Set(unlockedBadges?.map((ub) => ub.badge_id) || []);

    // Calculate user stats
    const [
      prospectionsRes,
      progressRes,
      streakRes,
      aiUsageRes,
    ] = await Promise.all([
      supabase
        .from("crm_prospections")
        .select("id", { count: "exact" })
        .eq("mentorado_id", mentoradoId),
      supabase
        .from("trail_progress")
        .select("id, completed, lesson_id")
        .eq("mentorado_id", mentoradoId)
        .eq("completed", true),
      supabase
        .from("user_streaks")
        .select("current_streak")
        .eq("mentorado_id", mentoradoId)
        .maybeSingle(),
      supabase
        .from("ai_tool_usage")
        .select("tool_type")
        .eq("mentorado_id", mentoradoId),
    ]);

    // Calculate unique AI tools used
    const uniqueAiTools = new Set(aiUsageRes.data?.map((u) => u.tool_type) || []);

    const stats: UserStats = {
      prospectionCount: prospectionsRes.count || 0,
      lessonsCompleted: progressRes.data?.length || 0,
      modulesCompleted: 0, // Simplified - would need more complex query
      trailsCompleted: 0, // Simplified - would need more complex query
      weeklyRank: 0, // Would need ranking calculation
      streakDays: streakRes.data?.current_streak || 0,
      aiToolsUsed: uniqueAiTools.size,
    };

    // Check which badges should be unlocked
    const newlyUnlockedBadges: Badge[] = [];

    for (const badge of allBadges as Badge[]) {
      if (unlockedBadgeIds.has(badge.id)) {
        continue; // Already unlocked
      }

      const shouldUnlock = evaluateCriteria(badge.criteria, stats);
      
      if (shouldUnlock) {
        // Insert new user_badge
        const { error: insertError } = await supabase
          .from("user_badges")
          .insert({
            mentorado_id: mentoradoId,
            badge_id: badge.id,
          });

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
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in check-badges:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function evaluateCriteria(criteria: string, stats: UserStats): boolean {
  if (!criteria) return false;

  try {
    // Parse simple criteria like "prospection_count >= 1"
    const match = criteria.match(/(\w+)\s*(>=|<=|>|<|=)\s*(\d+)/);
    if (!match) return false;

    const [, field, operator, valueStr] = match;
    const value = parseInt(valueStr, 10);

    let statValue: number;
    switch (field) {
      case "prospection_count":
        statValue = stats.prospectionCount;
        break;
      case "lessons_completed":
        statValue = stats.lessonsCompleted;
        break;
      case "modules_completed":
        statValue = stats.modulesCompleted;
        break;
      case "trails_completed":
        statValue = stats.trailsCompleted;
        break;
      case "weekly_rank":
        // For rank, lower is better, so we invert the logic
        if (stats.weeklyRank === 0) return false; // Not ranked
        statValue = stats.weeklyRank;
        break;
      case "streak_days":
        statValue = stats.streakDays;
        break;
      case "ai_tools_used":
        statValue = stats.aiToolsUsed;
        break;
      default:
        return false;
    }

    switch (operator) {
      case ">=":
        return statValue >= value;
      case "<=":
        return statValue <= value;
      case ">":
        return statValue > value;
      case "<":
        return statValue < value;
      case "=":
        return statValue === value;
      default:
        return false;
    }
  } catch {
    return false;
  }
}
