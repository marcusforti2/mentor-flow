import { useState, useEffect, useCallback } from "react";
import { Target, Clock, Calendar, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

interface DailyGoalCounterProps {
  mentoradoId: string;
  className?: string;
}

export function DailyGoalCounter({ mentoradoId, className }: DailyGoalCounterProps) {
  const [todayCount, setTodayCount] = useState(0);
  const [goal, setGoal] = useState(10);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date();
  const dayName = today.toLocaleDateString("pt-BR", { weekday: "long" });
  const dateFormatted = today.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  
  // Calculate hours until midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hoursLeft = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
  const minutesLeft = Math.floor(((midnight.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

  const triggerConfetti = useCallback(() => {
    // Multiple bursts of confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1"],
      });
    }, 250);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!mentoradoId) return;

      try {
        // Get today's start and end
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch today's prospections count (check both membership_id and mentorado_id)
        const { count } = await supabase
          .from("crm_prospections")
          .select("id", { count: "exact" })
          .or(`membership_id.eq.${mentoradoId},mentorado_id.eq.${mentoradoId}`)
          .gte("created_at", todayStart.toISOString())
          .lte("created_at", todayEnd.toISOString());

        setTodayCount(count || 0);

        // Fetch daily goal from business profile
        const { data: profile } = await supabase
          .from("mentorado_business_profiles")
          .select("daily_prospection_goal")
          .or(`membership_id.eq.${mentoradoId},mentorado_id.eq.${mentoradoId}`)
          .maybeSingle();

        if (profile?.daily_prospection_goal) {
          setGoal(profile.daily_prospection_goal);
        }

        // Check if goal was already met today (from localStorage)
        const confettiKey = `confetti_triggered_${mentoradoId}_${todayStart.toISOString().split("T")[0]}`;
        const alreadyTriggered = localStorage.getItem(confettiKey) === "true";
        setHasTriggeredConfetti(alreadyTriggered);
      } catch (error) {
        console.error("Error fetching daily goal data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [mentoradoId]);

  // Trigger confetti when goal is met
  useEffect(() => {
    if (!isLoading && todayCount >= goal && !hasTriggeredConfetti && goal > 0) {
      triggerConfetti();
      setHasTriggeredConfetti(true);
      
      // Store that confetti was triggered today
      const todayKey = new Date().toISOString().split("T")[0];
      localStorage.setItem(`confetti_triggered_${mentoradoId}_${todayKey}`, "true");
    }
  }, [todayCount, goal, hasTriggeredConfetti, isLoading, triggerConfetti, mentoradoId]);

  const progress = goal > 0 ? Math.min((todayCount / goal) * 100, 100) : 0;
  const goalMet = todayCount >= goal && goal > 0;

  if (isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-4 transition-all",
        goalMet && "border-emerald-500/50 bg-emerald-500/5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Counter */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
              goalMet
                ? "bg-emerald-500/20"
                : "bg-primary/20"
            )}
          >
            {goalMet ? (
              <Check className="h-5 w-5 text-emerald-500" />
            ) : (
              <Target className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-2xl font-bold",
                goalMet ? "text-emerald-500" : "text-foreground"
              )}>
                {todayCount}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-lg text-muted-foreground">{goal}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {goalMet ? (
                <span className="flex items-center gap-1 text-emerald-500">
                  <Sparkles className="h-3 w-3" />
                  Meta batida!
                </span>
              ) : (
                "prospecções hoje"
              )}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-1 max-w-[120px]">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                goalMet
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-primary to-accent"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="text-right hidden sm:block">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="capitalize">{dayName}, {dateFormatted}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" />
            <span>
              {hoursLeft}h {minutesLeft}min restantes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
