import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Json } from "@/integrations/supabase/types";

interface Props {
  legacyMentoradoId?: string | null;
  membershipId: string;
}

interface Analysis {
  id: string;
  nota_geral: number | null;
  resumo: string | null;
  pontos_fortes: string[] | null;
  muda_urgente: string[] | null;
  created_at: string;
}

function jsonToStringArray(val: Json | null): string[] | null {
  if (!val || !Array.isArray(val)) return null;
  return val.filter((v): v is string => typeof v === 'string');
}

export function MentoradoAIScore({ legacyMentoradoId, membershipId }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!membershipId) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from('training_analyses')
        .select('id, nota_geral, resumo, pontos_fortes, muda_urgente, created_at')
        .eq('membership_id', membershipId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setAnalysis({
          id: data.id,
          nota_geral: data.nota_geral,
          resumo: data.resumo,
          pontos_fortes: jsonToStringArray(data.pontos_fortes),
          muda_urgente: jsonToStringArray(data.muda_urgente),
          created_at: data.created_at,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [legacyMentoradoId]);

  if (loading) return <Card><CardContent className="pt-4 h-24 animate-pulse bg-muted/50" /></Card>;

  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 pb-6 text-center">
          <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma análise de performance ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const score = analysis.nota_geral ?? 0;
  const scoreColor = score >= 7 ? "text-green-500" : score >= 4 ? "text-amber-500" : "text-destructive";
  const scoreBg = score >= 7 ? "bg-green-500/10" : score >= 4 ? "bg-amber-500/10" : "bg-destructive/10";

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Nota IA
          </span>
          <span className="text-[11px] text-muted-foreground font-normal flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-2 rounded-xl ${scoreBg}`}>
            <span className={`text-2xl font-bold ${scoreColor}`}>{score.toFixed(1)}</span>
          </div>
          {analysis.resumo && (
            <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{analysis.resumo}</p>
          )}
        </div>

        {analysis.pontos_fortes && analysis.pontos_fortes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {analysis.pontos_fortes.slice(0, 3).map((s, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] bg-green-500/10 border-0">{s}</Badge>
            ))}
          </div>
        )}

        {analysis.muda_urgente && analysis.muda_urgente.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {analysis.muda_urgente.slice(0, 3).map((s, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] bg-amber-500/10 border-0">{s}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
