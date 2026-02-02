import { Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PointsBadgeProps {
  points: number;
  change?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PointsBadge({
  points,
  change,
  size = "md",
  className,
}: PointsBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full",
        "bg-gradient-to-r from-primary/20 to-accent/20",
        "border border-primary/30",
        sizeClasses[size],
        className
      )}
    >
      <Star className={cn(iconSizes[size], "text-primary fill-primary")} />
      <span className="font-semibold text-gradient-gold">{points}</span>
      {change !== undefined && change !== 0 && (
        <span
          className={cn(
            "flex items-center gap-0.5 text-xs",
            change > 0 ? "text-emerald-500" : "text-red-500"
          )}
        >
          <TrendingUp
            className={cn(
              "h-3 w-3",
              change < 0 && "rotate-180"
            )}
          />
          {change > 0 ? "+" : ""}
          {change}
        </span>
      )}
    </div>
  );
}
