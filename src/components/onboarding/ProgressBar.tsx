import { cn } from "@/lib/utils";

interface OnboardingProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function OnboardingProgressBar({
  current,
  total,
  className,
}: OnboardingProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-2 w-32 md:w-48 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}
