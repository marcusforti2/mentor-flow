import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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

export function useGamification() {
  const { user } = useAuth();
  const [mentoradoId, setMentoradoId] = useState<string | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get mentorado ID (with user.id fallback)
  useEffect(() => {
    const getMentoradoId = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("mentorados")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Use mentorado_id if exists, otherwise use user.id as fallback
      setMentoradoId(data?.id || user.id);
    };

    getMentoradoId();
  }, [user]);

  // Fetch all data - works for any authenticated user
  useEffect(() => {
    const fetchData = async () => {
      if (!mentoradoId || !user) {
        // Still load badges and rewards catalog for display
        if (user) {
          try {
            const { data: allBadges } = await supabase
              .from("badges")
              .select("*")
              .order("points_required", { ascending: true });
            if (allBadges) setBadges(allBadges);

            const { data: rewardsData } = await supabase
              .from("reward_catalog")
              .select("*")
              .eq("is_active", true)
              .order("points_cost", { ascending: true });
            if (rewardsData) setRewards(rewardsData);
          } catch (error) {
            console.error("Error fetching catalog data:", error);
          }
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Fetch all badges
        const { data: allBadges } = await supabase
          .from("badges")
          .select("*")
          .order("points_required", { ascending: true });

        if (allBadges) {
          setBadges(allBadges);
        }

        // Fetch user's unlocked badges
        const { data: unlockedBadges } = await supabase
          .from("user_badges")
          .select(`
            id,
            badge_id,
            unlocked_at,
            badge:badges(*)
          `)
          .eq("mentorado_id", mentoradoId);

        if (unlockedBadges) {
          setUserBadges(unlockedBadges as unknown as UserBadge[]);
        }

        // Fetch user stats
        const [
          prospectionsRes,
          progressRes,
          streakRes,
          aiUsageRes,
          rankingRes,
        ] = await Promise.all([
          supabase
            .from("crm_prospections")
            .select("id", { count: "exact" })
            .eq("mentorado_id", mentoradoId),
          supabase
            .from("trail_progress")
            .select("id, completed")
            .eq("mentorado_id", mentoradoId)
            .eq("completed", true),
          supabase
            .from("user_streaks")
            .select("current_streak, longest_streak")
            .eq("mentorado_id", mentoradoId)
            .maybeSingle(),
          supabase
            .from("ai_tool_usage")
            .select("tool_type")
            .eq("mentorado_id", mentoradoId),
          supabase
            .from("ranking_entries")
            .select("points")
            .eq("mentorado_id", mentoradoId)
            .eq("period_type", "weekly")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        // Calculate unique AI tools used
        const uniqueAiTools = new Set(
          aiUsageRes.data?.map((u) => u.tool_type) || []
        );

        // Calculate total points from unlocked badges
        const totalPoints =
          unlockedBadges?.reduce(
            (sum, ub) => sum + ((ub.badge as unknown as Badge)?.points_required || 0),
            0
          ) || 0;

        setStats({
          prospectionCount: prospectionsRes.count || 0,
          lessonsCompleted: progressRes.data?.length || 0,
          modulesCompleted: 0, // Would need more complex query
          trailsCompleted: 0, // Would need more complex query
          weeklyRank: 0, // Would need ranking calculation
          streakDays: streakRes.data?.current_streak || 0,
          aiToolsUsed: uniqueAiTools.size,
          totalPoints,
        });

        // Fetch rewards catalog
        const { data: rewardsData } = await supabase
          .from("reward_catalog")
          .select("*")
          .eq("is_active", true)
          .order("points_cost", { ascending: true });

        if (rewardsData) {
          setRewards(rewardsData);
        }

        // Fetch user's redemptions
        const { data: redemptionsData } = await supabase
          .from("reward_redemptions")
          .select(`
            id,
            reward_id,
            points_spent,
            status,
            redeemed_at,
            reward:reward_catalog(*)
          `)
          .eq("mentorado_id", mentoradoId)
          .order("redeemed_at", { ascending: false });

        if (redemptionsData) {
          setRedemptions(redemptionsData as unknown as RewardRedemption[]);
        }
      } catch (error) {
        console.error("Error fetching gamification data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [mentoradoId]);

  // Update streak on access
  const updateStreak = useCallback(async () => {
    if (!mentoradoId) return;

    const today = new Date().toISOString().split("T")[0];

    const { data: existingStreak } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("mentorado_id", mentoradoId)
      .maybeSingle();

    if (existingStreak) {
      const lastAccess = existingStreak.last_access_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastAccess === today) {
        // Already updated today
        return;
      }

      let newStreak = 1;
      if (lastAccess === yesterdayStr) {
        // Consecutive day
        newStreak = (existingStreak.current_streak || 0) + 1;
      }

      const longestStreak = Math.max(
        newStreak,
        existingStreak.longest_streak || 0
      );

      await supabase
        .from("user_streaks")
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_access_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("mentorado_id", mentoradoId);

      setStats((prev) =>
        prev ? { ...prev, streakDays: newStreak } : null
      );
    } else {
      // Create new streak record
      await supabase.from("user_streaks").insert({
        mentorado_id: mentoradoId,
        current_streak: 1,
        longest_streak: 1,
        last_access_date: today,
      });

      setStats((prev) => (prev ? { ...prev, streakDays: 1 } : null));
    }
  }, [mentoradoId]);

  // Track AI tool usage
  const trackAiToolUsage = useCallback(
    async (toolType: string) => {
      if (!mentoradoId) return;

      await supabase.from("ai_tool_usage").insert({
        mentorado_id: mentoradoId,
        tool_type: toolType,
      });

      // Refresh stats
      const { data: aiUsage } = await supabase
        .from("ai_tool_usage")
        .select("tool_type")
        .eq("mentorado_id", mentoradoId);

      const uniqueTools = new Set(aiUsage?.map((u) => u.tool_type) || []);
      setStats((prev) =>
        prev ? { ...prev, aiToolsUsed: uniqueTools.size } : null
      );
    },
    [mentoradoId]
  );

  // Redeem reward
  const redeemReward = useCallback(
    async (rewardId: string, shippingAddress?: string) => {
      if (!mentoradoId || !stats) return { success: false, error: "Não autorizado" };

      const reward = rewards.find((r) => r.id === rewardId);
      if (!reward) return { success: false, error: "Prêmio não encontrado" };

      if (stats.totalPoints < reward.points_cost) {
        return { success: false, error: "Pontos insuficientes" };
      }

      if (reward.stock !== null && reward.stock <= 0) {
        return { success: false, error: "Prêmio esgotado" };
      }

      const { data, error } = await supabase
        .from("reward_redemptions")
        .insert({
          mentorado_id: mentoradoId,
          reward_id: rewardId,
          points_spent: reward.points_cost,
          shipping_address: shippingAddress,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local state
      const newRedemption: RewardRedemption = {
        id: data.id,
        reward_id: data.reward_id,
        points_spent: data.points_spent,
        status: data.status,
        redeemed_at: data.redeemed_at,
        reward,
      };

      setRedemptions((prev) => [newRedemption, ...prev]);
      setStats((prev) =>
        prev
          ? { ...prev, totalPoints: prev.totalPoints - reward.points_cost }
          : null
      );

      return { success: true, data: newRedemption };
    },
    [mentoradoId, stats, rewards]
  );

  // Check if badge is unlocked
  const isBadgeUnlocked = useCallback(
    (badgeId: string) => {
      return userBadges.some((ub) => ub.badge_id === badgeId);
    },
    [userBadges]
  );

  // Get badge unlock date
  const getBadgeUnlockDate = useCallback(
    (badgeId: string) => {
      const userBadge = userBadges.find((ub) => ub.badge_id === badgeId);
      return userBadge?.unlocked_at;
    },
    [userBadges]
  );

  return {
    badges,
    userBadges,
    stats,
    rewards,
    redemptions,
    isLoading,
    mentoradoId,
    updateStreak,
    trackAiToolUsage,
    redeemReward,
    isBadgeUnlocked,
    getBadgeUnlockDate,
  };
}
