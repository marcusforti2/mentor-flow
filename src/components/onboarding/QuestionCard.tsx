import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OnboardingQuestionCardProps {
  children: ReactNode;
  className?: string;
}

export function OnboardingQuestionCard({
  children,
  className,
}: OnboardingQuestionCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto px-6 animate-in fade-in-0 slide-in-from-bottom-6 duration-500",
        className
      )}
    >
      {children}
    </div>
  );
}
