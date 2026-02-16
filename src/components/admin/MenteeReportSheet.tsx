import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, CheckSquare, BookOpen, Activity, Flame } from "lucide-react";
import type { MenteeScore } from "@/components/admin/MenteeScoreCard";

interface MenteeReportSheetProps {
  mentee: MenteeScore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getScoreLabel(score: number) {
  if (score >= 80) return { label: 'Excelente', color: 'bg-emerald-500/15 text-emerald-500' };
  if (score >= 60) return { label: 'Bom', color: 'bg-primary/15 text-primary' };
  if (score >= 40) return { label: 'Regular', color: 'bg-accent/15 text-accent' };
  return { label: 'Atenção', color: 'bg-destructive/15 text-destructive' };
}

export function MenteeReportSheet({ mentee, open, onOpenChange }: MenteeReportSheetProps) {
  if (!mentee) return null;

  const scoreInfo = getScoreLabel(mentee.score);

  const metrics = [
    { label: 'Leads Criados', value: mentee.leadsCount, icon: Target, max: 6, weight: '30%' },
    { label: 'Tarefas Concluídas', value: mentee.tasksCompleted, icon: CheckSquare, max: 5, weight: '20%' },
    { label: 'Progresso Trilhas', value: `${mentee.trailsProgress}%`, icon: BookOpen, max: 100, weight: '20%', isPercent: true },
    { label: 'Atividades', value: mentee.activitiesCount, icon: Activity, max: 10, weight: '20%' },
    { label: 'Streak', value: `${mentee.streak}d`, icon: Flame, max: 5, weight: '10%' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Relatório Individual</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={mentee.avatar || undefined} />
              <AvatarFallback className="bg-muted text-lg">
                {mentee.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{mentee.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={scoreInfo.color}>{scoreInfo.label}</Badge>
                <span className="text-2xl font-bold">{mentee.score.toFixed(0)}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Composição do Score</h4>
            {metrics.map(m => {
              const numVal = typeof m.value === 'string' ? parseFloat(m.value) : m.value;
              const pct = m.isPercent ? numVal : Math.min((numVal / m.max) * 100, 100);
              return (
                <div key={m.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <m.icon className="h-4 w-4 text-muted-foreground" />
                      {m.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{m.value}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5">{m.weight}</Badge>
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>

          {/* Last activity */}
          <div className="p-4 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground">Última atividade</p>
            <p className="font-medium mt-1">
              {mentee.lastActivityAt
                ? new Date(mentee.lastActivityAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Nenhuma atividade registrada'}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
