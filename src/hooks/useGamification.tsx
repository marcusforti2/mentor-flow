import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  criteria: string;
  points_required: number;
}

interface UserBadge {
  id: string;
  badge_id: string;
  unlocked_at: string;
  badge: Badge;
}

interface UserStats {
  prospectionCount: number;
  lessonsCompleted: number;
  modulesCompleted: number;
  trailsCompleted: number;
  weeklyRank: number;
  streakDays: number;
  aiToolsUsed: number;
  totalPoints: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  points_cost: number;
  category: string;
  stock: number | null;
  is_active: boolean;
}

interface RewardRedemption {
  id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  redeemed_at: string;
  reward: Reward;
}

// ─── Query functions ────────────────────────────────────────────

async function fetchBadgesAndRewards() {
  const [badgesRes, rewardsRes] = await Promise.all([
    supabase.from("badges").select("*").order("points_required", { ascending: true }),
    supabase.from("reward_catalog").select("*").eq("is_active", true).order("points_cost", { ascending: true }),
  ]);
  return {
    badges: (badgesRes.data || []) as Badge[],
    rewards: (rewardsRes.data || []) as Reward[],
  };
}

async function fetchUserGamificationData(mentoradoId: string) {
  const [unlockedBadgesRes, prospectionsRes, progressRes, streakRes, aiUsageRes, rankingRes, redemptionsRes] = await Promise.all([
    supabase.from("user_badges").select(`id, badge_id, unlocked_at, badge:badges(*)`).eq("membership_id", mentoradoId),
    supabase.from("crm_prospections").select("id", { count: "exact" }).eq("membership_id", mentoradoId),
    supabase.from("trail_progress").select("id, completed").eq("membership_id", mentoradoId).eq("completed", true),
    supabase.from("user_streaks").select("current_streak, longest_streak").eq("membership_id", mentoradoId).maybeSingle(),
    supabase.from("ai_tool_usage").select("tool_type").eq("membership_id", mentoradoId),
    supabase.from("ranking_entries").select("points").eq("membership_id", mentoradoId)
      .eq("period_type", "weekly").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("reward_redemptions").select(`id, reward_id, points_spent, status, redeemed_at, reward:reward_catalog(*)`)
      .eq("membership_id", mentoradoId).order("redeemed_at", { ascending: false }),
  ]);

  const userBadges = (unlockedBadgesRes.data || []) as unknown as UserBadge[];
  const uniqueAiTools = new Set(aiUsageRes.data?.map((u) => u.tool_type) || []);
  const totalPoints = userBadges.reduce(
    (sum, ub) => sum + ((ub.badge as unknown as Badge)?.points_required || 0), 0
  );

  const stats: UserStats = {
    prospectionCount: prospectionsRes.count || 0,
    lessonsCompleted: progressRes.data?.length || 0,
    modulesCompleted: 0, trailsCompleted: 0, weeklyRank: 0,
    streakDays: streakRes.data?.current_streak || 0,
    aiToolsUsed: uniqueAiTools.size, totalPoints,
  };

  return {
    userBadges,
    stats,
    redemptions: (redemptionsRes.data || []) as unknown as RewardRedemption[],
  };
}

// ─── Hook ───────────────────────────────────────────────────────

export function useGamification() {
  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const mentoradoId = activeMembership?.id ?? null;
  const queryClient = useQueryClient();

  // Catalog: badges + rewards (shared, no membership needed)
  const { data: catalog, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["gamification-catalog"],
    queryFn: fetchBadgesAndRewards,
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 min — rarely changes
    gcTime: 15 * 60 * 1000,
  });

  // User-specific data
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["gamification-user", mentoradoId],
    queryFn: () => fetchUserGamificationData(mentoradoId!),
    enabled: !!mentoradoId && !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const badges = catalog?.badges ?? [];
  const rewards = catalog?.rewards ?? [];
  const userBadges = userData?.userBadges ?? [];
  const stats = userData?.stats ?? null;
  const redemptions = userData?.redemptions ?? [];
  const isLoading = isLoadingCatalog || isLoadingUser;

  // ─── Write operations (fire-and-forget, don't block render) ──

  const updateStreak = useCallback(async () => {
    if (!mentoradoId) return;
    const today = new Date().toISOString().split("T")[0];

    const { data: existingStreak } = await supabase
      .from("user_streaks").select("*")
      .eq("membership_id", mentoradoId)
      .maybeSingle();

    if (existingStreak) {
      const lastAccess = existingStreak.last_access_date;
      if (lastAccess === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = 1;
      if (lastAccess === yesterdayStr) newStreak = (existingStreak.current_streak || 0) + 1;
      const longestStreak = Math.max(newStreak, existingStreak.longest_streak || 0);

      await supabase.from("user_streaks")
        .update({ current_streak: newStreak, longest_streak: longestStreak, last_access_date: today, updated_at: new Date().toISOString() })
        .eq("membership_id", existingStreak.membership_id);
    } else {
      await supabase.from("user_streaks").insert({
        membership_id: mentoradoId, current_streak: 1, longest_streak: 1, last_access_date: today,
      });
    }

    // Silently refresh user data in background
    queryClient.invalidateQueries({ queryKey: ["gamification-user", mentoradoId] });
  }, [mentoradoId, queryClient]);

  const trackAiToolUsage = useCallback(async (toolType: string) => {
    if (!mentoradoId) return;
    await supabase.from("ai_tool_usage").insert({ membership_id: mentoradoId, tool_type: toolType });
    queryClient.invalidateQueries({ queryKey: ["gamification-user", mentoradoId] });
  }, [mentoradoId, queryClient]);

  const redeemReward = useCallback(async (rewardId: string, shippingAddress?: string) => {
    if (!mentoradoId || !stats) return { success: false, error: "Não autorizado" };
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return { success: false, error: "Prêmio não encontrado" };
    if (stats.totalPoints < reward.points_cost) return { success: false, error: "Pontos insuficientes" };
    if (reward.stock !== null && reward.stock <= 0) return { success: false, error: "Prêmio esgotado" };

    const { data, error } = await supabase.from("reward_redemptions")
      .insert({ membership_id: mentoradoId, reward_id: rewardId, points_spent: reward.points_cost, shipping_address: shippingAddress, status: "pending" })
      .select().single();

    if (error) return { success: false, error: error.message };

    const newRedemption: RewardRedemption = {
      id: data.id, reward_id: data.reward_id, points_spent: data.points_spent,
      status: data.status, redeemed_at: data.redeemed_at, reward,
    };

    queryClient.invalidateQueries({ queryKey: ["gamification-user", mentoradoId] });
    return { success: true, data: newRedemption };
  }, [mentoradoId, stats, rewards, queryClient]);

  const isBadgeUnlocked = useCallback((badgeId: string) => userBadges.some((ub) => ub.badge_id === badgeId), [userBadges]);
  const getBadgeUnlockDate = useCallback((badgeId: string) => userBadges.find((ub) => ub.badge_id === badgeId)?.unlocked_at, [userBadges]);

  return {
    badges, userBadges, stats, rewards, redemptions, isLoading, mentoradoId,
    updateStreak, trackAiToolUsage, redeemReward, isBadgeUnlocked, getBadgeUnlockDate,
  };
}
