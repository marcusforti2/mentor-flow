import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingQuestionCardProps {
  children: ReactNode;
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  questionNumber?: number;
  className?: string;
}

export function OnboardingQuestionCard({
  children,
  icon: Icon,
  title,
  subtitle,
  questionNumber,
  className,
}: OnboardingQuestionCardProps) {
  return (
    <div
      className={cn(
        "w-full animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
        className
      )}
    >
      <div className="glass-card rounded-2xl p-8 md:p-12 space-y-6">
        {/* Header with icon and title */}
        {(Icon || title || subtitle) && (
          <div className="space-y-4">
            {Icon && (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                {questionNumber && (
                  <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                    {questionNumber}
                  </span>
                )}
              </div>
            )}
            {title && (
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-muted-foreground text-lg">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
