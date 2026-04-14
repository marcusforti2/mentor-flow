import { cn } from "@/lib/utils";
import { Lock, CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface BadgeCardProps {
  name: string;
  description: string;
  iconType: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
  size?: "sm" | "md" | "lg";
  showPoints?: boolean;
  requirement?: string;
  progress?: number;
  progressMax?: number;
}

const badgeIcons: Record<string, string> = {
  // Prospecção
  prospect_first: "🎯",
  prospect_10: "🔥",
  prospect_50: "⚡",
  prospect_100: "👑",
  // Trilhas
  trail_first: "📖",
  trail_module: "📚",
  trail_complete: "🎓",
  // Ranking
  rank_top10: "🏅",
  rank_top3: "🥇",
  rank_first: "🏆",
  // Streak
  streak_7: "✨",
  streak_30: "💫",
  streak_100: "🌟",
  // AI
  ai_first: "🤖",
  ai_explorer: "🧠",
  ai_master: "💎",
};

export function BadgeCard({
  name,
  description,
  iconType,
  points,
  unlocked,
  unlockedAt,
  size = "md",
  showPoints = true,
  requirement,
  progress: badgeProgress,
  progressMax,
}: BadgeCardProps) {
  const icon = badgeIcons[iconType] || "🏅";

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const iconSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-5xl",
  };

  const badgeContent = (
    <div
      className={cn(
        "relative group rounded-2xl transition-all duration-300",
        sizeClasses[size],
        unlocked
          ? "glass-card border border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
          : "bg-muted/20 border border-border/50 opacity-60"
      )}
    >
      {/* Glow effect for unlocked badges */}
      {unlocked && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      <div className="relative flex flex-col items-center text-center">
        {/* Badge Icon */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-xl mb-2",
            unlocked
              ? "bg-gradient-to-br from-primary/20 to-accent/20"
              : "bg-muted/30",
            size === "sm" ? "h-12 w-12" : size === "md" ? "h-14 w-14" : "h-20 w-20"
          )}
        >
          <span className={cn(iconSizes[size], unlocked ? "" : "grayscale")}>
            {icon}
          </span>
          
          {/* Lock overlay */}
          {!unlocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* Unlocked indicator */}
          {unlocked && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-background">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Badge Name */}
        <h4
          className={cn(
            "font-semibold line-clamp-2",
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base",
            unlocked ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {name}
        </h4>

        {/* Description (only on larger sizes) */}
        {size !== "sm" && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        )}

        {/* Points */}
        {showPoints && (
          <div
            className={cn(
              "mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
              unlocked
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            +{points} pts
          </div>
        )}

        {/* Unlocked date */}
        {unlocked && unlockedAt && size === "lg" && (
          <p className="text-xs text-muted-foreground mt-2">
            Desbloqueado em {new Date(unlockedAt).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    </div>
  );

  // Wrap with tooltip if requirement or description exists for locked badges
  if (requirement || (!unlocked && description)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium text-sm">{name}</p>
          {requirement && (
            <p className="text-xs text-muted-foreground mt-1">🔓 {requirement}</p>
          )}
          {badgeProgress !== undefined && progressMax && !unlocked && (
            <div className="mt-1.5">
              <Progress value={(badgeProgress / progressMax) * 100} className="h-1" />
              <p className="text-xs text-muted-foreground mt-0.5">{badgeProgress}/{progressMax}</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badgeContent;
}

export function BadgeGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>{children}</div>
  );
}
