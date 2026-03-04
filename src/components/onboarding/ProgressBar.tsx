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
    <div className={cn("fixed top-0 left-0 right-0 z-[100] h-1", className)}>
      <div
        className="h-full bg-white transition-all duration-700 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
