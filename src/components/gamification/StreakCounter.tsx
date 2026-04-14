import { Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  days: number;
  longestStreak?: number;
  size?: "sm" | "md" | "lg";
  showLongest?: boolean;
  className?: string;
  isActiveToday?: boolean;
}

export function StreakCounter({
  days,
  longestStreak,
  size = "md",
  showLongest = false,
  className,
  isActiveToday = false,
}: StreakCounterProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const getStreakColor = () => {
    if (days >= 100) return "text-violet-500";
    if (days >= 30) return "text-amber-500";
    if (days >= 7) return "text-orange-500";
    return "text-muted-foreground";
  };

  const getStreakGlow = () => {
    if (days >= 100) return "shadow-violet-500/30";
    if (days >= 30) return "shadow-amber-500/30";
    if (days >= 7) return "shadow-orange-500/30";
    return "";
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center",
          "p-3 rounded-full",
          "bg-gradient-to-br from-orange-500/20 to-amber-500/20",
          "border border-orange-500/30",
          days >= 7 && `shadow-lg ${getStreakGlow()}`,
          "transition-all duration-300"
        )}
      >
        {days >= 7 ? (
          <Flame
            className={cn(
              iconSizes[size],
              getStreakColor(),
              days >= 30 && "animate-pulse"
            )}
          />
        ) : (
          <Zap className={cn(iconSizes[size], "text-muted-foreground")} />
        )}
      </div>

      <div className={cn("text-center mt-2", sizeClasses[size])}>
        <p className={cn("font-bold", getStreakColor())}>{days}</p>
        <p className="text-xs text-muted-foreground">
          {days === 1 ? "dia" : "dias"} seguidos
        </p>
      </div>

      {/* Active today indicator */}
      {isActiveToday ? (
        <p className="text-xs text-emerald-500 font-medium mt-1">✓ Ativo hoje</p>
      ) : days > 0 ? (
        <p className="text-xs text-amber-500 mt-1">Ative-se hoje para manter o streak!</p>
      ) : null}

      {showLongest && longestStreak !== undefined && longestStreak > days && (
        <p className="text-xs text-muted-foreground mt-1">
          Recorde: {longestStreak} dias
        </p>
      )}
    </div>
  );
}
