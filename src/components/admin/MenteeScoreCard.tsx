import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, BookOpen, CheckSquare, Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MenteeScore {
  membershipId: string;
  name: string;
  avatar: string | null;
  score: number;
  previousScore: number | null;
  leadsCount: number;
  tasksCompleted: number;
  trailsProgress: number; // 0-100
  activitiesCount: number;
  lastActivityAt: string | null;
  streak: number;
}

interface MenteeScoreCardProps {
  mentee: MenteeScore;
  rank?: number;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-accent";
  return "text-destructive";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 60) return "bg-primary/10 border-primary/20";
  if (score >= 40) return "bg-accent/10 border-accent/20";
  return "bg-destructive/10 border-destructive/20";
}

function getTrend(current: number, previous: number | null) {
  if (previous === null) return null;
  const diff = current - previous;
  if (diff > 2) return { icon: TrendingUp, label: `+${diff.toFixed(0)}`, color: "text-emerald-400" };
  if (diff < -2) return { icon: TrendingDown, label: `${diff.toFixed(0)}`, color: "text-destructive" };
  return { icon: Minus, label: "=", color: "text-muted-foreground" };
}

export function MenteeScoreCard({ mentee, rank }: MenteeScoreCardProps) {
  const trend = getTrend(mentee.score, mentee.previousScore);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors">
      {rank !== undefined && (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
          {rank}
        </div>
      )}

      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={mentee.avatar || undefined} />
        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
          {mentee.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{mentee.name}</p>
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs ${trend.color}`}>
              <trend.icon className="h-3 w-3" />
              {trend.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Target className="h-3 w-3" />{mentee.leadsCount}</span>
          <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{mentee.tasksCompleted}</span>
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{mentee.trailsProgress}%</span>
          {mentee.streak > 0 && (
            <span className="flex items-center gap-1 text-primary"><Flame className="h-3 w-3" />{mentee.streak}d</span>
          )}
        </div>
      </div>

      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border ${getScoreBg(mentee.score)} shrink-0`}>
        <span className={`text-lg font-bold ${getScoreColor(mentee.score)}`}>{mentee.score.toFixed(0)}</span>
        <span className="text-[10px] text-muted-foreground">score</span>
      </div>
    </div>
  );
}
