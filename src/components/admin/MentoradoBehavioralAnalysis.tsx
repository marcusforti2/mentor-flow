import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Brain,
  EyeOff,
  Repeat,
  ShieldAlert,
  Rocket,
  MessageSquareText,
  AlertTriangle,
  Target,
  Lightbulb,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalysisData {
  id: string;
  social_data_source: string;
  behavioral_profile: any;
  hidden_fears: any;
  emotional_patterns: any;
  execution_blockers: any;
  potentiation_strategy: any;
  ideal_language: any;
  mentor_mistakes: any;
  how_to_succeed: any;
  motivation_triggers: any;
  alert_signals: any;
  full_report: string;
  created_at: string;
}

interface Props {
  menteeMembershipId: string;
  mentorMembershipId: string;
  tenantId: string;
  menteeName: string;
}

const SECTIONS = [
  { key: 'behavioral_profile', label: 'Perfil Comportamental', icon: Brain, color: 'text-purple-500' },
  { key: 'hidden_fears', label: 'Medos Ocultos', icon: EyeOff, color: 'text-red-500' },
  { key: 'emotional_patterns', label: 'Vícios Emocionais', icon: Repeat, color: 'text-orange-500' },
  { key: 'execution_blockers', label: 'Bloqueios de Execução', icon: ShieldAlert, color: 'text-amber-500' },
  { key: 'potentiation_strategy', label: 'Estratégia de Potencialização', icon: Rocket, color: 'text-green-500' },
  { key: 'ideal_language', label: 'Linguagem Ideal', icon: MessageSquareText, color: 'text-blue-500' },
  { key: 'mentor_mistakes', label: 'Erros que o Mentor Pode Cometer', icon: AlertTriangle, color: 'text-red-400' },
  { key: 'how_to_succeed', label: 'Como Acertar', icon: CheckCircle2, color: 'text-emerald-500' },
  { key: 'motivation_triggers', label: 'Gatilhos de Motivação', icon: Lightbulb, color: 'text-yellow-500' },
  { key: 'alert_signals', label: 'Sinais de Alerta', icon: Target, color: 'text-rose-500' },
];

export function MentoradoBehavioralAnalysis({ menteeMembershipId, mentorMembershipId, tenantId, menteeName }: Props) {
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyses();
  }, [menteeMembershipId]);

  const fetchAnalyses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mentee_behavioral_analyses')
        .select('*')
        .eq('membership_id', menteeMembershipId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses((data || []) as unknown as AnalysisData[]);
    } catch (err) {
      console.error('Error fetching analyses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-mentee-behavioral', {
        body: {
          mentee_membership_id: menteeMembershipId,
          mentor_membership_id: mentorMembershipId,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "Erro na análise", description: data.error, variant: "destructive" });
        return;
      }

      toast({ title: "Análise gerada!", description: `Análise comportamental de ${menteeName} concluída.` });
      await fetchAnalyses();
    } catch (err: any) {
      console.error('Error generating analysis:', err);
      toast({
        title: "Erro ao gerar análise",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderSection = (data: any) => {
    if (!data) return <p className="text-sm text-muted-foreground italic">Não disponível</p>;
    
    if (typeof data === 'string') {
      return <p className="text-sm text-foreground whitespace-pre-wrap">{data}</p>;
    }
    
    if (Array.isArray(data)) {
      return (
        <ul className="space-y-1.5">
          {data.map((item, i) => (
            <li key={i} className="text-sm text-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
    
    if (typeof data === 'object') {
      // If it has a summary/description field, show it prominently
      const summary = data.summary || data.description || data.text;
      const items = data.items || data.points || data.list;
      
      return (
        <div className="space-y-2">
          {summary && <p className="text-sm text-foreground">{summary}</p>}
          {items && Array.isArray(items) && (
            <ul className="space-y-1.5">
              {items.map((item: any, i: number) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{typeof item === 'string' ? item : item.text || item.description || JSON.stringify(item)}</span>
                </li>
              ))}
            </ul>
          )}
          {!summary && !items && (
            <p className="text-sm text-foreground whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</p>
          )}
        </div>
      );
    }
    
    return <p className="text-sm text-foreground">{String(data)}</p>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const latestAnalysis = analyses[0];

  return (
    <div className="space-y-4">
      {/* Generate Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Análise Comportamental IA
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scraping de redes sociais + contexto da mentoria
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          size="sm"
          className="gradient-gold text-primary-foreground"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Analisando...
            </>
          ) : latestAnalysis ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Regerar
            </>
          ) : (
            <>
              <Brain className="h-3.5 w-3.5 mr-1.5" />
              Gerar Análise
            </>
          )}
        </Button>
      </div>

      {/* History */}
      {analyses.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Histórico:</span>
          {analyses.map((a, i) => (
            <Badge
              key={a.id}
              variant={i === 0 ? "default" : "outline"}
              className="text-xs cursor-default"
            >
              {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              {a.social_data_source && a.social_data_source !== 'none' && ` · ${a.social_data_source}`}
            </Badge>
          ))}
        </div>
      )}

      {/* Analysis Cards */}
      {latestAnalysis ? (
        <div className="space-y-3">
          {SECTIONS.map(({ key, label, icon: Icon, color }) => {
            const data = (latestAnalysis as any)[key];
            if (!data) return null;
            
            return (
              <Card key={key} className="glass-card border-l-2 border-l-primary/30">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {renderSection(data)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-8 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Nenhuma análise gerada ainda. Clique em "Gerar Análise" para iniciar.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              A IA vai analisar as redes sociais do mentorado e cruzar com o perfil da sua mentoria.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
