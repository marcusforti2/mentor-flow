import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AlertsBellProps {
  onClick: () => void;
  className?: string;
  unreadCount?: number;
}

export function AlertsBell({ onClick, className, unreadCount = 0 }: AlertsBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("relative h-10 w-10 glass-card", className)}
    >
      <Bell className={cn("h-4 w-4", unreadCount > 0 && "text-primary")} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
}
