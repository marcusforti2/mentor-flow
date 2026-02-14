import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Award } from "lucide-react";
import { MenteeScoreCard, type MenteeScore } from "./MenteeScoreCard";

interface MenteeRankingProps {
  mentees: MenteeScore[];
  isLoading: boolean;
}

export function MenteeRanking({ mentees, isLoading }: MenteeRankingProps) {
  const sorted = [...mentees].sort((a, b) => b.score - a.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-5 w-5" />
          Ranking de Mentorados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum mentorado encontrado
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((mentee, index) => (
              <MenteeScoreCard
                key={mentee.membershipId}
                mentee={mentee}
                rank={index + 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
